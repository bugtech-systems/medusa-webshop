import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Button, Container, Heading, Drawer, Select } from "@medusajs/ui"
import { Trash, X } from "lucide-react"

/* ============================================================
   Types
============================================================ */

export interface Parameter {
  id: string
  name: string
  type: string
  required: boolean
  description?: string
  options?: string[]
}

export interface WorkflowAction {
  id?: string
  action_id?: string
  name: string
  description?: string
  index: number
  parameters?: Record<string, any>
  output_template?: Record<string, any>
  context_template?: Record<string, any>
  conditions?: Record<string, any>
  parameterDefinitions?: Parameter[]
  next_action_id?: string | null
}

export interface WorkflowDefinition {
  actions: WorkflowAction[]
  connections: Array<{
    source_action_id: string
    target_action_id: string
  }>
}

interface ActionWorkflowEditorProps {
  actions: WorkflowAction[]
  availableActions: WorkflowAction[]
  onSave: (workflow: WorkflowDefinition) => Promise<void>
  setSelectedNode?: any
  selectedNode?: any
}


/* ============================================================
   Node UI with Delete Button
============================================================ */

interface ActionNodeData {
  label: string
  index: number
  action: WorkflowAction
  onDelete?: (nodeId: string) => void
}

const ActionNode = ({ data }: { data: ActionNodeData }) => {
  const [showDelete, setShowDelete] = useState(false)



  return (
    <div 
      className="px-4 py-3 rounded-md border border-ui-border-base bg-ui-bg-base shadow-sm min-w-[180px] hover:shadow-md transition-shadow relative group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Delete Button */}
      {showDelete && data.onDelete && (
        <div className="absolute -top-2 -right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onDelete?.(data.action.id)
            }}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-ui-bg-interactive text-ui-fg-on-color hover:bg-ui-bg-interactive-hover shadow-sm transition-colors"
            title="Delete node"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ui-bg-component text-ui-fg-subtle text-xs font-medium">
            {data.index}
          </div>
          <div className="font-semibold text-sm">{data.label}</div>
        </div>
      </div>
      
      {/* Input Handle - Only for non-first nodes */}
      {data.index > 1 && (
        <Handle
          id="input"
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-ui-bg-interactive border-2 border-ui-border-interactive"
        />
      )}

      {/* Output Handle - Always present except for last node */}
      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-ui-bg-interactive border-2 border-ui-border-interactive"
      />

    
    </div>
  )
}

const nodeTypes = {
  action: ActionNode,
}


/* ============================================================
   Helpers
============================================================ */

const buildNodes = (actions: WorkflowAction[], onDelete?: (nodeId: string) => void): Node<ActionNodeData>[] => {
  // Sort actions by index to ensure correct order
  const sortedActions = [...actions].sort((a, b) => a.index - b.index)
  
  return sortedActions.map((action) => ({
    id: action.id,
    type: "action",
    data: { 
      label: action.name,
      index: action.index,
      action,
      onDelete
    },
    position: {
      x: (action.index - 1) * 240, // Position based on index
      y: 0,
    },
  })) as any
}

const buildEdges = (actions: WorkflowAction[]): Edge[] => {
  const edges: Edge[] = []
  
  // Sort actions by index
  const sortedActions = [...actions].sort((a, b) => a.index - b.index)
  
  // Connect each action to the next action in sequence
  for (let i = 0; i < sortedActions.length - 1; i++) {
    const currentAction = sortedActions[i]
    const nextAction = sortedActions[i + 1]
    
    edges.push({
      id: `edge-${currentAction.id}-${nextAction.id}`,
      source: currentAction.id,
      target: nextAction.id,
      sourceHandle: "output",
      targetHandle: "input",
      type: "smoothstep",
      animated: true,
    })
  }
  
  return edges
}

const generateWorkflowDefinition = (
  nodes: Node<ActionNodeData>[],
  edges: Edge[]
): WorkflowDefinition => {
  // Sort nodes by their x position to determine order
  const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x)
  
  const actions: WorkflowAction[] = sortedNodes.map((node, index) => ({
    id: node.id,
    name: node.data.label,
    index: index + 1,
    action_id: node.id,
    parameters: node.data.action.parameters || {},
    output_template: node.data.action.output_template || {},
    conditions: node.data.action.conditions || {},
    context_template: node.data.action.context_template || {},
    next_action_id: edges.find(edge => edge.source === node.id)?.target || null
  }))
  
  const connections = edges.map(edge => ({
    source_action_id: edge.source,
    target_action_id: edge.target
  }))
  return { actions, connections }
}

/* ============================================================
   Component
============================================================ */

export const ActionWorkflowEditor = ({
  actions: initialActions,
  availableActions,
  setSelectedNode,
  selectedNode,
  onSave,
}: ActionWorkflowEditorProps) => {
  // Ensure actions are sorted by index and have sequential connections
  const [actions, setActions] = useState<WorkflowAction[]>(() => {
    const sortedActions = [...initialActions].sort((a, b) => a.index - b.index)
    
    // Ensure each action has a next_action_id pointing to the next action in sequence
    return sortedActions.map((action, index, array) => ({
      ...action,
      index: index + 1, // Ensure sequential indexing
      next_action_id: index < array.length - 1 ? array[index + 1].id : null
    }))
  })

  const [saving, setSaving] = useState(false)

  // Initialize nodes and edges state
  const initialNodes = useMemo(
    () => buildNodes(actions),
    [actions]
  )

  const initialEdges = useMemo(
    () => buildEdges(actions),
    [actions]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Generate workflow definition
  const workflow = useMemo(() => 
    generateWorkflowDefinition(nodes, edges),
    [nodes, edges]
  )

  // Define removeAction AFTER nodes and edges are initialized
  const removeAction = useCallback((actionId: string) => {
    const actionIndex = actions.findIndex(a => a.id === actionId)
    if (actionIndex === -1) return
    
    // Remove node
    const newNodes = nodes.filter(node => node.id !== actionId)
    setNodes(newNodes)
    
    // Remove connected edges
    const newEdges = edges.filter(edge => 
      edge.source !== actionId && edge.target !== actionId
    )
    
    // If we removed an action in the middle, reconnect the gap
    if (actionIndex > 0 && actionIndex < actions.length - 1) {
      const previousAction = actions[actionIndex - 1]
      const nextAction = actions[actionIndex + 1]
      
      // Add connection from previous to next action
      newEdges.push({
        id: `edge-${previousAction.id}-${nextAction.id}`,
        source: previousAction.id,
        target: nextAction.id,
        sourceHandle: "output",
        targetHandle: "input",
        type: "smoothstep",
        animated: true,
      })
    }
    
    setEdges(newEdges)
    
    // Remove from actions and re-index
    const newActions = actions
      .filter(action => action.id !== actionId)
      .map((action, index) => ({
        ...action,
        index: index + 1
      }))
    
    setActions(newActions)
    
    // Close drawer if the deleted node was selected
    if (selectedNode?.id === actionId) {
      setSelectedNode(null)
    }
  }, [actions, nodes, edges, setNodes, setEdges, selectedNode])

  // Update nodes with delete handler when removeAction changes
  useEffect(() => {
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onDelete: removeAction
      }
    }))
    setNodes(updatedNodes)
  }, [removeAction])

  // Update workflow actions state when nodes change
  useEffect(() => {
    const updatedActions = nodes
      .sort((a, b) => a.position.x - b.position.x)
      .map((node, index) => ({
        ...node.data,
        id: node.id,
        action_id: node.id,
        name: node.data.label,
        index: index + 1,
        next_action_id: edges.find(edge => edge.source === node.id)?.target || null
      }))
    
    setActions(updatedActions)
  }, [nodes, edges])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      
      // Remove any existing connections from the source
      const newEdges = edges.filter(edge => edge.source !== connection.source)
      
      // Add the new connection
      setEdges(
        addEdge(
          {
            ...connection,
            sourceHandle: "output",
            targetHandle: "input",
            type: "smoothstep",
            animated: true,
          },
          newEdges
        )
      )
    },
    [edges, setEdges]
  )

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node as Node<ActionNodeData>)
    
  }, [])

  const handleUpdateAction = useCallback((updatedAction: WorkflowAction) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === updatedAction.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: updatedAction.name,
              action: updatedAction
            }
          }
        }
        return node
      })
    )
    
    setActions((prev) =>
      prev.map((action) =>
        action.id === updatedAction.id ? updatedAction : action
      )
    )
  }, [setNodes])

  const handleSave = async () => {
    setSaving(true)
    await onSave(workflow)
    setSaving(false)
  }

  const addNewAction = useCallback(() => {
    const newId = `action_${Date.now()}`
    const newAction: WorkflowAction = {
      // id: newId,
      name: `New Action ${actions.length + 1}`,
      index: actions.length + 1,
      parameters: {},
      output_template: {},
      context_template: {},
      conditions: {},
    }
    
    const newNode: Node<ActionNodeData> = {
      id: newId,
      type: "action",
      data: {
        label: newAction.name,
        index: actions.length + 1,
        action: newAction,
        onDelete: removeAction
      },
      position: {
        x: actions.length * 240,
        y: 0,
      },
    }
    
    // Add the node
    setNodes([...nodes, newNode])
    
    // Auto-connect the last action to the new action
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]
      
      // Remove any existing connection from the last node
      const filteredEdges = edges.filter(edge => edge.source !== lastNode.id)
      
      // Add connection from last node to new node
      const newEdge = {
        id: `edge-${lastNode.id}-${newId}`,
        source: lastNode.id,
        target: newId,
        sourceHandle: "output",
        targetHandle: "input",
        type: "smoothstep",
        animated: true,
      }
      
      setEdges([...filteredEdges, newEdge])
    }
    
    setActions([...actions, newAction])
  }, [actions, nodes, edges, removeAction, setNodes, setEdges])

  // Auto-connect existing actions on initial load
  useEffect(() => {
    if (initialEdges.length === 0 && actions.length > 1) {
      const edges = buildEdges(actions)
      setEdges(edges)
    }
  }, [actions, initialEdges.length, setEdges])
  
  
  
  
  
  
  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <Heading level="h2">Workflow Editor</Heading>
        
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={addNewAction}
          >
            Add Action
          </Button>
          <Button
            size="small"
            isLoading={saving}
            onClick={handleSave}
          >
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="h-[560px] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
          onNodesDelete={(deletedNodes) => {
            // Use the removeAction function that's now defined
            deletedNodes.forEach(node => removeAction(node.id))
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

 
      {/* Workflow Summary */}
      <div className="p-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h3">Workflow Summary</Heading>
          <div className="text-sm text-ui-fg-muted">
            {workflow.actions.length} actions • {workflow.connections.length} connections
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-ui-fg-subtle mb-3">Actions Sequence</div>
            <div className="space-y-2">
              {workflow.actions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 p-3 bg-ui-bg-subtle rounded-md">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ui-bg-component text-ui-fg-subtle text-xs font-medium">
                    {action.index}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{action.name}</div>
                    {action.parameters && Object.keys(action.parameters).length > 0 && (
                      <div className="text-xs text-ui-fg-muted">
                        {Object.keys(action.parameters).length} parameter(s) configured
                      </div>
                    )}
                  </div>
                  <Button
                    size="small"
                    variant="transparent"
                    className="text-ui-fg-muted hover:text-ui-fg-error"
                    onClick={() => removeAction(action.id)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-ui-fg-subtle mb-3">Connections</div>
            <div className="space-y-2">
              {workflow.connections.length > 0 ? (
                workflow.connections.map((conn, idx) => {
                  const sourceAction = workflow.actions.find(a => a.id === conn.source_action_id)
                  const targetAction = workflow.actions.find(a => a.id === conn.target_action_id)
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-ui-bg-subtle rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ui-bg-component text-ui-fg-subtle text-xs font-medium">
                          {sourceAction?.index}
                        </div>
                        <div className="text-sm">{sourceAction?.name}</div>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 20 20" 
                          fill="none" 
                          className="text-ui-fg-muted"
                        >
                          <path 
                            d="M7 15L13 10L7 5" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-ui-bg-component text-ui-fg-subtle text-xs font-medium">
                          {targetAction?.index}
                        </div>
                        <div className="text-sm">{targetAction?.name}</div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-4 text-center text-ui-fg-muted bg-ui-bg-subtle rounded-md">
                  No connections yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}