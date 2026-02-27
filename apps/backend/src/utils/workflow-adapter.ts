// src/modules/action-engine/utils/workflow-adapter.ts
import { WorkflowAction, Connection } from "../types"

export interface RawWorkflowAction {
  id?: string
  name?: string
  index?: number
  action_id?: string
  parameters?: Record<string, any>
  next_action_id?: string | null
}

export interface RawWorkflowConnection {
  source_action_id: string
  target_action_id: string
}

export interface RawWorkflowConfig {
  actions: RawWorkflowAction[]
  connections: RawWorkflowConnection[]
}

export interface FormattedWorkflow {
  id: string
  name: string
  description: string
  version: string
  actions: WorkflowAction[]
  variables?: Record<string, any>
  onError?: 'continue' | 'stop' | 'rollback'
  maxRetries?: number
}

export class WorkflowAdapter {
  
  /**
   * Convert raw workflow config to execution-ready format
   */
  static adaptWorkflowConfig(
    workflowData: any,
    parameters: Record<string, any> = {}
  ): FormattedWorkflow {
    const config = workflowData.config as RawWorkflowConfig
    
    // Build action map for quick lookup
    const actionMap = new Map<string, RawWorkflowAction>()
    config.actions.forEach((action: any) => actionMap.set(action.id, action))
    
    // Convert actions to execution format
    const actions: any = config.actions.map(rawAction => {
      // Find all connections from this action
      const outgoingConnections = config.connections.filter(
        conn => conn.source_action_id === rawAction.id
      )
      
      // Build next action IDs array
      const nextIds = outgoingConnections.map(conn => conn.target_action_id)
      
      // Get conditions from connections (if any exist in your format)
      const conditions = this.extractConditions(rawAction, actionMap)
      
      return {
        id: rawAction.id,
        name: rawAction.name,
        description: rawAction.name, // Use name as description if not available
        templateId: rawAction.action_id,
        config: rawAction.parameters,
        next: nextIds.length > 0 ? nextIds : [],
        conditions: conditions,
        retry: workflowData.retry_count > 0 ? {
          attempts: workflowData.retry_count,
          delay: 1000
        } : undefined,
        timeout: workflowData.timeout_seconds * 1000, // Convert to ms
        exitOnError: workflowData.fail_fast,
        outputMapping: this.extractOutputMapping(rawAction),
        metadata: {
          index: rawAction.index,
          originalId: rawAction.id,
          originalActionId: rawAction.action_id
        }
      }
    })
    
    // Find start action (actions with no incoming connections)
    const incomingConnections = new Set(
      config.connections.map(conn => conn.target_action_id)
    )
    const startActions = actions.filter(
      action => !incomingConnections.has(action.id)
    )
    
    // If no obvious start, use first action by index
    const startAction = startActions.length > 0 
      ? startActions[0] 
      : actions.sort((a, b) => a.metadata?.index - b.metadata?.index)[0]
    
    // Mark start action
    if (startAction) {
      startAction.metadata = {
        ...startAction.metadata,
        isStart: true
      }
    }
    
    // Extract workflow variables from parameters
    const variables = this.extractVariables(workflowData.parameters, parameters)
    
    return {
      id: workflowData.id,
      name: workflowData.name,
      description: workflowData.description || '',
      version: '1.0.0',
      actions,
      variables,
      onError: workflowData.fail_fast ? 'stop' : 'continue',
      maxRetries: workflowData.retry_count || 0
    }
  }
  
  /**
   * Extract conditions from action (if any in your format)
   */
  private static extractConditions(
    action: RawWorkflowAction,
    actionMap: Map<string, RawWorkflowAction>
  ): any[] | undefined {
    // If your format has conditions in metadata or elsewhere, extract them here
    // For now, return empty as your sample doesn't show conditions
    return undefined
  }
  
  /**
   * Extract output mapping from action parameters
   */
  private static extractOutputMapping(
    action: any
  ): Record<string, string> | undefined {
    const mapping: Record<string, string> = {}
    
    // Check for output mapping patterns in parameters
    Object.entries(action.parameters).forEach(([key, value]) => {
      if (typeof value === 'string' && value.includes('outputs.')) {
        // Extract variable name from parameter value
        const match = value.match(/\{\{outputs\.([^}]+)\}\}/)
        if (match) {
          mapping[key] = match[1]
        }
      }
    })
    
    return Object.keys(mapping).length > 0 ? mapping : undefined
  }
  
  /**
   * Extract variables from workflow parameters
   */
  private static extractVariables(
    parameters: any[] = [],
    inputValues: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = {}
    
    parameters.forEach(param => {
      if (param.name && param.name in inputValues) {
        variables[param.name] = inputValues[param.name]
      } else if (!param.required) {
        variables[param.name] = null
      }
    })
    
    return variables
  }
  
  /**
   * Get next actions for execution
   */
  static getNextActions(
    workflow: FormattedWorkflow,
    currentActionId: string,
    currentResult?: any
  ): WorkflowAction[] {
    console.log(workflow, 'workflow')
  
    const currentAction = workflow.actions.find(a => a.id === currentActionId) as any;
    if (!currentAction || !currentAction.next || currentAction.next.length === 0) {
      return []
    }
    
    // Filter next actions by conditions if they exist
    return currentAction.next
      .map(nextId => workflow.actions.find(a => a.id === nextId))
      .filter((action): action is WorkflowAction => {
        if (!action) return false
        
        // Check conditions if they exist
        if (action.conditions && currentResult) {
          // You would need to evaluate conditions here
          // For now, assume all conditions pass
          return true
        }
        
        return true
      })
  }
  
  /**
   * Get execution order (topological sort)
   */
  static getExecutionOrder(workflow: FormattedWorkflow): WorkflowAction[] {
    const graph = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    
    // Initialize
    workflow.actions.forEach(action => {
      graph.set(action.id, [])
      inDegree.set(action.id, 0)
    })
    
    // Build graph
    workflow.actions.forEach((action: any) => {
      action.next?.forEach(nextId => {
        graph.get(action.id)?.push(nextId)
        inDegree.set(nextId, (inDegree.get(nextId) || 0) + 1)
      })
    })
    
    // Find start nodes (in-degree = 0)
    const queue = workflow.actions.filter(action => inDegree.get(action.id) === 0)
    const executionOrder: WorkflowAction[] = []
    
    while (queue.length > 0) {
      const current = queue.shift()!
      executionOrder.push(current)
      
      for (const neighbor of graph.get(current.id) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1)
        if (inDegree.get(neighbor) === 0) {
          const neighborAction = workflow.actions.find(a => a.id === neighbor)
          if (neighborAction) {
            queue.push(neighborAction)
          }
        }
      }
    }
    
    return executionOrder
  }
}