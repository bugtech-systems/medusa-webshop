import { 
  InferTypeOf, 
  DAL,
  Logger
} from "@medusajs/framework/types"

import { ActionTemplate, Execution, ActionRelation, ActionConnection } from "./models"


// Re-export all service types

// Define types
export type ActionTemplateType = InferTypeOf<typeof ActionTemplate>
export type ExecutionType = InferTypeOf<typeof Execution>
// export type ActionExecutionType = InferTypeOf<typeof ActionExecution>
export type ActionRelationType = InferTypeOf<typeof ActionRelation>
export type ActionConnectionType = InferTypeOf<typeof ActionConnection>



  // ========== ACTION HANDLERS ==========

  /**
   * Database operation using loader-registered PostgreSQL pool
   */
// First, let's define types for better structure
export interface QueryConfig {
  operation: 'read' | 'create' | 'update' | 'delete' | 'upsert' | 'count' | 'exists' | 'batch_create'
  table: string
  data?: Record<string, any> | Record<string, any>[]
  query?: string
  fields?: string[] | '*'
  where?: Record<string, any> | WhereCondition[]
  orderBy?: Record<string, 'asc' | 'desc'>
  limit?: number
  offset?: number
  returning?: string[] | '*'
  onConflict?: {
    target: string[]
    update?: string[]
    where?: Record<string, any>
  }
}

export interface WhereCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null' | 'between'
  value?: any
  logical?: 'AND' | 'OR'
  conditions?: WhereCondition[] // For nested conditions
}

export interface QueryBuilderResult {
  sql: string
  params: any[]
}

// Input parameter types
export interface ExecuteParameters {
  templateId: string
  parameters?: Record<string, any>
  triggerId?: string | null
  session?: SessionContext
}

export interface ExecuteWorkflowParameters {
  workflowId: string
  parameters?: Record<string, any>
  session?: SessionContext
}

export interface SessionContext {
  session_id?: string
  conversation_id?: string
  tenant_id?: string
  context?: Record<string, any>
  [key: string]: any
}

export interface ExecutionResult {
  executionId: string
  result: any
  duration: number
}

export interface ExecutionStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at?: Date
  completed_at?: Date
  duration_ms?: number
  input_data?: Record<string, any>
  output_data?: any
  error_message?: string
  metadata?: Record<string, any>
  actions?: any[]
  progress?: number
}

export interface WorkflowResult {
  workflowId: string
  results: Record<string, any>
  executionId: string
}

export interface HealthCheckResult {
  healthy: boolean
  services: {
    logger: boolean
    postgresPool: boolean
  }
  timestamp: string
}

// Event types
export interface ExecutionEvent {
  executionId: string
  templateId?: string
  startedAt?: Date
  duration?: number
  error?: string
  success?: boolean
}

// Action types
export type ActionType = 'database' | 'api' | 'ai' | 'workflow' | 'script'

export interface ActionConfig {
  type: ActionType
  operation?: string
  query?: string
  data?: Record<string, any>
  table?: string
  model?: string
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
  content?: string
  messages?: any
  actions?: Array<{
    template: string
    parameters?: Record<string, any>
  }>
  [key: string]: any
}

export interface Condition {
  and?: Condition[]
  or?: Condition[]
  field?: string
  operator?: string
  value?: any

}

export interface StandardResponse<T = any> {
  success: boolean
  code: number
  message: string
  data: T
  exit?: boolean
  context?: any
  metadata?: any
}

export interface ExecutionContext {
  executionId: string
  workflowId: string
  sequence: number
  results: Map<string, StandardResponse>
  variables: Map<string, any>
  logs: ExecutionLog[]
  visitedActions: Set<string>
}

export interface ExecutionLog {
  id: string
  executionId: string
  actionId: string
  actionName: string
  sequence: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input: Record<string, any>
  output: StandardResponse | null
  error?: string
  metadata?: Record<string, any>
  startedAt: Date
  completedAt?: Date
  durationMs?: number
}


export type {
  // ActionEngineServiceTypes,
  // ExecuteParameters,
  // ExecuteWorkflowParameters,
  // SessionContext,
  // ExecutionResult,
  // ExecutionStatus,
  // WorkflowResult,
  // HealthCheckResult,
  // ExecutionEvent,
  // ActionType,
  // ActionConfig,
  // Condition,
  ActionEngineApiContext
  
} from "./service"