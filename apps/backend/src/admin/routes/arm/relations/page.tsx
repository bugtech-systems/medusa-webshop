"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { AiAssistent } from "@medusajs/icons"
import { SidebarProvider } from "../../../lib/context/sidebar-context"
import WorkflowEditor from "../components/workflow-canvas"
import { useEffect, useState, useCallback } from "react"
import { useWorkflows, useUpdateWorkflow } from "../../../hooks/api/workflows"
import { WorkflowDefinition, ActionRelation, Connection, ActionNode, ConnectionEdge } from "../../../../types"
import { useExecuteAction } from "../../../hooks/api/actions"
import { toast } from "@medusajs/ui"
import { Position } from "@xyflow/react"



const ActionFlowsPage = () => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [workflowNodes, setWorkflowNodes] = useState<ActionNode[]>([])
  const [workflowEdges, setWorkflowEdges] = useState<ConnectionEdge[]>([])
  
  // Fetch workflows (actions)
  const { data: workflowsData, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows() as any
  
  // Fetch connections data
  const { data: connectionsData, mutateAsync: fetchConnections, isLoading: connectionsLoading } = 
    useExecuteAction('get-relation-connections') as any
  const { mutateAsync: createConnection, isLoading: isCreating } = 
    useExecuteAction('find-or-create-connection') as any
  const { mutateAsync: createActionRelation, isLoading: isCreatingAction } = 
    useExecuteAction('create-relation-workflow') as any
  const { mutateAsync: deleteRelation, isLoading: deletingRelation } = 
    useExecuteAction('delete-relation-and-connections') as any
  const { mutateAsync: deleteConnection, isLoading: deletingConnection } = 
    useExecuteAction('delete-action-relation-connection') as any

  // Update workflow mutation
  const { mutate: updateWorkflow, isLoading: isUpdating } = useUpdateWorkflow(selectedWorkflowId || "")

  // Transform actions and connections into workflow definition
  const prepareWorkflowDefinition = useCallback((actions: ActionRelation[], connections: Connection[]) => {
       const startNode: ActionNode = {
            id: 'start-node',
            type: 'actionNode',
            position: { x: 150, y: 150 },
            data: {
              id: 'start-node',
              label: 'Start Alayon',
              type: 'start',
              status: 'active',
              config: {},
              isStartNode: true,
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            },
          } 
          
    
    
    if (!actions?.length) return { nodes: [startNode], edges: [] }



    // Create nodes from actions
    const nodes: ActionNode[] = actions.map((action: any, index) => ({
      id: action.id,
      type: 'actionNode',
      position: action.metadata.position || { 
        x: 200 + ((index + 1) % 3) * 250, 
        y: 150 + Math.floor((index + 1) / 3) * 100 
      },
      data: {
        ...action,
        onClick: (id: string) => handleNodeClick(id)
      }
    }))

    // Create edges from connections
    const edges: ConnectionEdge[] = connections?.map((conn) => ({
      id: conn.id || `edge-${conn.source}-${conn.target}`,
      source: conn.source,
      target: conn.target,
      ...conn.metadata
    })) || []
    
       
          

    return { nodes: [startNode, ...nodes], edges }
  }, [])

  // Handle node click to edit
  const handleNodeClick = (id: string) => {
    const node = workflowNodes.find(n => n.id === id)
    if (node) {
      // You can implement node editing logic here
      console.log('Edit node:', node)
    }
  }

  // Fetch connections when component mounts
  useEffect(() => {
    const loadConnections = async () => {
      try {
        await fetchConnections()
      } catch (error) {
        console.error('Failed to fetch connections:', error)
        toast.error('Failed to load workflow connections')
      }
    }
    loadConnections()
  }, [fetchConnections])

  // Process and set workflow data when both actions and connections are available
  useEffect(() => {
    if (workflowsData?.data && connectionsData?.data) {
      const { nodes, edges } = prepareWorkflowDefinition(
        workflowsData.data,
        connectionsData.data
      )
      setWorkflowNodes(nodes)
      setWorkflowEdges(edges)
    }
  }, [workflowsData, connectionsData, prepareWorkflowDefinition])

  // Handle saving workflow
  const handleSaveWorkflow = async (nodes: ActionNode[], edges: ConnectionEdge[]) => {
    if (!selectedWorkflowId) {
      toast.error('No workflow selected')
      return
    }

    try {
      // Prepare workflow definition for saving
      const definition: WorkflowDefinition = {
        actions: nodes.map(node => ({
          ...node.data,
          position: node.position
        })),
        connections: edges.map(edge => ({
          source_action_id: edge.source,
          target_action_id: edge.target,
          label: '',
          style: edge.style?.strokeDasharray === '5,5' ? 'dashed' : 'solid'
        }))
      }

      await updateWorkflow(definition)
      toast.success('Workflow saved successfully')
    } catch (error) {
      console.error('Failed to save workflow:', error)
      toast.error('Failed to save workflow')
    }
  }

  // Handle node changes (add, update, delete)
  const handleNodesChange = (nodes: ActionNode[]) => {
    setWorkflowNodes(nodes)
  }

  // Handle edge changes (add, update, delete)
  const handleEdgesChange = (edges: ConnectionEdge[]) => {
    setWorkflowEdges(edges)
  }

  // Handle creating new node from edge drop
  const handleCreateNodeFromEdge = async (sourceNodeId: string, position: { x: number; y: number }, actionData) => {
    // This would typically open a modal/drawer to configure the new action
    // For now, we'll create a placeholder
    const newNode: ActionNode = {
      id: actionData.id,
      type: 'actionNode',
      position,
      data: {
        id: actionData.id,
        label: actionData.label,
        type: actionData?.type,
        status: 'draft',
        onClick: handleNodeClick
      }
    }

  console.log(sourceNodeId, actionData, 'ON CREATE NODE')

    setWorkflowNodes(prev => [...prev, newNode])
    

    
   let {success, data} = await createActionRelation({
        parameters: {
          label: actionData.label,
          action_id: actionData.id,
          metadata: newNode
        }
    })
    
        if(!success) return;
    
    
    
            // Create edge from source to new node
    const newEdge: ConnectionEdge = {
      id: `edge-${sourceNodeId}-${data.id}`,
      source: sourceNodeId,
      target: data.id,
      type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4b5563',
          width: 12,
          height: 12,
        },
        style: { 
          stroke: '#4b5563', 
          strokeWidth: 2,
        },
        data: {
          style: 'solid',
        },
      
    }
    
        setWorkflowEdges(prev => [...prev, newEdge])



    
  return data

     
    
  }

  // Handle adding new action from button
  const handleAddAction = (position: { x: number; y: number }) => {
    const newNode: ActionNode = {
      id: `new-action-${Date.now()}`,
      type: 'actionNode',
      position,
      data: {
        id: `new-action-${Date.now()}`,
        label: 'New Action',
        type: 'send_notification',
        status: 'draft',
        config: {},
        onClick: handleNodeClick
      }
    }
    setWorkflowNodes(prev => [...prev, newNode])
  }
  
    // Handle adding new action from button
  const handleAddConnection = async (connection: any) => {
      console.log(connection, 'CONP')
      let { id, target, source, ...metadata} = connection;
      await createConnection({
        parameters: {
        source:  connection.source,
        target: connection.target,
        metadata
        }
      })
      
      
  }
  
  const handleDeleteNode = async (n) => {
      console.log(n, 'DELETING NODE');
      await deleteRelation({parameters: {id: n}})
  }
  
 const handleDeleteConnection = async (n) => {
      console.log(n, 'DELETE CONNECTION');
      await deleteConnection({parameters: {id: n}})

  }
  
  
  // Handle opening subflow
  const handleOpenSubflow = (subflowId: string) => {
    setSelectedWorkflowId(subflowId)
    // You might want to fetch the subflow data here
  }

  // Log data for debugging
  useEffect(() => {
    if (workflowsData || connectionsData) {
      console.log('Workflows Data:', workflowsData)
      console.log('Connections Data:', connectionsData)
      console.log('Prepared Nodes:', workflowNodes)
      console.log('Prepared Edges:', workflowEdges)
    }
  }, [workflowsData, connectionsData, workflowNodes, workflowEdges])

  const isLoading = workflowsLoading || connectionsLoading




  return (
    <SidebarProvider>
      <main className="relative min-h-screen flex">
        {/* Workflow Editor with all props */}
        <WorkflowEditor
          nodes={workflowNodes}
          edges={workflowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onEdgeConnect={handleAddConnection}
          onSave={handleSaveWorkflow}
          onAddAction={handleAddAction}
          onNodeDelete={handleDeleteNode}
          onEdgeDelete={handleDeleteConnection}
          onCreateNodeFromEdge={handleCreateNodeFromEdge}
          onOpenSubflow={handleOpenSubflow}
          selectedWorkflowId={selectedWorkflowId}
          isLoading={isLoading}
          isSaving={isUpdating}
        />
      </main>
    </SidebarProvider>
  )
}

export default ActionFlowsPage

export const config = defineRouteConfig({
  label: "Relations",
  rank: 3,
  icon: AiAssistent,
})