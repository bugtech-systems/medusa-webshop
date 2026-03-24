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
import { parseFieldsString, removeEmptyObjects, removeNullKeys } from "../../utils/helpers"
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
  private customEventBus?: any

  constructor({ aiService, actionService }: { aiService: AiApiContext['aiService'], actionService: ActionEngineApiContext['actionEngineService']}) {
    this.aiService = aiService;
    this.actionService = actionService;

  }



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
        const existingSession = await this.actionService.getSession(sessionId);
        if (existingSession) {
          sessionData = {id: sessionId, ...existingSession};
        } 
      }
      
      
      if(!sessionId || !sessionData) {
          sessionData = await this.aiService.createSession({})      
          await this.actionService.setSession(sessionData.id, sessionData)
      }   


      console.log(sessionId, sessionData, 'sessionss')


      const template = await this.actionService.retrieveActionTemplate(templateId) as any;
      if (!template) throw new Error(`Action template ${templateId} not found`)

      await this.actionService.createExecutions({
        id: executionId,
        workflow_id: template.id,
        status: 'running', 
        started_at: new Date(),
        input_data: parameters,
        metadata: { templateId, templateName: template.name, sessionId: sessionId || null }
      })
      
      let { context: oldContext, ...clearSession} = sessionData;
      
      const context = { params: parameters, outputs: {}, session: clearSession, executionId, context: oldContext}

      let result;
      let outputs;
      let output_template = template.output_template;
      let context_template = template.context_template;

      if(template.type === 'WORKFLOW'){
        result = await this.executeWorkflow(template?.config, context);
        outputs = result.outputs ?? outputs;
      } else {
        let execResult = await this.executeAction(template, context);
        console.log(execResult, 'EXECUTION RESULT')

        result = { context, data: execResult }
      }
      
      if(output_template){
        result = await expressionEvaluator.resolvePlaceholders(output_template, {...context, outputs, result: result.data ?? result});
        console.log(result, 'OUTPUT TEMPLATE')
      }
      
      if(context_template){
        let contextOutput = await expressionEvaluator.resolvePlaceholders(context_template, {...context, result: result.data });
        
        if (sessionId && contextOutput) {
          await this.actionService.updateSession(sessionId, { context: {...sessionData.context, ...result.context, ...contextOutput } });
        }
        context.session = contextOutput;
      }



      result['outputs'] = outputs;
      result['sessionId'] = sessionData.id;
      await this.actionService.updateExecutions({
        id: executionId, 
        status: 'completed',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        output_data: result
      })

      await this.actionService.emitEvent('executionCompleted', {
        executionId: executionId,
        duration: Date.now() - startTime,
        success: true
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
  
 private async executeAction(template: ActionTemplateType, context: any): Promise<any> {
    if (template.conditions) {
      const resolvedConditions = await expressionEvaluator.resolvePlaceholders(template.conditions, context);
      if (!evaluateConditions(resolvedConditions, context)) {
        return { skip: resolvedConditions.exit, status: "skipped", reason: "conditions_not_met" }
      }
    }

    const config = await expressionEvaluator.evaluatePlaceholders(removeNullKeys(template.config), context);

    switch (template.type) {
      case 'DB_OPERATION': return await this.actionService.executeDatabaseOperation(config);
      case 'API_CALL': return await this.callAPI(config, context);
      case 'AI_ACTION': return await this.callAI(config, context);
      case 'WORKFLOW': return await this.executeWorkflow(removeNullKeys(template.config), context);
      case 'SCRIPT': return await this.executeScript(config, context);
      default: return { success: false, status: 'error', message: `Unsupported action type: ${template.type}`}
    }
    



    

  }



  private async callAPI(config: ActionConfig, context: any): Promise<any> {
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
      this.actionService.logger_.error(`API call failed: ${url}`, error)
      return buildErrorResponse(error, 500, `API call failed: ${error.message}`)
    }
  }

  private async callAI(config: ActionConfig, context: any): Promise<any> {
    this.actionService.logger_.info(`Executing AI call via AI Module`);
    let result: any;
    try {


      console.log(context, 'AI CONTENT', {
        session_id: context.session?.id,
        message: config.message || config.prompt,
        language: config.language || 'en',
        model_id: config.model,
        use_rag: config.use_rag || false,
        memory_limit: config.memory_limit || 5,
        context: context.context
      })

      // // Use the AI Module Service directly
      const result = await this.aiService.chat({
        session_id: context.session?.ai,
        message: config.message || config.prompt,
        language: config.language || 'en',
        model_id: config.model,
        use_rag: config.use_rag || false,
        memory_limit: config.memory_limit || 5,
        context: context.context
      }, context.session);

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

  private async executeWorkflow(config: any, context: any): Promise<any> {
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
      console.log(output, result, output_template, context_template, 'OUTPUTS RESULT')
      if(output?.skip) continue;

      if(output_template && Object.keys(output_template).length){
        output = await expressionEvaluator.resolvePlaceholders(
          output_template, 
          {...context, ...oldParams, context: variables, outputs: workflowResults, result }
        );
      }
      
      if(context_template && Object.keys(context_template).length){
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
      success = result?.success ?? true;
      oldParams = {...oldParams, ...mergedParams}
      
      if (result?.exit || result?.status === 'error') break;
      
      index++;
    }


    console.log(finalResult, 'FINAAL RESULT')
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
    let template = await this.actionService.listActionTemplates({  
      $or: [ { id: { $eq: actionId } }, { handle: { $eq: actionId } } ]
    })
    return template.length ? template[0] : null
  }

  async stepAction(templateId: string, input: Record<string, any>, session: any): Promise<any> {
    let templates = await this.actionService.listActionTemplates({  
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
      context: session.context
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



    console.log(response, 'STEP RESPONSE')
    return output;
  }


  async onApplicationShutdown(): Promise<void> {
    if (this.actionService.redisClient) {
      await this.actionService.redisClient.quit();
    }
  }


}
