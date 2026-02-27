import { WorkflowAction } from "./action"

export interface Parameter {
  id: string
  name: string
  type: string
  required: boolean
  description?: string
  options?: string[]
}

export interface ActionRelation {
  id?: string
  action_id?: string
  label: string
  metadata?: Record<string, any>
  position?: number
  type?: any
  status?: any

}

export interface WorkflowDefinition {
  actions: WorkflowAction[]
  connections: Array<{
    source_action_id: string
    target_action_id: string
    label?: string
    type?: string
  }>
}

export interface ActionNodeData {
  label: string
  index: number
  action: WorkflowAction
  onDelete?: (nodeId: string) => void
  onUpdate?: (action: WorkflowAction) => void
  onOpenSubflow?: (subflowId: string) => void
}

// Define proper types
export type ActionNode = {
  id: string
  type: 'actionNode'
  position: { x: number; y: number }
  data: any
}

export type ConnectionEdge = {
  id: string
  source: string
  target: string
  type: 'smoothstep'
  metadata?: any
  animated?: boolean
  style?: { stroke: string; strokeWidth: number; strokeDasharray?: string }
  label?: string
  data?: { label: string }
}