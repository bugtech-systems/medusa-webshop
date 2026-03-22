import { ActionConfig, Condition, ExecutionStatus, HealthCheckResult, QueryBuilderResult, QueryConfig, StandardResponse, WhereCondition } from "../modules/action-engine/types"
import * as expressionEvaluator from "../modules/action-engine/expressionEvaluator"

  
  /**
   * Evaluate conditions
   */
  export function evaluateConditions(conditions: Condition, context: any): boolean {
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
  export async function handleExecutionError(error: any, startTime: number): Promise<void> {
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
    
  }


  // ========== PUBLIC API METHODS ==========

  /**
   * Get execution status
   */
  export async function getExecutionStatus(executionId: string): Promise<ExecutionStatus | any> {
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
  
   export function buildErrorResponse(
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