// src/modules/action-engine/service.ts
import { 
  generateEntityId,
  MedusaService,
  InjectManager,
} from "@medusajs/framework/utils" 
import { 
  InferTypeOf, 
  Logger,
  MedusaContainer
} from "@medusajs/framework/types"
import { ActionTemplate, Execution, ActionRelation, ActionConnection, ActionView } from "./models"
import * as expressionEvaluator from "./expressionEvaluator"
import axios from "axios"
import { DbOperationService } from "./services/database-action-service"
import { ActionConfig } from "./types"
import { parseActionInput, StepActionError, validateAndRefineParameters } from "../../utils/validators"
import { parseFieldsString, removeEmptyObjects, removeNullKeys, hashObject } from "../../utils/helpers"
import { buildErrorResponse, evaluateConditions, handleExecutionError } from "../../utils/action-engine-utils"
import Redis from "ioredis"
import { chatCompletion } from "../../utils/ollama"

// Define types
type ActionTemplateType = InferTypeOf<typeof ActionTemplate>
type ExecutionType = InferTypeOf<typeof Execution>
type ActionExecutionType = InferTypeOf<typeof ActionRelation>
type ActionConnectionType = InferTypeOf<typeof ActionConnection>
type ActionViewType = InferTypeOf<typeof ActionView>

// Session context interface
interface SessionContext {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ========== PUBLIC TYPE DECLARATIONS ==========

export interface ActionEngineServiceTypes {
  ActionTemplate: ActionTemplateType
  Execution: ExecutionType
  ActionExecution: ActionExecutionType
  ActionConnection: ActionConnectionType
  ActionView: ActionViewType
  execute: ReturnType<ActionEngineService['execute']>
  retrieveActionTemplate: ReturnType<ActionEngineService['retrieveActionTemplate']>
  listActionTemplates: ReturnType<ActionEngineService['listActionTemplates']>
  createActionTemplate: ReturnType<ActionEngineService['createActionTemplates']>
  updateActionTemplate: ReturnType<ActionEngineService['updateActionTemplates']>
  deleteActionTemplate: ReturnType<ActionEngineService['deleteActionTemplates']>
  retrieveExecution: ReturnType<ActionEngineService['retrieveExecution']>
  listExecutions: ReturnType<ActionEngineService['listExecutions']>
  createExecutions: ReturnType<ActionEngineService['createExecutions']>
  updateExecutions: ReturnType<ActionEngineService['updateExecutions']>
  retrieveActionRelation: ReturnType<ActionEngineService['retrieveActionRelation']>
  listActionRelations: ReturnType<ActionEngineService['listActionRelations']>
  createActionRelations: ReturnType<ActionEngineService['createActionRelations']>
  updateActionRelations: ReturnType<ActionEngineService['updateActionRelations']>
}

// ========== SERVICE CLASS ==========

export default class ActionEngineService extends MedusaService({
  ActionRelation,
  ActionConnection,
  Execution,
  ActionTemplate, 
  ActionView
}) {
  readonly logger_: Logger
  readonly container: MedusaContainer
  postgresPool?: any
  dbService: DbOperationService
  workerPool_: any;
  private customEventBus?: any

  redisClient: Redis
  readonly SESSION_TTL = 100

constructor(container: any, options?: any) {
  super(container)

  this.container = container
  this.logger_ = container.logger
  this.dbService = new DbOperationService(container.postgresPool)
  this.workerPool_ = container.workerPool
  this.postgresPool = container.postgresPool
  this.customEventBus = container.eventBus

  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    this.logger_.warn("⚠️ REDIS_URL is not set. Redis disabled.")
  }

  this.redisClient = new Redis(redisUrl!, {
    tls: redisUrl?.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: 3,
  })

  this.redisClient.on("connect", () => {
    this.logger_.info("✅ Redis connected")
  })

  this.redisClient.on("error", (err) => {
    this.logger_.error("❌ Redis connection error:", err)
  })

  this.logger_.info("✅ ActionEngineService initialized")
}

  
  // ========== EXECUTION CACHING ==========
   getExecutionCacheKey(
    templateId: string,
    parameters: Record<string, any>,
    sessionId?: string
  ): string {
    const paramsHash = hashObject(parameters); // deterministic hash
    return `execution:${templateId}:${paramsHash}${sessionId ? `:${sessionId}` : ""}`;
  }

   async getCachedExecution(
    templateId: string,
    parameters: Record<string, any>,
    sessionId?: string
  ): Promise<any | null> {
    if (!this.redisClient) return null;
    const key = this.getExecutionCacheKey(templateId, parameters, sessionId);
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.logger_.debug(`Execution cache hit for ${key}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger_.error(`Failed to get cached execution ${key}:`, error);
    }
    return null;
  }

   async setCachedExecution(
    templateId: string,
    parameters: Record<string, any>,
    sessionId: string | undefined,
    result: any
  ): Promise<void> {
    if (!this.redisClient) return;
    const key = this.getExecutionCacheKey(templateId, parameters, sessionId);
    try {
      await this.redisClient.setex(key, this.SESSION_TTL, JSON.stringify(result));
    } catch (error) {
      this.logger_.error(`Failed to cache execution ${key}:`, error);
    }
  }

  /**
   * Invalidate all execution caches for a given template.
   * This is called when the template is updated or deleted.
   */
   async invalidateExecutionCachesForTemplate(templateId: string): Promise<void> {
    if (!this.redisClient) return;
    const pattern = `execution:${templateId}:*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length) {
        await this.redisClient.del(...keys);
        this.logger_.debug(`Invalidated ${keys.length} execution caches for template ${templateId}`);
      }
    } while (cursor !== "0");
  }


  // ========== SESSION MANAGEMENT ==========

  async setSession(sessionId: string, data: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const session: SessionContext = {
        id: sessionId,
        data,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.redisClient.setex(
        sessionId, 
        ttl || this.SESSION_TTL, 
        JSON.stringify(session)
      );
    } catch (error: any) {
      throw new Error(`Session storage failed: ${error.message}`);
    }
  }

  async getSession(sessionId: string): Promise<Record<string, any> | null> {
    try {
      const sessionData = await this.redisClient.get(sessionId);
      if (!sessionData) return null;

      const session: SessionContext = JSON.parse(sessionData);
      await this.redisClient.expire(sessionId, this.SESSION_TTL);
      return session.data;
    } catch (error: any) {
      this.logger_.error(`Failed to retrieve session ${sessionId}:`, error);
      return null;
    }
  }

  async updateSession(sessionId: string, data: Record<string, any>): Promise<void> {
    const existingData = await this.getSession(sessionId);
    // if (!existingData) throw new Error(`Session ${sessionId} not found`);
    await this.setSession(sessionId, { ...(existingData ?? {}), ...data });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redisClient.del(sessionId);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return (await this.redisClient.exists(sessionId)) === 1;
  }

    /**
     * Emit events through available channels
     */
  async emitEvent(eventType: string, data: any): Promise<void> {
      // 1. Use custom event bus from loader
      if (this.customEventBus) {
        try {
          this.customEventBus.emit(eventType, data)
          this.logger_.debug(`Event emitted via custom event bus: ${eventType}`)
        } catch (error) {
          this.logger_.warn(`Failed to emit via custom event bus: ${error}`)
        }
      }
      
      // 3. Log as fallback
      this.logger_.info(`Event: ${eventType}`)
  }
  
  // ========== CORE METHODS ==========
  @InjectManager()
  async execute(
    templateId: string, 
    parameters: Record<string, any> = {}, 
    sessionId?: string
  ): Promise<any> {
    const startTime = Date.now()
    let executionId = generateEntityId(undefined, "exec")
    
    try {
      let sessionData: Record<string, any> = {};
      if (sessionId) {
        const existingSession = await this.getSession(sessionId);
        if (existingSession) {
          sessionData = existingSession;
        } else {
          sessionData = { id: sessionId, createdAt: new Date().toISOString(), context: {} };
          await this.setSession(sessionId, sessionData);
        }
      }

      const template = await this.retrieveActionTemplate(templateId) as any;
      if (!template) throw new Error(`Action template ${templateId} not found`)

      const canCache = true;
      // const canCache = !template.context_template;

      // 3. Check cache
      let cachedResult = null;
      if (canCache) {
        cachedResult = await this.getCachedExecution(templateId, parameters, sessionId);
      }


      await this.createExecutions({
        id: executionId,
        workflow_id: template.id,
        status: 'running',
        started_at: new Date(),
        input_data: parameters,
        metadata: { templateId, templateName: template.name, sessionId: sessionId || null }
      })
      
      const context = { params: parameters, outputs: {}, session: sessionData, executionId }

      let result;
      let output_template = template.output_template;
      let context_template = template.context_template;

      if(template.type === 'WORKFLOW'){
        result = await this.executeWorkflow(template?.config, context);
      } else {
        let execResult = await this.executeAction(template, context);
        result = { context: context.session, data: execResult }
      }
      
      if(output_template){
        result = await expressionEvaluator.resolvePlaceholders(output_template, {...context, result: result.data});
      }
      
      if(context_template){
        let contextOutput = await expressionEvaluator.resolvePlaceholders(context_template, {...context, result: result.data });
        
        if (sessionId && contextOutput) {
          await this.updateSession(sessionId, { context: { ...sessionData.context, ...contextOutput } });
        }
        context.session = contextOutput;
      }

      await this.updateExecutions({
        id: executionId, 
        status: 'completed',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        output_data: result
      })

      return {
        success: true,
        status: 'success',
        status_code: 200,
        executionId,
        sessionId,
        execution_time: Date.now() - startTime,
        ...result,
      }

    } catch (error: any) {
      try {
        await this.updateExecutions({
          id: executionId,
          status: 'failed',
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          // error_data: { message: error.message, stack: error.stack }
        });
      } catch (updateError) {
        this.logger_.error('Failed to update execution with error:', updateError);
      }
      // await handleExecutionError(error, startTime);
      throw error;
    }
  }

  async executeAction(template: ActionTemplateType, context: any): Promise<any> {
    if (template.conditions) {
      const resolvedConditions = await expressionEvaluator.resolvePlaceholders(template.conditions, context);
      if (!evaluateConditions(resolvedConditions, context)) {
        return { skip: resolvedConditions.exit, status: "skipped", reason: "conditions_not_met" }
      }
    }

    const config = await expressionEvaluator.evaluatePlaceholders(removeNullKeys(template.config), context);
    switch (template.type) {
      case 'DB_OPERATION': return await this.executeDatabaseOperation(removeNullKeys((config)));
      case 'API_CALL': return await this.callAPI(config, context);
      case 'AI_ACTION': return await this.callAI(config, context);
      case 'WORKFLOW': return await this.executeWorkflow(removeNullKeys(template.config), context);
      case 'SCRIPT': return await this.executeScript(config, context);
      default: return { success: false, status: 'error', message: `Unsupported action type: ${template.type}`}
    }
  }

  async executeDatabaseOperation(config: any): Promise<any> {
    let queryConfig = {debug: true, limit: 10, ...config}
    if(queryConfig.fields){
      queryConfig.fields = typeof queryConfig.fields == 'string' ? parseFieldsString(queryConfig.fields) : ["*"]
    }
    if (!this.postgresPool) return { success: false, status: 'error', message: "Database pool not available." }



    try {
      console.log(queryConfig, config, 'DB CONFIG')
      return await this.dbService.execute(queryConfig);
    } catch(err) {
      return { success: false, status: 'error', message: `Database operation failed: ${queryConfig.operation}`}
    }
  }

  async callAPI(config: ActionConfig, context: any): Promise<any> {
    const { method, url, headers: configHeaders, body } = config;
    const { headers, timeout = 300000} = context

    try {
      const response = await axios({
        method: method || "GET",
        url: url,
        data: body,
        headers: {...headers, ...configHeaders},
        timeout
      })
      return response.data
    } catch (error: any) {
      this.logger_.error(`API call failed: ${url}`, error)
      return buildErrorResponse(error, 500, `API call failed: ${error.message}`)
    }
  }

  /**
   * AI call handler
   */
  private async callAI(config: ActionConfig, context: any): Promise<any> {
    this.logger_.info(`Executing AI call Config ${JSON.stringify(config)}`)
    // this.logger_.info(`Executing AI call Context ${JSON.stringify(context)}`)
    
    try {
    
    let systemInstruction = await expressionEvaluator.evaluatePlaceholders(
      context.model?.metadata?.template || context.model?.system,
      context
    )




    let messages = [
      {role: 'system', content: systemInstruction},
      {role: 'user', content: config.message || config.prompt}

    ]


    let chatResult = await chatCompletion({messages, model: config.model, options: context.model?.config})
    // let result = await generateCompletion({prompt: config.message || config.prompt, ...config, options: context.model.config})
    
    
    // Implement your AI service integration here
    // return { 
    //   result: result.response,
    //   success: true, 
    //   model: config.model,
    //   timestamp: new Date().toISOString(),
    // }

          return JSON.parse(chatResult.message.content);

   } catch(err) {
    console.log(err, 'ERROR')
      return { success: false, status_code: 400, status: 'error', message: 'Chat AI Action Error:', err }
    }
  }


  async executeScript(config: any, context: any): Promise<any> {
    try {
      return await this.workerPool_.run({ code: config.code, params: context })
    } catch (err: any) {
      throw new Error(`ExecutionError: ${err.message}`)
    }
  }

    private async executeWorkflow(template: any, session: any): Promise<any> {
      let config = template.config;
      let success = true;
      let variables = {...session.context}
      let oldParams = {...session.params};
      let finalResult;
      let index = 0;
      const actions = config.actions || [];
      const workflowResults: Record<string, any> = {};
      let contextOutput = variables;
  
      for (const actionConfig of actions) {
        let conf = await expressionEvaluator.resolvePlaceholders(
          actionConfig.action_id || {}, 
          {context: variables, outputs: workflowResults }
        );
  
        const action = await this.getActionTemplate(conf);
        if (!action) continue;
        
        let params = actionConfig.parameters;
        
        const mergedParams = {
          // ...oldParams,
          ...(await expressionEvaluator.resolvePlaceholders(
            params || {}, 
            {...session, ...oldParams, context: variables, outputs: workflowResults }
          ))
        };
  
        const result = await this.executeAction({...action, ...actionConfig}, {
          ...session,
          context: variables,
          params: mergedParams,
          outputs: workflowResults
        });
        let outputKey = action.output_as ? action.output_as : (action.handle || action.id);
        let output = result;
        let output_template = removeEmptyObjects(actionConfig).output_template ?? action.output_template;
        let context_template = removeEmptyObjects(actionConfig).context_template ?? action.context_template;
        if(output?.skip) continue;
  
        if(output_template && Object.keys(output_template).length){
          output = await expressionEvaluator.resolvePlaceholders(
            output_template, 
            {...session, ...oldParams, context: variables, outputs: workflowResults, result }
          );
        }
        
        if(context_template && Object.keys(context_template).length){
          contextOutput = await expressionEvaluator.resolvePlaceholders(
            context_template, 
            {...session, ...oldParams, context: variables, outputs: workflowResults, result: output }
          );        
          variables = {...variables, ...contextOutput};
        }
        
  
  
        // workflowResults[outputKey] = {index: index + 1, parameters: mergedParams, context: variables, result: output};
    const stepUuid = this.generateId('step');
  
    workflowResults[outputKey] = {
          index: index + 1,
          parameters: mergedParams,
          context: contextOutput,
          result: {
            ...output,
            uuid: stepUuid,
            handle: outputKey,
            noCompensation: action.noCompensation ?? false,
          },
        };
  
        finalResult = output;
        success = result?.success ?? true;
        oldParams = {...oldParams, ...mergedParams}
       await this.updateSession(session.id, { result: output, context: {...session.context, ...result.context, ...contextOutput } });
  
        if (result?.exit || result?.status === 'error') break;
  
        index++;
      }
  
  
  
    const workflowObject = this.generateWorkflowObject(oldParams, workflowResults, variables, finalResult, success, template);
      await this.saveWorkflowObject(template, {...workflowObject, state: 'done', transaction_id: `${template.handle}-${new Date().getTime()}`})
  
      return {
        success,
        status_code: success ? 200 : 400,
        data: finalResult,
        outputs: workflowResults,
        context: contextOutput,
        workflowObject,
      };
    }

 // Builds execution.definition from workflowResults recursively
  buildExecutionDefinition(results: Record<string, any>, keys: string[]): any {
    if (!keys.length) return null;

    const [currentKey, ...restKeys] = keys;
    const current = results[currentKey];
    if (!current) return null;

    const node: any = {
      uuid: current.result?.uuid || currentKey,
      handle: current.result?.action || currentKey,
      // noCompensation: current.result?.noCompensation ?? false,
    };

    // If there is more in the chain, create nested `next`
    if (restKeys.length) {
      node.next = this.buildExecutionDefinition(results, restKeys);
    }

    return node;
  }

  generateWorkflowObject(
  inputs: any,
  workflowResults: Record<string, any>,
  variables: Record<string, any>,
  finalResult: any,
  success: boolean,
  template?: any
): any {
  const runId = `wf_exec_${Date.now().toString(36).toUpperCase()}`;
  const config = template.config;
  const transactionId = `${template.handle}-${new Date().getTime()}`;
  const workflowId = config.workflow_id || config.name || "workflow";

  // Build invoke object from workflowResults
  const invoke: Record<string, any> = {};
const sortedEntries = Object.entries(workflowResults)
  .sort(([, a], [, b]) => (a.index ?? 0) + (b.index ?? 0))

  for (const [key, value] of sortedEntries) {
    invoke[key] = {
      __type: "Symbol(WorkflowWorkflowData)",
      output: {
        __type: "Symbol(WorkflowStepResponse)",
        output: value.result ?? {},
        compensateInput: value.result?.compensateInput ?? null,
      },
    };
  }

  // Build compensate object (placeholder, can be extended)
  const compensate: Record<string, any> = {};
  for (const key of Object.keys(workflowResults)) {
    compensate[key] = {};
    if (workflowResults[key].result?.compensateInput) {
      compensate[key].output = { __type: "Symbol(WorkflowStepResponse)" };
    }
  }

  // Build execution steps
  const steps: Record<string, any> = {};
  const rootId = "_root";
  steps[rootId] = {
    id: rootId,
    next: [],
  };


  const buildSteps = (parentKey: string, parentIndex = 0) => {
    const resultKeys = Object.keys(workflowResults);
    let prevKey = parentKey;

    for (let i = parentIndex; i < resultKeys.length; i++) {
      const key = resultKeys[i];
      const step = workflowResults[key];
      const stepId = `${parentKey}.${key}`;
      const stepUuid = this.generateId('step');
      steps[stepId] = {
        _v: 0,
        id: stepId,
        next: [],
        uuid: `${step.result.uuid}`,
        depth: i + 1,
        invoke: { state: "done", status: "ok" },
        attempts: 0,
        failures: 0,
        compensate: { state: "dormant", status: "idle" },
        definition: { uuid: `${step.result.uuid}`, handle: key, noCompensation: false, input: step.parameters },
        stepFailed: false,
        lastAttempt: null,
        saveResponse: true,
      };

      steps[prevKey].next.push(stepId);
      prevKey = stepId;
    }
  };

  buildSteps(rootId);

  let definitions = this.buildExecutionDefinition(workflowResults, Object.keys(workflowResults));


  // Build errors array from failed actions
  const errors = Object.entries(workflowResults)
    .filter(([_, value]) => value.result?.status === "error" || value.result?.exit)
    .map(([key, value]) => ({
      error: {
        date: new Date().toISOString(),
        name: value.result?.name || "Error",
        type: value.result?.type || "runtime_error",
        stack: value.result?.stack || "",
        message: value.result?.message || "Action failed",
        __isMedusaError: true,
      },
      action: key,
      handlerType: value.result?.handlerType || "invoke",
    }));

  

  


  return {
    id: runId,
    workflow_id: workflowId,
    transaction_id: transactionId,
    context: {
      data: {
        invoke,
        payload: {inputs,context: variables},
        compensate,
      },
      errors,
    },
    execution: {
      _v: 0,
      runId,
      state: success ? "completed" : "failed",
      steps,
      modelId: workflowId,
      options: {
        name: workflowId,
        store: true,
        idempotent: false,
        retentionTime: 259200,
      },
      metadata: {
        sourcePath: config.sourcePath ?? "",
        eventGroupId: `evt_${Date.now().toString(36).toUpperCase()}`,
        preventReleaseEvents: false,
      },
      definition: definitions,
      timedOutAt: null,
      hasAsyncSteps: false,
      transactionId,
      hasFailedSteps: errors.length > 0,
      hasSkippedSteps: false,
      hasWaitingSteps: false,
      hasRevertedSteps: false,
      hasSkippedOnFailureSteps: false,
    },
    state: "not_started",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}


  async saveWorkflowObject(template: any, workflow: any): Promise<any> {
 
await this.executeDatabaseOperation({
      table: 'workflow_execution',
      operation: "create",
      data: {
          ...workflow,
          id: this.generateId('wf_exec'),
          workflow_id: template.handle,
          retention_time: 60000 * 3
      }
})

    return template.length ? template[0] : null
  }

  async getActionTemplate(actionId: string): Promise<any> {
    if(!actionId) return null
    let template = await this.listActionTemplates({  
      $or: [ { id: { $eq: actionId } }, { handle: { $eq: actionId } } ]
    })
    return template.length ? template[0] : null
  }

  async stepAction(templateId: string, input: Record<string, any>, session: any): Promise<any> {
    let templates = await this.listActionTemplates({  
      $or: [ { id: { $eq: templateId } }, { handle: { $eq: templateId } } ]
    });
      
    let template = templates[0] as any;
    
    let validationResult = validateAndRefineParameters(input, template?.parameters);

    if (!validationResult.valid) {
      throw new StepActionError(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    let response = await this.executeAction(template, {
      session,
      params: validationResult.refinedData, 
      context: session?.context
    });

      // let contextOutput = session.context;
      let output = response;
      let output_template =  template.output_template;
      let context_template = template.context_template;
      

      if(output_template && Object.keys(output_template).length){
        output = await expressionEvaluator.resolvePlaceholders(
          output_template, 
          {...session, params: input, result: response, outputs: response?.outputs ?? {}}
        );
      }
      


    return output;
  }

    /** Generate a unique ID for a document */
  generateId(type?: any) {
    return generateEntityId(undefined, type);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export type ActionEngineApiContext = {
  actionEngineService: ActionEngineService
}

export * as ActionEngineTypes from './types'