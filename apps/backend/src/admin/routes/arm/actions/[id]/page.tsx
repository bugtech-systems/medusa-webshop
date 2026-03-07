import { removeEmptyObjects } from '../../../../../utils/helpers';
import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Bolt, 
  Calendar, 
  CogSixTooth,
  MediaPlay,
  Adjustments,
  Book,
  RocketLaunch
} from "@medusajs/icons"
import {
  Node,
} from "@xyflow/react"
import {
  Badge,
  Container,
  Heading,
  Tabs,
  Text,
  Button,
  toast,
  CodeBlock,
} from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useAction, useActions, useUpdateActionTemplate } from "../../../../hooks/api/actions"
import { ActionConfigurationForm } from "../components/action-configuration-form"
import { ActionPayloadBuilder } from "../components/action-payload-builder"
import { ExecuteActionDrawer } from "../components/action-execution-drawer"
import { ActionWorkflowEditor } from "../components/action-workflow-graph"
import { ActionDetailsTab } from '../components/action-details-container';
import WorkflowActionDrawer from '../components/workflow-action-drawer';
import { Code, File, Workflow } from 'lucide-react';


export interface Parameter {
  id: string
  name: string
  type: string
  required: boolean
  description?: string
  options?: string[]
}

export interface WorkflowAction {
  id: string
  name: string
  description?: string
  index: number
  parameters?: Record<string, any>
  output_template?: any
  context_template?: any
  parameterDefinitions?: Parameter[]
  next_action_id?: string | null
}


interface ActionNodeData {
  label: string
  index: number
  action: WorkflowAction
  onDelete?: (nodeId: string) => void
}

const ActionDetailPage = () => {
  const { id } = useParams()
  const { data, isLoading, isError, refetch } = useAction(id!) as any
  const { mutateAsync: updateAction, isPending } = useUpdateActionTemplate(id!)
  const [selectedNode, setSelectedNode] = useState<Node<any> | null>(null)
  const [newActions, setNewActions] = useState<any>([])

  
    const { data: actions } = useActions()

  const [editMode, setEditMode] = useState(false)



  if (isLoading) {
    return (
      <Container className="flex items-center justify-center h-screen">
        <Text>Loading action details...</Text>
      </Container>
    )
  }

  if (isError || !data?.data) {
    return (
      <Container className="flex items-center justify-center h-screen">
        <Text className="text-ui-fg-subtle">
          Action not found or error loading details.
        </Text>
      </Container>
    )
  }

  const action = data.data
  const typeIcons = {
    DB_OPERATION: Book,
    API_CALL: RocketLaunch,
    AI_ACTION: Bolt,
    WORKFLOW: Workflow,
    SCRIPT: Code,
  }
  const TypeIcon = typeIcons[action.type as keyof typeof typeIcons] || Bolt

  

let actionsData = action?.config?.actions ? action?.config?.actions?.map(act => {
                    let actionData = actions?.actions.find(a => a.id == act.action_id) as any;
                    console.log(actionData, removeEmptyObjects(act), 'AACTT')
                    if(actionData){
                     return { id: act.action_id, output_template: actionData.output_template, context_template: actionData.context_template, conditions: actionData.conditions, ...act, name: actionData.name, description: actionData.description }
                    } else {
                     return act
                    }
                }) : []

 

  const handleSave = async (config) => {


    try {
      await updateAction({
        config: config
      })
      toast.success('Success', {
        description: "Configuration updated successfully",
      })
      
      
      await refetch();

      
    } catch (error) {
      toast.error('Error', {
        description: "Failed to update configuration",
      })
    }
  }



  const handleUpdate = (updatedAction) => {
     let newConfig = []
     
    newConfig = action.config.actions.map(act => {
      if(act.id == updatedAction.id){
        return { ...act, ...updatedAction }
      } else if (String(act.id).includes('action')) {
        return {...act, ...updatedAction}
      } else {
        return act
      }
    })
    handleSave({...action.config, actions: newConfig})
    
  }
  
  


  return (
    <>
         {/* Action Drawer */}
      <WorkflowActionDrawer
        action={selectedNode?.data.action || null}
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateAction={handleUpdate}
        availableActions={actions?.actions || []}
      />

      <Container className="p-8">
        {/* Header with Basic Details */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ui-bg-base-component">
              <TypeIcon className="h-6 w-6 text-ui-fg-subtle" />
            </div>
            <div>
              <Heading className="mb-2">{action.name}</Heading>
              <div className="flex items-center gap-4">
                <Badge
                  color={
                    action.status === "active"
                      ? "green"
                      : action.status === "draft"
                      ? "orange"
                      : action.status === "inactive"
                      ? "grey"
                      : "red"
                  }
                >
                  {action.status}
                </Badge>
                <Badge size="small" variant="outlined">
                  {action.type}
                </Badge>
                <div className="flex items-center gap-1 text-ui-fg-subtle">
                  <Calendar className="h-4 w-4" />
                  <Text size="small">
                    Created {new Date(action.created_at).toLocaleDateString()}
                  </Text>
                </div>
                {action.handle && (
                  <div className="flex items-center gap-1 text-ui-fg-subtle">
                    <Code className="h-4 w-4" />
                    <Text size="small" className="font-mono">
                      {action.handle}
                    </Text>
                  </div>
                )}
              </div>
              {action.description && (
                <Text className="mt-2 text-ui-fg-subtle">{action.description}</Text>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
          <ExecuteActionDrawer
            action={action}
          >
            <Button variant="secondary" size="small">
              <MediaPlay /> Test Action
            </Button>
            </ExecuteActionDrawer>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <Tabs.List>
            <Tabs.Trigger value="details">
              <File className="h-4 w-4 mr-2" />
              Details
            </Tabs.Trigger>
            <Tabs.Trigger value="configuration">
              <CogSixTooth className="h-4 w-4 mr-2" />
              Configuration
            </Tabs.Trigger>
            <Tabs.Trigger value="payload">
              <Code className="h-4 w-4 mr-2" />
              Payload Builder
            </Tabs.Trigger>
            {action.type == 'WORKFLOW' &&
            <Tabs.Trigger value="workflow">
              <Workflow className="h-4 w-4 mr-2" />
              Workflow
            </Tabs.Trigger>
            }
          </Tabs.List>

          {/* Details Tab */}
      <Tabs.Content value="details" className="pt-6">
      <ActionDetailsTab
              availableActions={actions?.actions || []}
              action={action} 
              editMode={editMode}
              onEditModeChange={setEditMode}  
      />
</Tabs.Content>

          {/* Configuration Tab */}
          <Tabs.Content value="configuration" className="pt-6">
            <ActionConfigurationForm
              action={action} 
              editMode={editMode}
              onEditModeChange={setEditMode}
            />
          </Tabs.Content>

          {/* Payload Builder Tab */}
          <Tabs.Content value="payload" className="pt-6">
            <ActionPayloadBuilder 
              action={action}
              editMode={editMode}
              onEditModeChange={setEditMode}
            />
          </Tabs.Content>

          {/* Workflow Tab */}
          <Tabs.Content value="workflow" className="pt-6">
              <ActionWorkflowEditor
                  defaultAction={action}
                  actions={actionsData}
                  availableActions={actions?.actions || []}
                  onSave={handleSave}
                  setSelectedNode={setSelectedNode}
                  selectedNode={selectedNode}
                />
          </Tabs.Content>
        </Tabs>
      </Container>
    </>
  )
}



export default ActionDetailPage