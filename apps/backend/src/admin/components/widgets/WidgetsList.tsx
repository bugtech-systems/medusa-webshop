"use client"

import React, { useState, useEffect } from "react"
import {
  Container,
  Heading,
  Text,
  Button,
  Table,
  Badge,
  Toaster,
  Drawer,
  Prompt,
  DropdownMenu,
  IconButton,
  Input,
  Label,
  Select,
  Textarea,
  FocusModal,
  ProgressTabs,
  toast,
  Tooltip,
} from "@medusajs/ui"
import {
  Plus,
  EllipsisHorizontal,
  PencilSquare,
  Trash,
  Eye,
  DocumentText,
  ChartBar,
  ListBullet,
  Clock,
  Star,
} from "@medusajs/icons"
import {Copy, Table as TableIcon} from 'lucide-react';
import { useExecuteAction, useExecution } from "../../hooks/api/actions"
import { Widget } from "../../components/dashboard/types"
import { 
  getWidgetTypeName, 
  getWidgetIcon,
  getAvailableWidgetTypes,
  getDefaultConfig,
  validateWidgetConfig,
  getWidgetSizes
} from "../../utils/dashboards/widgetHelpers"
import { 
  AddWidgetModal, 
  EditWidgetDrawer, 
  DeleteWidgetPrompt 
} from "./modals"





interface WidgetsListProps {
  tabId?: string
  onWidgetUpdate?: (widgets: Widget[]) => void
}

// Widget type icons mapping
const widgetTypeIcons: Record<string, any> = {
  stat: DocumentText,
  chart: ChartBar,
  table: TableIcon,
  list: ListBullet,
  progress: Clock,
  kpi: Star,
}






// Main WidgetsList Component
export const WidgetsList = ({  onWidgetUpdate }: WidgetsListProps) => {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null)
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [deletePromptOpen, setDeletePromptOpen] = useState(false)

  // Fetch widgets for this tab
  const { data: widgetsData, isPending: isLoading, refetch: fetchWidgets } = 
    useExecution('get-dashboard-widgets')

  const { mutateAsync: createWidget } = useExecuteAction('create-widget')
  const { mutateAsync: updateWidget } = useExecuteAction('update-widget')
  const { mutateAsync: deleteWidget } = useExecuteAction('delete-widget')
  const { mutateAsync: duplicateWidget } = useExecuteAction('duplicate-widget')

  // Load widgets
  useEffect(() => {
    loadWidgets()
  }, [])

  const loadWidgets = async () => {
    try {
      const {data: res} = await fetchWidgets();
      if (res?.data?.length) {
        setWidgets(res.data)
      }
    } catch (error) {
      console.error("Failed to load widgets:", error)
      toast.error("Failed to load widgets")
    }
  }


console.log(widgetsData, 'WIDDGE')

  const handleAddWidget = async (widgetData: Partial<Widget>) => {
    try {
     console.log(widgetData, 'ADD WWIDGE')

      const newWidget = {
        ...widgetData,
        label: widgetData.title,
        metadata: {type: widgetData.type, description: widgetData.description},
        configuration: widgetData.config,
        action_id: widgetData.config?.action_id
      }
      
      await createWidget({ parameters: newWidget })
      await loadWidgets()
      onWidgetUpdate?.(widgets)
    } catch (error) {
      console.error("Failed to create widget:", error)
      toast.error("Failed to create widget")
    }
  }

  const handleUpdateWidget = async (widgetId: string, updates: Partial<Widget>) => {
    try {
      await updateWidget({ 
        id: widgetId,
        parameters: updates 
      })
      await loadWidgets()
      onWidgetUpdate?.(widgets)
    } catch (error) {
      console.error("Failed to update widget:", error)
      toast.error("Failed to update widget")
    }
  }

  const handleDeleteWidget = async () => {
    if (!selectedWidget) return
    
    try {
      await deleteWidget({ parameters: { id: selectedWidget.id }})
      await loadWidgets()
      onWidgetUpdate?.(widgets)
      setDeletePromptOpen(false)
      setSelectedWidget(null)
      toast.success("Widget deleted successfully")
    } catch (error) {
      console.error("Failed to delete widget:", error)
      toast.error("Failed to delete widget")
    }
  }

  const handleDuplicateWidget = async (widgetId: string) => {
    try {
      await duplicateWidget({ id: widgetId })
      await loadWidgets()
      onWidgetUpdate?.(widgets)
      toast.success("Widget duplicated successfully")
    } catch (error) {
      console.error("Failed to duplicate widget:", error)
      toast.error("Failed to duplicate widget")
    }
  }

  const findFirstAvailablePosition = (
    widgets: Widget[],
    gridColumns: number,
    width: number,
    height: number
  ) => {
    // Simple positioning logic - can be enhanced
    const maxY = Math.max(...widgets.map(w => w.position.y + w.position.h), 0)
    return { x: 0, y: maxY, w: width, h: height }
  }

  const getWidgetTypeBadge = (type: string) => {
    const colors: Record<string, "blue" | "green" | "red" | "orange" | "purple"> = {
      stat: "blue",
      chart: "green",
      table: "purple",
      list: "orange",
      progress: "red",
      kpi: "blue",
    }
    return colors[type] || "grey"
  }

  return (
    <Container>
      <Toaster />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Heading level="h1" className="text-2xl font-semibold">
            Widgets
          </Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Manage widgets for this dashboard tab
          </Text>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </Button>
      </div>

      {/* Widgets Table */}
      <div className="border border-ui-border-base rounded-lg overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Widget Name</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              {/* <Table.HeaderCell>Size</Table.HeaderCell> */}
              {/* <Table.HeaderCell>Position</Table.HeaderCell> */}
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Last Updated</Table.HeaderCell>
              <Table.HeaderCell className="w-[50px]">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-border-interactive" />
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : widgets?.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12">
                    <DocumentText className="w-12 h-12 text-ui-fg-subtle mb-4" />
                    <Text className="text-ui-fg-subtle mb-2">No widgets yet</Text>
                    <Button 
                      variant="secondary" 
                      size="small"
                      onClick={() => setAddModalOpen(true)}
                    >
                      Add your first widget
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : (
              widgets.map((widget) => {
                const Icon = widgetTypeIcons[widget.type] || DocumentText
                return (
                  <Table.Row key={widget.id}>
                    <Table.Cell>
                      <div>
                        <Text weight="plus" size="small">
                          {widget.label}
                        </Text>
                        {widget.description && (
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            {widget.description}
                          </Text>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={getWidgetTypeBadge(widget.type)} size="small" className="capitalize">
                        <Icon className="w-3 h-3 mr-1" />
                        {widget.metadata?.type}
                      </Badge>
                    </Table.Cell>
                    {/* <Table.Cell>
                      <Badge size="small" color="grey">
                        {widget.size || "medium"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        ({widget.position.x}, {widget.position.y}) • {widget.position.w}×{widget.position.h}
                      </Text>
                    </Table.Cell> */}
                    <Table.Cell>
                      <Badge size="small" color="green">
                        Active
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {new Date().toLocaleDateString()}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <IconButton size="small" variant="secondary">
                            <EllipsisHorizontal className="w-4 h-4" />
                          </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item 
                            className="gap-2"
                            onClick={() => {
                              setSelectedWidget(widget)
                              setEditDrawerOpen(true)
                            }}
                          >
                            <PencilSquare className="w-4 h-4" />
                            Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Item 
                            className="gap-2"
                            onClick={() => handleDuplicateWidget(widget.id)}
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item 
                            className="gap-2 text-ui-tag-red-text"
                            onClick={() => {
                              setSelectedWidget(widget)
                              setDeletePromptOpen(true)
                            }}
                          >
                            <Trash className="w-4 h-4" />
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                )
              })
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddWidget}
      />

      {/* Edit Widget Drawer */}
      <EditWidgetDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        widget={selectedWidget}
        onUpdate={handleUpdateWidget}
      />

      {/* Delete Confirmation Prompt */}
      <Prompt open={deletePromptOpen} onOpenChange={setDeletePromptOpen}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Delete Widget</Prompt.Title>
            <Prompt.Description>
              Are you sure you want to delete "{selectedWidget?.title}"? 
              This action cannot be undone.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel onClick={() => setDeletePromptOpen(false)}>
              Cancel
            </Prompt.Cancel>
            <Prompt.Action onClick={handleDeleteWidget}>
              Delete
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}


