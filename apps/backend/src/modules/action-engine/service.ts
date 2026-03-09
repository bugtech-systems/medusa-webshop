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
import { Worker } from "worker_threads"
import path from "path"
import { chatCompletion, generateCompletion, generateEmbedding, streamChatCompletion } from "../../utils/ollama"
import { DbOperationService } from "./services/database-action-service"
import {  } from "./services/script-worker"

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
  executeWorkflowWithDependencies: ReturnType<ActionEngineService['executeWorkflowWithDependencies']>
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
  private customEventBus?: any
  private dbService: DbOperationService
  protected workerPool_: any;

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
    this.customEventBus = container.eventBus // Custom event bus from loader
    
    this.logger_.info("✅ ActionEngineService initialized")
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


      // Emit execution started event
      await this.emitEvent('executionStarted', {
        executionId: this.executionId,
        templateId,
        startedAt: new Date()
      })

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

      // Emit completion event
      await this.emitEvent('executionCompleted', {
        executionId: this.executionId,
        duration: Date.now() - startTime,
        success: true
      })

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
   * Emit events through available channels
   */
  private async emitEvent(eventType: string, data: any): Promise<void> {
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

    let result: any
    
    // switch (queryConfig.operation) {
    //   case 'read':
    //     queryResult = this.buildSelectQuery(queryConfig)
        
    //     const selectResult = await client.query(queryResult.sql, queryResult.params)
    //     return selectResult.rows
        
    //   case 'create':
    //     if (Array.isArray(queryConfig.data)) {
    //       return await this.executeBatchCreate(queryConfig, client)
    //     }
    //     queryResult = this.buildInsertQuery(queryConfig)
        
    //     const insertResult = await client.query(queryResult.sql, queryResult.params)
    //     return queryConfig.returning ? insertResult.rows[0] : { success: true, id: insertResult.rows[0]?.id }
        
    //   case 'update':
    //     queryResult = this.buildUpdateQuery(queryConfig)
    //     const updateResult = await client.query(queryResult.sql, queryResult.params)
    //     return queryConfig.returning ? updateResult.rows[0] : { success: true, affectedRows: updateResult.rowCount }
        
    //   case 'delete':
    //     queryResult = this.buildDeleteQuery(queryConfig)
    //     const deleteResult = await client.query(queryResult.sql, queryResult.params)
    //     return { success: true, affectedRows: deleteResult.rowCount }
        
    //   case 'upsert':
    //     queryResult = this.buildUpsertQuery(queryConfig)
    //     const upsertResult = await client.query(queryResult.sql, queryResult.params)
    //     return queryConfig.returning ? upsertResult.rows[0] : { success: true }
        
    //   case 'count':
    //     queryResult = this.buildCountQuery(queryConfig)
    //     const countResult = await client.query(queryResult.sql, queryResult.params)
    //     return { count: parseInt(countResult.rows[0].count) }
        
    //   case 'exists':
    //     queryResult = this.buildExistsQuery(queryConfig)
    //     const existsResult = await client.query(queryResult.sql, queryResult.params)
    //     return { exists: existsResult.rows[0].exists }
        
    //   case 'batch_create':
    //     return await this.executeBatchCreate(queryConfig, client)
        
    //   default:
    //     return { success: false, status: 'error', message: `Unsupported database operation: ${queryConfig.operation}`}
    //     // throw new Error(`Unsupported database operation: ${queryConfig.operation}`)
    // }
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
    this.logger_.info(`Executing API action ${config.model}`)
    
    try {
    
    
    
    let result = await generateCompletion({prompt: config.message || config.prompt, ...config})
    
    
    // Implement your AI service integration here
    // return { 
    //   result: result.response,
    //   success: true, 
    //   model: config.model,
    //   timestamp: new Date().toISOString(),
    // }
          return  result.response

   } catch(err) {
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
      
 
      workflowResults[outputKey] = {parameters: mergedParams, context: variables, result: output};
      
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
    
    return {
      success,
      status_code: success ? 200 : 400,
      data: finalResult,
      handle,
      ...(errors ? errors : {}),
      outputs: workflowResults,
      context: variables,
      completedActions: Object.keys(workflowResults).length
    };
  }

   
  // private async executeWorkflow(config: any, context: any): Promise<any> {
  //   this.logger_.info(`Executing workflow ${config}`)
    
  //   // Extract workflow actions
  //   const actions = config.actions || [] as any
  //   const results = new Map<string, any>()
  //   const logs = [] as any;
    
    
  //   for (const actionConfig of actions) {
  //     const action = await this.retrieveActionTemplate(actionConfig.action_id)
  //     if (!action) continue
      
  //     // Merge parameters
  //     const mergedParams = {
  //       ...context.params,
  //       ...(await expressionEvaluator.resolvePlaceholders(actionConfig.parameters || {}, {...context, outputs: Object.fromEntries(results)}))
  //     }
      
      
  

  //     // Execute action
  //     const result = await this.executeAction(action, {
  //       ...context,
  //       params: mergedParams,
  //       outputs: Object.fromEntries(results)
  //     })
      
  //     logs.push({handle: action?.handle, ...result})
  //     results.set(action?.handle || action?.id, {result, ...{
  //       ...context,
  //       params: mergedParams,
  //       outputs: Object.fromEntries(results)
  //     }})
        
  //   }
    
  //   return { success: true, results: Object.fromEntries(results)}
    
  // }
  
  

  // ========== HELPER METHODS ==========

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
      
      await this.emitEvent('executionFailed', {
        executionId: this.executionId,
        error: error.message,
        duration: Date.now() - startTime
      })
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

  /**
   * Execute workflow with dependencies
   */
  async executeWorkflowWithDependencies(
    workflowId: string,
    parameters: Record<string, any> = {},
    session: any = {}
  ): Promise<any> {
    // Get all actions for this workflow
    const actions = await this.listActionTemplates({
      workflow_id: { $eq: workflowId }
    })

    if (!actions.length) {
      throw new Error(`No actions found for workflow ${workflowId}`)
    }

    // Sort by dependencies
    const sortedActions = this.sortActionsByDependencies(actions)
    
    // Execute in order
    const results = new Map<string, any>()
    
    for (const action of sortedActions) {
      // Check dependencies
      if (!this.checkDependencies(action, results)) {
        await this.createExecutions({
          workflow_id: action.id,
          // execution_id: this.executionId!,
          status: 'skipped',
          error_message: 'Dependencies not satisfied'
        })
        continue
      }

      // Execute action
      const result = await this.executeAction(action, {
        ...session,
        params: parameters,
        previousOutputs: Object.fromEntries(results)
      })
      
      results.set(action.id, result)
    }

    return {
      workflowId,
      results: Object.fromEntries(results),
      executionId: this.executionId!
    }
  }

  /**
   * Sort actions by dependencies
   */
  private sortActionsByDependencies(actions: ActionTemplateType[]): ActionTemplateType[] {
    const graph = new Map<string, string[]>()
    const indegree = new Map<string, number>()
    const actionMap = new Map<string, ActionTemplateType>()

    // Initialize
    actions.forEach(action => {
      graph.set(action.id, [])
      indegree.set(action.id, 0)
      actionMap.set(action.id, action)
    })

    // Build graph
    actions.forEach(action => {
      if (action.dependencies && Array.isArray(action.dependencies)) {
        action.dependencies.forEach(depId => {
          if (graph.has(depId)) {
            graph.get(depId)!.push(action.id)
            indegree.set(action.id, indegree.get(action.id)! + 1)
          }
        })
      }
    })

    // Topological sort
    const queue = Array.from(indegree.entries())
      .filter(([_, degree]) => degree === 0)
      .map(([id]) => id)

    const sorted: ActionTemplateType[] = []

    while (queue.length > 0) {
      const currentId = queue.shift()!
      sorted.push(actionMap.get(currentId)!)

      graph.get(currentId)?.forEach(neighborId => {
        indegree.set(neighborId, indegree.get(neighborId)! - 1)
        if (indegree.get(neighborId) === 0) {
          queue.push(neighborId)
        }
      })
    }

    return sorted
  }

  /**
   * Check if action dependencies are satisfied
   */
  private checkDependencies(action: ActionTemplateType, results: Map<string, any>): boolean {
    if (!action.dependencies || !Array.isArray(action.dependencies)) {
      return true
    }

    return action.dependencies.every(depId => {
      const result = results.get(depId)
      return result && !result.error
    })
  }
  
    private buildStandardResponse(
      data: any,
      exitOnError: boolean = false,
      metadata?: any
    ): StandardResponse {
      const isError = data?.success === false || data instanceof Error
      
      return {
        success: !isError,
        code: isError ? (data.code || 500) : 200,
        message: isError ? data.message : "Action completed successfully",
        data: isError ? null : data,
        exit: isError && exitOnError,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }
    }
  
    private buildSuccessResponse(
      data: any,
      message: string = "Success",
      additionalData?: any
    ): StandardResponse {
      return {
        success: true,
        code: 200,
        message,
        data: data,
        exit: false,
        metadata: { timestamp: new Date().toISOString(), ...additionalData }
      }
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
  

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const services = {
      logger: !!this.logger_,
      postgresPool: !!this.postgresPool,
      customEventBus: !!this.customEventBus
    }
    
    return {
      healthy: Object.values(services).every(Boolean),
      services,
      timestamp: new Date().toISOString()
    }
  }
}




































// ========== TYPE UTILITIES ==========

/**
 * Utility type to extract service method signatures
 */
// export type ActionEngineServiceMethods = Pick<
//   ActionEngineService,
//   | 'execute'
//   | 'getExecutionStatus'
//   | 'executeWorkflowWithDependencies'
//   | 'healthCheck'
//   | 'retrieveActionTemplate'
//   | 'listActionTemplates'
//   | 'createActionTemplates'
//   | 'updateActionTemplate'
//   | 'deleteActionTemplate'
//   | 'retrieveExecution'
//   | 'listExecutions'
//   | 'createExecutions'
//   | 'updateExecutions'
//   | 'deleteExecution'
//   | 'retrieveActionExecution'
//   | 'listActionExecutions'
//   | 'createActionExecutions'
//   | 'updateActionExecutions'
//   | 'deleteActionExecution'
// >

/**
 * Type for API route handlers using the service
 */
 
 
 
export type ActionEngineApiContext = {
  actionEngineService: ActionEngineService
}

// Export all types for use in API routes
export * as ActionEngineTypes from './types'