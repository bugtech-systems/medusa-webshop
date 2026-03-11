// src/modules/action-engine/service.ts
import { 
  generateEntityId,
  MedusaService,
} from "@medusajs/framework/utils"
import { 
  InferTypeOf, 
  DAL,
  Logger
} from "@medusajs/framework/types"
import { ActionTemplate, Execution, ActionRelation, ActionConnection, ActionView } from "./models"
import * as expressionEvaluator from "./expressionEvaluator"
import axios from "axios"
import { chatCompletion, generateCompletion, generateEmbedding, streamChatCompletion } from "../../utils/ollama"
import { DbOperationService } from "./services/database-action-service"
import { ActionConfig, Condition, ExecutionStatus, HealthCheckResult, QueryBuilderResult, QueryConfig, StandardResponse, WhereCondition } from "./types"
import { parseActionInput, validateActionInput } from "../../utils/validators"
import { parseFieldsString, refineObjectByFields, removeEmptyObjects, removeNullKeys } from "../../utils/helpers"



// Define types
type ActionTemplateType = InferTypeOf<typeof ActionTemplate>
type ExecutionType = InferTypeOf<typeof Execution>
type ActionExecutionType = InferTypeOf<typeof ActionRelation>
type ActionConnectionType = InferTypeOf<typeof ActionConnection>
type ActionViewType = InferTypeOf<typeof ActionView>




// ========== PUBLIC TYPE DECLARATIONS ==========

export interface ActionEngineServiceTypes {
  // Entity types
  ActionTemplate: ActionTemplateType
  Execution: ExecutionType
  ActionExecution: ActionExecutionType
  ActionConnection: ActionConnectionType
  ActionView: ActionViewType
  // Method return types
  execute: ReturnType<ActionEngineService['execute']>
  getExecutionStatus: ReturnType<ActionEngineService['getExecutionStatus']>
  healthCheck: ReturnType<ActionEngineService['healthCheck']>
  // Repository methods (inherited from MedusaService)
  retrieveActionTemplate: ReturnType<ActionEngineService['retrieveActionTemplate']>
  listActionTemplates: ReturnType<ActionEngineService['listActionTemplates']>
  createActionTemplate: ReturnType<ActionEngineService['createActionTemplates']>
  updateActionTemplate: ReturnType<ActionEngineService['updateActionTemplates']>
  deleteActionTemplate: ReturnType<ActionEngineService['deleteActionTemplates']>
  retrieveExecution: ReturnType<ActionEngineService['retrieveExecution']>
  listExecutions: ReturnType<ActionEngineService['listExecutions']>
  createExecutions: ReturnType<ActionEngineService['createExecutions']>
  updateExecutions: ReturnType<ActionEngineService['updateExecutions']>
  deleteExecution: ReturnType<ActionEngineService['deleteExecutions']>
  retrieveActionRelation: ReturnType<ActionEngineService['retrieveActionRelation']>
  listActionRelations: ReturnType<ActionEngineService['listActionRelations']>
  createActionRelations: ReturnType<ActionEngineService['createActionRelations']>
  updateActionRelations: ReturnType<ActionEngineService['updateActionRelations']>
  deleteActionRelation: ReturnType<ActionEngineService['deleteActionRelations']>
}



// ========== SERVICE CLASS ==========

export default class ActionEngineService extends MedusaService({
  ActionRelation,
  ActionConnection,
  Execution,
  ActionTemplate, 
  ActionView
}) {
  // Medusa services
  private readonly logger_: Logger
  
  // Loader-registered resources
  private postgresPool?: any
  private dbService: DbOperationService
  protected workerPool_: any;
  private aiModuleService_: any
  // Execution context
  private executionId: string | null = null
  private executionContext = {
    previousOutputs: new Map<string, any>(),
    globalVariables: new Map<string, any>(),
    executionData: {} as Record<string, any>
  }

  constructor(
    container: any,
    options?: any
  ) {
    super(container)
    
    // Get logger from Medusa container
    this.logger_ = container.logger
    this.dbService = new DbOperationService(container.postgresPool)
    this.workerPool_ = container.workerPool;
    // Get loader-registered services (use optional chaining)
    this.postgresPool = container.postgresPool
    // this.aiModuleService_ = container.aiModuleService

    this.logger_.info("✅ ActionEngineService initialized")
    console.log(Object.keys(container))

  }
  // ========== CORE ACTION ENGINE METHODS ==========

  /**
   * Main execution method
   */
  async execute(
    templateId: string, 
    parameters: Record<string, any> = {}, 
    sessionContext: any = {}
  ): Promise<any> {
    const startTime = Date.now()
    // this.executionId = this.generateExecutionId()
    
    try {
      // Get template using Medusa repository
      const template = await this.retrieveActionTemplate(templateId) as any;
      if (!template) {
        throw new Error(`Action template ${templateId} not found`)
      }

      // Create execution record
      const execution = await this.createExecutions({
        workflow_id: template.id,
        status: 'running',
        started_at: new Date(),
        input_data: parameters,
        metadata: {
          templateId,
          templateName: template.name
        }
      })
      
      
      
      // Build context
      const context = {
        params: parameters,
        outputs: {},
        ...sessionContext
      }


    this.executionId = execution.id


      // // Emit execution started event
      // await this.emitEvent('executionStarted', {
      //   executionId: this.executionId,
      //   templateId,
      //   startedAt: new Date()
      // })

let result;

let output_template = template.output_template;
let context_template = template.context_template;
    if(template.type == 'WORKFLOW'){
     result = await this.executeWorkflow(template?.config, context);
    } else {
     let execResult = await this.executeAction(template, context);
     result = { context: context.context, data: execResult }
    }
    
       if(output_template){
        let templatedOutput = (await expressionEvaluator.resolvePlaceholders(
          template.output_template, 
          {...context, result: result.data},
        ))
          result = templatedOutput;
      }
      
      if(context_template){
        let contextOutput = (await expressionEvaluator.resolvePlaceholders(
          template.context_template, 
          {...context, result: result.data }
        ))
        context.context = contextOutput;
      }
     
    


      // let result = await this.executeAction(template, context)


      // Update execution record
      await this.updateExecutions({
        id: this.executionId, 
        status: 'completed',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        output_data: result
      })

      // // Emit completion event
      // await this.emitEvent('executionCompleted', {
      //   executionId: this.executionId,
      //   duration: Date.now() - startTime,
      //   success: true
      // })

      return {
        success: true,
        status: 'success',
        status_code: 200,
        executionId: this.executionId,
        execution_time: Date.now() - startTime,
        ...result,
      }

    } catch (error: any) {
      await this.handleExecutionError(error, startTime)
      throw error
    }
  }




  /**
   * Execute individual action
   */
  private async executeAction(template: ActionTemplateType, context: any): Promise<any> {
    // Check conditions
    
    
    
    
    
    
    
    if (template.conditions) {
      const resolvedConditions = await expressionEvaluator.resolvePlaceholders(
        template.conditions,
        context
      )
      

      if (!this.evaluateConditions(resolvedConditions, context)) {
        return { skip: resolvedConditions.exit, status: "skipped", reason: "conditions_not_met" }
      }
    }

    // Resolve configuration
    const config = await expressionEvaluator.evaluatePlaceholders(
      removeNullKeys(template.config),
      context
    )

    console.log(context,' EXECUTE CONTEXT')
    // let cleanConfig = removeNullKeys(config);

    // Execute based on type
    switch (template.type) {
      case 'DB_OPERATION':
        return await this.executeDatabaseOperation(config)
      case 'API_CALL':
        return await this.callAPI(config, context)
      case 'AI_ACTION':
        return await this.callAI(config, context)
      case 'WORKFLOW':
        return await this.executeWorkflow(removeNullKeys(template.config), context)
      case 'SCRIPT':
        return await this.executeScript(config, context)
      default:
        return { success: false, status: 'error', message: `Unsupported action type: ${template.type}`}
    }
  }





  // Main refined database operation function
private async executeDatabaseOperation(config: any): Promise<any> {

let queryConfig = {debug: true, limit: 10, ...config}
  
  if(queryConfig.fields){
    queryConfig.fields = typeof queryConfig.fields == 'string' ? parseFieldsString(queryConfig.fields) : ["*"]
  }
  
  if (!this.postgresPool) {
    return { success: false, status: 'error', message: "Database pool not available. Check your postgres-loader."}

  }



    
  try {
    
      const dbResult = await this.dbService.execute(queryConfig);
    return dbResult
   } catch(err) {
   console.log(err)
    return { success: false, status: 'error', message: `Something went wrong - database operation: ${queryConfig.operation}`}
   } finally {
    // client.release()
  }
}


  /**
   * API call handler
   */
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
      this.logger_.error(`API call failed: ${url}`, error)
        return this.buildErrorResponse(error, 500, `API call failed: ${error.message}`)
    }
  }

  /**
   * AI call handler
   */
  private async callAI(config: ActionConfig, context: any): Promise<any> {
    this.logger_.info(`Executing AI call ${JSON.stringify(config)}`)
    
    try {
    
    console.log(context, 'AI CONTEXT')
    let systemInstruction = await expressionEvaluator.evaluatePlaceholders(
      context.model.metadata.template || context.model.system,
      context
    )




    let messages = [
      {role: 'system', content: systemInstruction},
      {role: 'user', content: config.message || config.prompt}

    ]


    console.log(messages, 'MESSAGES')
    
    let chatResult = await chatCompletion({messages, model: config.model, options: context.model.config})
    // let result = await generateCompletion({prompt: config.message || config.prompt, ...config, options: context.model.config})
    
    
    // Implement your AI service integration here
    // return { 
    //   result: result.response,
    //   success: true, 
    //   model: config.model,
    //   timestamp: new Date().toISOString(),
    // }

    // console.log(result, chatResult, 'RESULLT')
          return JSON.parse(chatResult.message.content);

   } catch(err) {
    console.log(err, 'ERROR')
      return { success: false, status_code: 400, status: 'error', message: 'Chat AI Action Error:', err }
    }
  }

  /**
   * Script execution handler
   */
// private async executeScript(config: any, context: any): Promise<any> {
//   return new Promise((resolve, reject) => {
//     const worker = new Worker(
//       path.resolve(__dirname, "services", "script-worker.js"),
//       {
//         workerData: {
//           code: config.code,
//           params: context,
//           callStack: [context.executionId ?? "root"],
//         },
//       }
//     )

//     worker.once("message", (msg) => {
//       worker.terminate()

//       if (msg?.error) {
//         return reject(new Error(msg.error))
//       }

//       resolve(msg?.result)
//     })

//     worker.once("error", (err) => {
//       worker.terminate()
//       reject(err)
//     })

//     worker.once("exit", (code) => {
//       if (code !== 0) {
//         reject(new Error(`Worker stopped with exit code ${code}`))
//       }
//     })
//   })
// }

private async executeScript(config: any, context: any): Promise<any> {
  try {
    console.log(config, context,'EXECUTING SCRIPT')

    const result = await this.workerPool_.run({
      code: config.code,
      params: context
    })

    return result
  } catch (err: any) {
    throw new Error(`ExecutionError: ${err.message}`)
  }
}


  /**
   * Workflow execution handler
   */
   private async executeWorkflow(config: any, context: any): Promise<any> {
    this.logger_.info(`Executing workflow ${config}`);
    
    let success = true;
    let payload;
    let variables = {}
    let oldParams = {...context.params};
    let finalResult;
    let handle;
    let errors;
    let index = 0;
    const actions = config.actions || [];
    const workflowResults: Record<string, any> = {};
    
    for (const actionConfig of actions) {
     let conf = (await expressionEvaluator.resolvePlaceholders(
          actionConfig.action_id || {}, 
          {context: variables, outputs: workflowResults }
        ))


      const action = await this.getActionTemplate(conf);
      if (!action) continue;
      let params = actionConfig.parameters;
            // Merge parameters
      const mergedParams = {
        ...oldParams,
        ...(await expressionEvaluator.resolvePlaceholders(
          params || {}, 
          {...context, ...oldParams, context: variables, outputs: workflowResults }
        ))
      };


      // if(action.parameters){
      // action.parameters.map(param => {
      //     let value = null as any
          
      //     if(!params[param.name]) {
      //       if(param.defaultValue){
      //         value = param.defaultValue
      //       } else {
      //         return            
      //       }
      //     };
          
      //     if(param.type == 'json'){
      //       value = JSON.parse(params[param.name]);
      //     } else if(param.type == 'number'){
      //       value = Number(params[param.name]);
      //     } else {
      //       value = params[param.name]
      //     }
      
      //     validatedParameters[param.name] = value
      // })      
      // }
      
            

          
   

      
      

      

          if(action.parameters){
           payload  = parseActionInput(action.parameters || [], mergedParams)
          }
          
          
      /* 
          if(action.parameters && action.parameters.length){
            errors = validateActionInput(action.parameters || [], mergedParams)
          } */
          
          
        // if (errors.length > 0) {
        //             break;

        // } 
      

      
      
      // Execute action
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
      

     if(output?.skip){
        continue;      
      }

      if(output_template){
        let templatedOutput = (await expressionEvaluator.resolvePlaceholders(
          output_template, 
          {...context, ...oldParams, context: variables, outputs: workflowResults, result }
        ))
          output = templatedOutput;
      }
      
      if(context_template){
        let contextOutput = (await expressionEvaluator.resolvePlaceholders(
          context_template, 
          {...context, ...oldParams, context: variables, outputs: workflowResults, result: output }
        ))        
          variables = {...variables, ...contextOutput};
      }
      
 
      workflowResults[outputKey] = {index: index + 1, parameters: mergedParams, context: variables, result: output};
      
      // Store result
      
      finalResult = output;
      success = result?.success;
      oldParams = {...oldParams, ...mergedParams}
      handle = action?.name;
      // Check if we should exit the workflow
      if (result?.exit || result?.status === 'error') {
        break;
      }
      
    }
    

  let workflowData = this.buildWorkflowData(workflowResults)    

console.log(workflowData, 'WORKFLOWW')
    return {
      success,
      status_code: success ? 200 : 400,
      data: finalResult,
      handle,
      ...(errors ? errors : {}),
      outputs: workflowResults,
      context: variables,
      completedActions: Object.keys(workflowResults).length,
      workflowData  

    };
  }



  /**
   * Evaluate conditions
   */
  private evaluateConditions(conditions: Condition, context: any): boolean {
    if (!conditions || typeof conditions !== "object") return true
    
    if (conditions.and) {
      return conditions.and.every((c: Condition) => this.evaluateConditions(c, context))
    }
    
    if (conditions.or) {
      return conditions.or.some((c: Condition) => this.evaluateConditions(c, context))
    }

    if (conditions.field && conditions.operator) {
      const fieldValue = expressionEvaluator.getNestedValue(context, conditions.field)
      const compareValue = conditions.value


      switch (conditions.operator) {
        case "eq": return fieldValue == compareValue
        case "neq": return fieldValue != compareValue
        case "gt": return fieldValue > compareValue
        case "gte": return fieldValue >= compareValue
        case "lt": return fieldValue < compareValue
        case "lte": return fieldValue <= compareValue
        case "in": return Array.isArray(compareValue) && compareValue.includes(fieldValue)
        case "like": return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())
        case "exists": return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
        case "not_exists": return fieldValue === undefined || fieldValue === null || fieldValue === ''
        default: return false
      }
    }
    
    return true
  }

  /**
   * Handle execution errors
   */
  private async handleExecutionError(error: any, startTime: number): Promise<void> {
    if (this.executionId) {
      await this.updateExecutions({
        id: this.executionId,
        status: 'failed',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        error_message: error.message
      })
      
      // await this.emitEvent('executionFailed', {
      //   executionId: this.executionId,
      //   error: error.message,
      //   duration: Date.now() - startTime
      // })
    }
    
    this.logger_.error("Action execution failed:", error)
  }


  // ========== PUBLIC API METHODS ==========

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | any> {
    const execution = await this.retrieveExecution(executionId)
    
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    // Get action executions
    const actionExecutions = await this.listExecutions({
      id: { $eq: executionId }
    })

    return {
      ...execution,
      actions: actionExecutions,
      progress: execution.status === 'running' 
        ? actionExecutions.filter(a => a.status === 'completed').length / actionExecutions.length
        : 1
    }
  }
  
  async getActionTemplate(actionId: string): Promise<any> {
        if(!actionId) return null
        let template = await this.listActionTemplates({  $or: [
        {
          id: {
            $eq: actionId,
          },
        },
        {
          handle: {
            $eq: actionId,
          },
        },
      ]})
    
    if(!template.length){
      return null
    }

    return template[0]
  }

    private buildErrorResponse(
      error: Error | any,
      status_code: number = 400,
      message?: string
    ): any {
      return {
        success: false,
        status_code,
        error,
        status: 'error',
        message: message || error.message || "Unknown error",
        data: null,
        exit: true,
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: error.constructor?.name
        }
      }
    }
  

private buildWorkflowData(actions: Record<string, any>) {
  const steps = Object.entries(actions).map(([key, value]) => ({
    key,
    ...value
  }))

  steps.sort((a, b) => a.index - b.index)

  const buildNested = (index: number): any => {
    if (index >= steps.length) return undefined

    const step = steps[index]

    const node: any = {
      uuid: generateEntityId(undefined, "step"),
      action: step.key,
      noCompensation: true,
      input: step
    }

    const next = buildNested(index + 1)

    if (next) {
      node.next = next
    }

    return node
  }

  return {
    _v: 0,
    runId: generateEntityId(undefined, "run"),
    state: "pending",
    steps: {},
    modelId: "dynamic-workflow",

    options: {
      name: "dynamic-workflow",
      store: true,
      idempotent: false,
      retentionTime: 259200
    },

    metadata: {
      sourcePath: "ai-generated",
      eventGroupId: generateEntityId(undefined, "event"),
      preventReleaseEvents: false
    },

    startedAt: Date.now(),

    definition: buildNested(0),

    transactionId: generateEntityId(undefined, "tx"),

    hasAsyncSteps: false,
    hasFailedSteps: false,
    hasSkippedSteps: false,
    hasWaitingSteps: false,
    hasRevertedSteps: false,
    hasSkippedOnFailureSteps: false
  }
}

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const services = {
      logger: !!this.logger_,
      postgresPool: !!this.postgresPool,
    }
    
    return {
      healthy: Object.values(services).every(Boolean),
      services,
      timestamp: new Date().toISOString()
    }
  }
}



 
export type ActionEngineApiContext = {
  actionEngineService: ActionEngineService
}

// Export all types for use in API routes
export * as ActionEngineTypes from './types'