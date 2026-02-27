import { HttpTypes } from "@medusajs/types"

export interface AdminAction {
  id: string
  name: string
  handle?: string
  description?: string
  type: string
  status: "draft" | "active" | "inactive" | "archived"
  payload?: Record<string, any>
  configuration?: Record<string, any>
  workflow?: {
    nodes: Array<{
      id: string
      type: string
      data: Record<string, any>
      position: { x: number; y: number }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      label?: string
    }>
  }
  metadata?: Record<string, any>
  version?: number
  created_by?: string
  last_executed_at?: string
  created_at: string
  updated_at: string
}

export interface AdminActionListResponse {
  actions: AdminAction[]
  count: number
  offset: number
  limit: number
}

export interface AdminActionResponse {
  action: AdminAction
}

export interface AdminCreateAction {
  name: string
  description?: string
  handle?: string
  type: string
  status?: "draft" | "active" | "inactive"
  payload?: Record<string, any>
  configuration?: Record<string, any>
  workflow?: {
    nodes: Array<{
      id: string
      type: string
      data: Record<string, any>
      position: { x: number; y: number }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      label?: string
    }>
  }
  metadata?: Record<string, any>
}

export interface AdminUpdateAction {
  name?: string
  description?: string
  type?: string
  status?: "draft" | "active" | "inactive" | "archived"
  payload?: Record<string, any>
  configuration?: Record<string, any>
  workflow?: {
    nodes: Array<{
      id: string
      type: string
      data: Record<string, any>
      position: { x: number; y: number }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      label?: string
    }>
  }
  metadata?: Record<string, any>
  version?: number
}

export interface AdminExecuteAction {
  input?: Record<string, any>
  context?: Record<string, any>
  async?: boolean
}


export interface AdminActionTemplate {
  id: string
  name: string
  description?: string | null
  handle: string
  status: 'draft' | 'active' | 'inactive' | 'archived'
  type: 'DB_OPERATION' | 'API_CALL' | 'AI_ACTION' | 'WORKFLOW' | 'SCRIPT'
  config?: Record<string, any> | null
  order_index?: number | null
  dependencies?: string[] | null
  conditions?: Record<string, any> | null
  output_template?: Record<string, any> | null
  parameters?: Record<string, any>[] | null
  context_as?: string | null
  context_template?: Record<string, any> | null
  timeout_seconds?: number
  retry_count?: number
  fail_fast?: boolean
  pre_hooks?: Record<string, any>[] | null
  post_hooks?: Record<string, any>[] | null
  success_hooks?: Record<string, any>[] | null
  error_hooks?: Record<string, any>[] | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface AdminActionTemplateListResponse {
  action_templates: AdminActionTemplate[]
  count: number
  offset: number
  limit: number
}

export interface AdminActionTemplateResponse {
  action_template: AdminActionTemplate
}

export interface AdminCreateActionTemplate {
  name: string
  description?: string | null
  handle?: string
  status?: 'draft' | 'active' | 'inactive' | 'archived'
  type: 'DB_OPERATION' | 'API_CALL' | 'AI_ACTION' | 'WORKFLOW' | 'SCRIPT'
  config?: Record<string, any> | null
  order_index?: number | null
  dependencies?: string[] | null
  conditions?: Record<string, any> | null
  output_template?: Record<string, any> | null
  context_as?: string | null
  context_template?: Record<string, any> | null
  timeout_seconds?: number
  retry_count?: number
  fail_fast?: boolean
  pre_hooks?: Record<string, any>[] | null
  post_hooks?: Record<string, any>[] | null
  success_hooks?: Record<string, any>[] | null
  error_hooks?: Record<string, any>[] | null
  metadata?: Record<string, any> | null
}

export interface AdminUpdateActionTemplate {
  name?: string
  description?: string | null
  handle?: string
  status?: 'draft' | 'active' | 'inactive' | 'archived'
  type?: 'DB_OPERATION' | 'API_CALL' | 'AI_ACTION' | 'WORKFLOW' | 'SCRIPT'
  config?: Record<string, any> | null
  order_index?: number | null
  dependencies?: string[] | null
  conditions?: Record<string, any> | null
  output_template?: Record<string, any> | null
  parameters?: Record<string, any>[] | null
  context_as?: string | null
  context_template?: Record<string, any> | null
  timeout_seconds?: number
  retry_count?: number
  fail_fast?: boolean
  pre_hooks?: Record<string, any>[] | null
  post_hooks?: Record<string, any>[] | null
  success_hooks?: Record<string, any>[] | null
  error_hooks?: Record<string, any>[] | null
  metadata?: Record<string, any> | null
}



/* ============================================================
   Types
============================================================ */

export interface AdminExecuteActionParams {
  parameters: Record<string, any>
}

export interface AdminExecuteActionResponse {
  execution_id: string
}

export interface AdminActionExecutionLog {
  message: string
  timestamp: string
  level?: "info" | "error"
}

export interface AdminActionExecutionHistoryItem {
  id: string
  created_at: string
  status: "running" | "success" | "failed"
  parameters: Record<string, any>
  result?: any
}


export interface WorkflowAction {
  id: string
  name: string
  index: number
  action_id: string
  parameters: Record<string, any>
  next_action_id: string | null
  conditions?: Condition[]
  retry_config?: RetryConfig
  timeout?: number
  exit_on_error?: boolean
  output_mapping?: Record<string, string>
  metadata?: Record<string, any>
}

export interface Condition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists'
  value: any
  logical?: 'AND' | 'OR'
}

export interface RetryConfig {
  attempts: number
  delay: number
  backoff_multiplier?: number
}



export interface Connection {
  id?: string
  source: string
  target: string
  condition?: Condition[]
  metadata?: any
  style?: any
  label?: any
}
