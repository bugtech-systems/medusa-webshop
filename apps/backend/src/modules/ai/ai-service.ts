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
import { DataSource  } from "typeorm"
import * as expressionEvaluator from "../action-engine/expressionEvaluator"
import { ActionConnection, ActionRelation, ActionTemplate, ActionView, Execution } from "../action-engine/models"
import { buildErrorResponse, evaluateConditions } from "../../utils/action-engine-utils"
import { isEmptyObject, parseFieldsString, removeEmptyObjects, removeNullKeys } from "../../utils/helpers"
import { ActionEngineServiceTypes } from "../action-engine/service"
import axios from "axios"
import { ActionConfig, ActionEngineApiContext } from "../action-engine/types"
import { AiApiContext } from "./service"
import { StepActionError, validateAndRefineParameters } from "../../utils/validators"



// Define types
type ActionTemplateType = InferTypeOf<typeof ActionTemplate>
type ExecutionType = InferTypeOf<typeof Execution>
type ActionExecutionType = InferTypeOf<typeof ActionRelation>
type ActionConnectionType = InferTypeOf<typeof ActionConnection>
type ActionViewType = InferTypeOf<typeof ActionView>

export default class AiClassService {
  // private manager: EntityManager
  protected aiService: AiApiContext['aiService'];
  protected actionService: ActionEngineApiContext['actionEngineService'];
  protected sessionId: any
  private customEventBus?: any

  constructor({ aiService, actionService, session_id }: { aiService: AiApiContext['aiService'], actionService: ActionEngineApiContext['actionEngineService'], session_id?: any}) {
    this.aiService = aiService;
    this.actionService = actionService;
    this.sessionId = session_id;
    
    // this.initSession();
  }

  // async initSession(){
  //   if(!this.sessionId){
  //       let session = await this.aiService.createSession() as any;
  //         this.actionService.setSession(session?.id, session);
  //       this.sessionId = session.id;
  //   }


  // }

  async getSession(id?: any){
    let session;
    let sessionId = this.sessionId || id;
        if(!sessionId){
          // session = await this.aiService.createSession();
          // await this.actionService.setSession(session.id, session);
          return {}
        } else {
          let redisSession = await this.actionService.getSession(sessionId);
          if(redisSession){
              session = redisSession;
          } else {
            let dbSession = await this.aiService.retrieveConversation(sessionId);
              if(!dbSession){
                  return {}
              } else {
                  session = dbSession;
              }
          }
        }

        await this.actionService.setSession(this.sessionId, session);
        return session;
  }

  async updateSession(session?: any){
        let sessionOld = await this.getSession();
        if(sessionOld?.id){
        await this.actionService.updateSession(this.sessionId, {...sessionOld, ...session});
        await this.aiService.updateAiConversationSessions({...sessionOld, ...session});
        }
        return session;
  }

  async clearSession(){
        await this.actionService.deleteSession(this.sessionId);
        await this.aiService.updateAiConversationSessions({id: this.sessionId});
  }

  async execute(
    templateId: string, 
    parameters: Record<string, any> = {}, 
    session?: any
  ): Promise<any> {
    const startTime = Date.now()
    let executionId = generateEntityId(undefined, "exec")
    try {
  


      const template = await this.actionService.retrieveActionTemplate(templateId) as any;
      if (!template) throw new Error(`Action template ${templateId} not found`)

      // const canCache = true;
      const canCache = template.fail_fast;

      // 3. Check cache
      let cachedResult = null as any;
      if (canCache) {
        cachedResult = await this.actionService.getCachedExecution(templateId, parameters, session?.id);
      }


      // 5. If cache hit, create a lightweight execution record and return cached result
      if (cachedResult) {
        await this.actionService.createExecutions({
          id: executionId,
          workflow_id: template.id,
          status: "cached",
          started_at: new Date(),
          completed_at: new Date(),
          duration_ms: 0,
          input_data: parameters,
          output_data: cachedResult,
          metadata: {
            templateId,
            templateName: template.name,
            sessionId: session?.id || null,
            cached: true,
          },
        });

        // Emit event for audit
        await this.actionService.emitEvent("execution.cached", {
          executionId,
          templateId,
          sessionId: session?.id,
          result: cachedResult,
        });

        return cachedResult;
      }


      await this.actionService.createExecutions({
        id: executionId,
        workflow_id: template.id,
        status: 'running', 
        started_at: new Date(),
        input_data: parameters,
        metadata: { templateId, templateName: template.name, sessionId: session.id || null }
      })
      
      

      let result;
      let finalResult;
      let outputs;
      let contextOutput = session.context;
      let output_template = template.output_template ?? {};
      let context_template = template.context_template ?? {};

      if(template.type === 'WORKFLOW'){
        result = await this.executeWorkflow(template, session);
        finalResult = result;
        outputs = result.outputs ?? outputs;
      } else {
        let execResult = await this.executeAction(template, session);
        result = { data: execResult }
        finalResult = result;
      }
      
      if(isEmptyObject(output_template)){
        finalResult = await expressionEvaluator.resolvePlaceholders(output_template, {...session, outputs, result: result.data ?? result});
      }
      
      if(isEmptyObject(context_template)){
        contextOutput = await expressionEvaluator.resolvePlaceholders(context_template, {...session, result: result.data, outputs });
      }


      await this.actionService.updateSession(session?.id, { ...session, context: {...session.context, ...result.context, ...contextOutput } });
      await this.updateSession({ ...session, context: {...session.context, ...result.context, ...contextOutput } });

      finalResult['outputs'] = outputs;
      finalResult['session_id'] = session.id;
            // 8. Cache the result if allowed


      await this.actionService.updateExecutions({
        id: executionId, 
        status: 'completed',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        output_data: finalResult
      })

      await this.actionService.emitEvent('executionCompleted', {
        executionId: executionId,
        duration: Date.now() - startTime,
        success: true
      })


      if (canCache && finalResult?.data.success) {
        await this.actionService.setCachedExecution(templateId, parameters, session.id, finalResult);
      } else if(!finalResult?.data.success) {
        await this.actionService.invalidateExecutionCachesForTemplate(templateId);     
      }

      return finalResult

    } catch (error: any) {
      try {
        await this.actionService.updateExecutions({
          id: executionId,
          status: 'failed',
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          // error_data: { message: error.message, stack: error.stack }
        });
      } catch (updateError) {
        this.actionService.logger_.error('Failed to update execution with error:', updateError);
      }
      // await handleExecutionError(error, startTime);
      throw error;
    }
  }
  
 private async executeAction(template: ActionTemplateType, session: any): Promise<any> {
    if (template.conditions) {
      const resolvedConditions = await expressionEvaluator.resolvePlaceholders(template.conditions, session);
      if (!evaluateConditions(resolvedConditions, session)) {
        return { skip: resolvedConditions.exit, status: "skipped", reason: "conditions_not_met" }
      }
    }

    const config = await expressionEvaluator.evaluatePlaceholders(removeNullKeys(template.config), session);

    switch (template.type) {
      case 'DB_OPERATION': return await this.actionService.executeDatabaseOperation(config);
      case 'API_CALL': return await this.callAPI(config, session);
      case 'AI_ACTION': return await this.callAI(config, session);
      case 'WORKFLOW': return await this.executeWorkflow(template, session);
      case 'SCRIPT': return await this.executeScript(config, session);
      default: return { success: false, status: 'error', message: `Unsupported action type: ${template.type}`}
    }
  }



  private async callAPI(config: ActionConfig, session: any): Promise<any> {
    const { method, url, headers: configHeaders, body } = config;
    const { timeout, session_id} = session;



    try {
      const response = await axios({
        method: method || "GET",
        url: url,
        data: body,
        headers: {...configHeaders,  session_id: session.id ?? session_id},
        timeout: timeout || 300000
      })

      return response.data ?? response
    } catch (error: any) {
      this.actionService.logger_.error(`API call failed: ${url}`, error)
      return buildErrorResponse(error, 500, `API call failed: ${error.message}`)
    }
  }

  private async callAI(config: ActionConfig, session: any): Promise<any> {
    this.actionService.logger_.info(`Executing AI call via AI Module`);
    let result: any;
    try {

      console.log(session, 'CHAT SESSION')



      // // Use the AI Module Service directly
      const result = await this.aiService.chat({
        session_id: session?.id,
        message: config.message || config.prompt,
        language: config.language || 'en',
        model_id: config.model,
        use_rag: config.use_rag || false,
        memory_limit: config.memory_limit || 5,
        context: session.context
      }, session);

      // Store the AI session ID in context for future use
      // if (result?.session_id && !context.session?.ai_session_id) {
      //   context.session.ai_session_id = result.session_id;
      // }



      

      return result;
    } catch(err: any) {
      this.aiService.logger_.error('AI action failed:', err);
      return { 
        success: false, 
        status_code: 400, 
        status: 'error', 
        message: err.message,
        error: err.stack
      }
    }
  }

  private async executeScript(config: any, context: any): Promise<any> {
    try {
      return await this.actionService.workerPool_.run({ code: config.code, params: context })
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
  const stepUuid = this.actionService.generateId('step');

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
     await this.actionService.updateSession(session.id, { result: output, context: {...session.context, ...result.context, ...contextOutput } });

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
      const stepUuid = this.actionService.generateId('step');
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



  async getActionTemplate(actionId: string): Promise<any> {
    if(!actionId) return null
    let template = await this.actionService.listActionTemplates({  
      $or: [ { id: { $eq: actionId } }, { handle: { $eq: actionId } } ]
    })
    return template.length ? template[0] : null
  }

  async saveWorkflowObject(template: any, workflow: any): Promise<any> {
 
await this.actionService.executeDatabaseOperation({
      table: 'workflow_execution',
      operation: "create",
      data: {
          ...workflow,
          id: this.actionService.generateId('wf_exec'),
          workflow_id: template.handle,
          retention_time: 60000 * 3
      }
})

    return template.length ? template[0] : null
  }

  async stepAction(templateId: string, input: Record<string, any>, session: any): Promise<any> {
    let template = await this.actionService.getActionTemplate(templateId);
    let validationResult = validateAndRefineParameters(input, template?.parameters || []);

    if (!validationResult.valid) {
      throw new StepActionError(`Validation failed: ${validationResult.errors.join(', ')}`);
    }


    let response = await this.executeAction(template, {
      ...session,
      params: validationResult.refinedData, 
    });



      // let contextOutput = session.context;
      let output = response;
      let output_template =  template.output_template;
      let context_template = template.context_template;
      

      if(output_template && Object.keys(output_template).length){
        output = await expressionEvaluator.resolvePlaceholders(
          output_template, 
          {...session, params: input, result: response}
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
    if (this.actionService.redisClient) {
      await this.actionService.redisClient.quit();
    }
  }


}
