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
import { parseFieldsString, removeEmptyObjects, removeNullKeys } from "../../utils/helpers"
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
  readonly SESSION_TTL = 3600

  constructor(
    container: any,
    options?: any
  ) {
    super(container)
    
    this.container = container
    this.logger_ = container.logger
    this.dbService = new DbOperationService(container.postgresPool)
    this.workerPool_ = container.workerPool
    this.postgresPool = container.postgresPool
    this.customEventBus = container.eventBus // Custom event bus from loader
    console.log(process.env, process.env.REDIS_URL, process.env.REDIS_HOST, 'REDIS ACTION INITIALIZED')
    this.redisClient = new Redis({
      host: process.env.REDIS_URL || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'action-engine:session:',
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.redisClient.on('error', (err) => {
      this.logger_.error('Redis connection error:', err);
    });

    this.logger_.info("✅ ActionEngineService initialized")
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
      case 'DB_OPERATION': return await this.executeDatabaseOperation(config);
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

  async executeWorkflow(config: any, context: any): Promise<any> {
    let success = true;
    let variables = {}
    let oldParams = {...context.params};
    let finalResult;
    let index = 0;
    const actions = config.actions || [];
    const workflowResults: Record<string, any> = {};
    
    for (const actionConfig of actions) {
      let conf = await expressionEvaluator.resolvePlaceholders(
        actionConfig.action_id || {}, 
        {context: variables, outputs: workflowResults }
      );

      const action = await this.getActionTemplate(conf);
      if (!action) continue;
      
      let params = actionConfig.parameters;
      
      const mergedParams = {
        ...oldParams,
        ...(await expressionEvaluator.resolvePlaceholders(
          params || {}, 
          {...context, ...oldParams, context: variables, outputs: workflowResults }
        ))
      };

      const result = await this.executeAction({...action, ...actionConfig}, {
        ...context,
        context: variables,
        params: mergedParams,
        outputs: workflowResults
      });
      
      let outputKey = action.output_as ? action.output_as : (action.handle || action.id);
      let output = result;
      let output_template = removeEmptyObjects(actionConfig).output_template ?? action.output_template;
      let context_template = removeEmptyObjects(actionConfig).context_template ?? action.context_template;
      
      if(output?.skip) continue;

      if(output_template){
        output = await expressionEvaluator.resolvePlaceholders(
          output_template, 
          {...context, ...oldParams, context: variables, outputs: workflowResults, result }
        );
      }
      
      if(context_template){
        let contextOutput = await expressionEvaluator.resolvePlaceholders(
          context_template, 
          {...context, ...oldParams, context: variables, outputs: workflowResults, result: output }
        );        
        variables = {...variables, ...contextOutput};
        
        if (context.session) {
          context.session = {...context.session, ...contextOutput};
        }
      }
      
      workflowResults[outputKey] = {index: index + 1, parameters: mergedParams, context: variables, result: output};
      
      finalResult = output;
      success = result?.success;
      oldParams = {...oldParams, ...mergedParams}
      
      if (result?.exit || result?.status === 'error') break;
      
      index++;
    }

    return {
      success,
      status_code: success ? 200 : 400,
      data: finalResult,
      outputs: workflowResults,
      context: variables,
      completedActions: Object.keys(workflowResults).length,
    };
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
      
      // if(context_template && Object.keys(context_template).length){
      //   contextOutput = await expressionEvaluator.resolvePlaceholders(
      //     context_template, 
      //     {...session, params: input}
      //   );        
      //     session = {...session, context: contextOutput};
      // }
      
  //  await this.actionService.updateSession(session.id, session);



    return output;
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