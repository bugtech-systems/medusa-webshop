// src/admin/components/actions/action-details-tab.tsx
import React, { useState, useEffect, useRef } from "react"
import {
  Container,
  Heading,
  Button,
  CodeBlock,
  Text,
  Textarea,
  Input,
  Label,
  Select,
  Badge,
  Switch,
  toast,
  Alert,
  Tooltip,
  Kbd
} from "@medusajs/ui"
import { GripVertical, Copy, Check, Clipboard} from "lucide-react"

import { 
  Pencil, 
  // Check, 
  X, 
  HandTruck,
  Trash,
  ExclamationCircleSolid
} from "@medusajs/icons"
import { useForm, FormProvider, useFieldArray, Controller, useFormContext } from "react-hook-form"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useUpdateActionTemplate } from "../../../../hooks/api/actions"
import { JsCodeEditor } from "../../../../components/editor/js-code-editor"
import { DatabaseOperationFields } from "./action-details-form/database-operation-form"

/* ============================================================
   Types
============================================================ */

interface ActionDetailsTabProps {
  action: any
  editMode: boolean
  onEditModeChange: (editMode: boolean) => void
  availableActions?: Array<{ id: string; name: string; description?: string }>
}

interface ActionFormData {
  id?: string
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

/* ============================================================
   Copy/Paste Button Component
============================================================ */

interface CopyPasteButtonProps {
  editMode: boolean
  formData: ActionFormData
  onPaste: (data: any) => void
}

const CopyPasteButton = ({ editMode, formData, onPaste }: CopyPasteButtonProps) => {
  const [copySuccess, setCopySuccess] = useState(false)
  const [pasteSuccess, setPasteSuccess] = useState(false)

  const handleCopy = async () => {
    try {
      // Create a complete copy of the form data with all fields
      const copyData = {
        name: formData.name,
        handle: formData.handle,
        description: formData.description,
        status: formData.status,
        type: formData.type,
        config: formData.config,
        order_index: formData.order_index,
        dependencies: formData.dependencies,
        conditions: formData.conditions,
        output_template: formData.output_template,
        parameters: formData.parameters,
        context_as: formData.context_as,
        context_template: formData.context_template,
        timeout_seconds: formData.timeout_seconds,
        retry_count: formData.retry_count,
        fail_fast: formData.fail_fast,
        pre_hooks: formData.pre_hooks,
        post_hooks: formData.post_hooks,
        success_hooks: formData.success_hooks,
        error_hooks: formData.error_hooks,
        metadata: formData.metadata,
        // Add metadata for tracking
        _copiedAt: new Date().toISOString(),
        _version: "1.0"
      }

      await navigator.clipboard.writeText(JSON.stringify(copyData, null, 2))
      
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      
      toast.success("Copied to clipboard", {
        description: "Complete action configuration has been copied"
      })
    } catch (error) {
      toast.error("Copy failed", {
        description: "Failed to copy to clipboard"
      })
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      
      if (!text) {
        toast.error("Clipboard is empty")
        return
      }

      const parsedData = JSON.parse(text)
      
      // Validate required fields
      if (!parsedData.name) {
        toast.error("Invalid format", {
          description: "Copied data must contain a name field"
        })
        return
      }

      onPaste(parsedData)
      
      setPasteSuccess(true)
      setTimeout(() => setPasteSuccess(false), 2000)
      
      toast.success("Pasted from clipboard", {
        description: "Form has been populated with copied configuration"
      })
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON", {
          description: "Clipboard content is not valid JSON"
        })
      } else {
        toast.error("Paste failed", {
          description: "Failed to read from clipboard"
        })
      }
    }
  }

  if (editMode) {
    return (
      <Tooltip content="Paste configuration from clipboard">
        <Button
          variant="secondary"
          size="small"
          type="button"
          onClick={handlePaste}
          className="gap-2"
        >
          {pasteSuccess ? (
            <Check size={16} className="text-ui-fg-success" />
          ) : (
            <Clipboard size={16} />
          )}
          <span>Paste</span>
          <Kbd className="ml-1">⌘V</Kbd>
        </Button>
      </Tooltip>
    )
  }

  return (
    <Tooltip content="Copy configuration to clipboard">
      <Button
        variant="secondary"
        size="small"
        type="button"
        onClick={handleCopy}
        className="gap-2"
      >
        {copySuccess ? (
          <Check size={16} className="text-ui-fg-success" />
        ) : (
          <Copy size={16} />
        )}
        <span>Copy</span>
        <Kbd className="ml-1">⌘C</Kbd>
      </Button>
    </Tooltip>
  )
}


export const ActionDetailsTab = ({
  action,
  editMode,
  onEditModeChange,
  availableActions = [],
}: ActionDetailsTabProps) => {
  const { mutateAsync: updateAction, isPending } = useUpdateActionTemplate(action.id)

 const methods = useForm<ActionFormData>({
    defaultValues: {
      name: action.name || "",
      description: action.description || "",
      handle: action.handle || "",
      status: action.status || "draft",
      type: action.type || "API_CALL",
      config: action.config || {},
      conditions: action.conditions || {},
      output_template: action.output_template || {},
      parameters: action.parameters || [],
      context_as: action.context_as || null,
      context_template: action.context_template || {},
      timeout_seconds: action.timeout_seconds || 30,
      retry_count: action.retry_count || 0,
      fail_fast: action.fail_fast || false
    },
  })


  const { control, handleSubmit, reset, setValue, watch, formState: { isDirty } } = methods
  const actionType = action.type
  const formValues = watch()


  // Reset form when action changes
  useEffect(() => {
    reset({
      name: action.name || "",
      description: action.description || "",
      handle: action.handle || "",
      status: action.status || "draft",
      type: action.type || "API_CALL",
      config: action.config || {},
      order_index: action.order_index || null,
      dependencies: action.dependencies || [],
      conditions: action.conditions || {},
      output_template: action.output_template || {},
      parameters: action.parameters || [],
      context_as: action.context_as || null,
      context_template: action.context_template || {},
      timeout_seconds: action.timeout_seconds || 30,
      retry_count: action.retry_count || 0,
      fail_fast: action.fail_fast || false,
      pre_hooks: action.pre_hooks || [],
      post_hooks: action.post_hooks || [],
      success_hooks: action.success_hooks || [],
      error_hooks: action.error_hooks || [],
      metadata: action.metadata || {},
      created_at: action.created_at,
      updated_at: action.updated_at,
    })
  }, [action, reset])

  useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // Force re-render when config changes
    if (name?.startsWith('config')) {
      // This will trigger a re-render with the new config values
    }
  });
  
  return () => subscription.unsubscribe();
}, [watch]);

  const handleSave = async (data: ActionFormData) => {
  console.log(data, 'DATAA')
    try {
      await updateAction({
        name: data.name,
        description: data.description,
        handle: data.handle,
        status: data.status,
        type: data.type,
        config: data.config,
        order_index: data.order_index,
        dependencies: data.dependencies,
        conditions: data.conditions,
        output_template: data.output_template,
        parameters: data.parameters,
        context_as: data.context_as,
        context_template: data.context_template,
        timeout_seconds: data.timeout_seconds,
        retry_count: data.retry_count,
        fail_fast: data.fail_fast,
        pre_hooks: data.pre_hooks,
        post_hooks: data.post_hooks,
        success_hooks: data.success_hooks,
        error_hooks: data.error_hooks,
        metadata: data.metadata,
      })
      toast.success("Success", {
        description: "Action updated successfully",
      })
      onEditModeChange(false)
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update action",
      })
    }
  }

  const handleCancel = () => {
    reset()
    onEditModeChange(false)
  }

// Handle paste from clipboard - Updated to include all fields
  const handlePaste = (pastedData: any) => {
    // Basic info
    if (pastedData.name) setValue("name", pastedData.name)
    if (pastedData.description !== undefined) setValue("description", pastedData.description)
    if (pastedData.handle) setValue("handle", pastedData.handle)
    
    // Status and type
    if (pastedData.status && ['draft', 'active', 'inactive', 'archived'].includes(pastedData.status)) {
      setValue("status", pastedData.status)
    }
    if (pastedData.type && ['DB_OPERATION', 'API_CALL', 'AI_ACTION', 'WORKFLOW', 'SCRIPT'].includes(pastedData.type)) {
      setValue("type", pastedData.type)
    }
    
    console.log(pastedData, 'PASATED')

    // Configuration
    if (pastedData.config) setValue("config", pastedData.config)
    if (pastedData.order_index !== undefined) setValue("order_index", pastedData.order_index)
    if (pastedData.dependencies) setValue("dependencies", pastedData.dependencies)
    if (pastedData.conditions) setValue("conditions", pastedData.conditions)
    if (pastedData.output_template) setValue("output_template", pastedData.output_template)
    if (pastedData.parameters) setValue("parameters", pastedData.parameters)
    if (pastedData.context_as) setValue("context_as", pastedData.context_as)
    if (pastedData.context_template) setValue("context_template", pastedData.context_template)
    
    // Execution settings
    if (pastedData.timeout_seconds) setValue("timeout_seconds", pastedData.timeout_seconds)
    if (pastedData.retry_count !== undefined) setValue("retry_count", pastedData.retry_count)
    if (pastedData.fail_fast !== undefined) setValue("fail_fast", pastedData.fail_fast)
    
    // Hooks
    if (pastedData.pre_hooks) setValue("pre_hooks", pastedData.pre_hooks)
    if (pastedData.post_hooks) setValue("post_hooks", pastedData.post_hooks)
    if (pastedData.success_hooks) setValue("success_hooks", pastedData.success_hooks)
    if (pastedData.error_hooks) setValue("error_hooks", pastedData.error_hooks)
    
    // Metadata
    if (pastedData.metadata) setValue("metadata", pastedData.metadata)

    toast.success("Form populated", {
      description: `Loaded "${pastedData.name}" configuration`
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "DB_OPERATION": return "blue"
      case "API_CALL": return "violet"
      case "SCRIPT": return "orange"
      case "AI_ACTION": return "green"
      case "WORKFLOW": return "purple"
      default: return "grey"
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleSave)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info & Metadata */}
          <div className="space-y-6">
            {/* Basic Details Container */}
            <Container>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Heading level="h3">Basic Information</Heading>
                   <div className="flex items-center gap-2">
                    {/* Copy/Paste Button */}
                    <CopyPasteButton
                      editMode={editMode}
                      formData={formValues}
                      onPaste={handlePaste}
                    />
                    
                    {/* Edit/Save/Cancel Buttons */}
                    {!editMode ? (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onEditModeChange(true)}
                        className="gap-2"
                      >
                        <Pencil size={16} /> Edit
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          type="button"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          type="submit"
                          isLoading={isPending}
                          disabled={!isDirty}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Type (Read-only) */}
                  <div>
                    <Text className="font-medium text-ui-fg-muted">Type</Text>
                    <Badge 
                      size="small" 
                      color={getTypeColor(actionType)}
                      className="mt-1"
                    >
                      {actionType?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                  </div>

                  {/* Handle (Read-only) */}
                  <div>
                    <Text className="font-medium text-ui-fg-muted">Handle</Text>
                    <Text className="font-mono text-ui-fg-base">{action.handle || '-'}</Text>
                  </div>

                  {/* Name - Editable */}
                  <div>
                    <Label>Name</Label>
                    {editMode ? (
                      <Input
                        {...methods.register("name")}
                        placeholder="Action name"
                        className="mt-1"
                      />
                    ) : (
                      <Text>{action.name || '-'}</Text>
                    )}
                  </div>

                  {/* Description - Editable */}
                  <div>
                    <Label>Description</Label>
                    {editMode ? (
                      <Textarea
                        {...methods.register("description")}
                        placeholder="Action description"
                        rows={3}
                        className="mt-1"
                      />
                    ) : (
                      <Text className="text-ui-fg-subtle">
                        {action.description || 'No description provided'}
                      </Text>
                    )}
                  </div>

                  {/* Status - Editable */}
                  <div>
                    <Label>Status</Label>
                    {editMode ? (
                      <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <Select.Trigger className="mt-1">
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="draft">Draft</Select.Item>
                              <Select.Item value="active">Active</Select.Item>
                              <Select.Item value="inactive">Inactive</Select.Item>
                              <Select.Item value="archived">Archived</Select.Item>
                            </Select.Content>
                          </Select>
                        )}
                      />
                    ) : (
                      <Badge color={
                        action.status === "active" ? "green" :
                        action.status === "draft" ? "orange" :
                        action.status === "inactive" ? "grey" : "red"
                      }>
                        {action.status}
                      </Badge>
                    )}
                  </div>

                  {/* Order Index (Read-only) */}
                  <div>
                    <Text className="font-medium text-ui-fg-muted">Order Index</Text>
                    <Text>{action.order_index ?? "Not set"}</Text>
                  </div>

                  {/* Created At (Read-only) */}
                  <div>
                    <Text className="font-medium text-ui-fg-muted">Created</Text>
                    <Text>{action.created_at ? new Date(action.created_at).toLocaleString() : '-'}</Text>
                  </div>
                </div>
              </div>
            </Container>

            {/* Dependencies Container */}
            {action.dependencies && action.dependencies.length > 0 && (
              <Container>
                <div className="p-6">
                  <Heading level="h3" className="mb-4">Dependencies</Heading>
                  <div className="flex flex-wrap gap-2">
                    {action.dependencies.map((dep: string, index: number) => (
                      <Badge key={index} color="grey" size="small">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Container>
            )}

            {/* Execution Settings Container - Editable */}
            <Container>
              <div className="p-6">
                <Heading level="h3" className="mb-4">Execution Settings</Heading>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Timeout */}
                    <div>
                      <Label>Timeout (seconds)</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          {...methods.register("timeout_seconds", { valueAsNumber: true })}
                          min={1}
                          max={3600}
                          className="mt-1"
                        />
                      ) : (
                        <Text className="text-ui-fg-base">{action.timeout_seconds || 30} seconds</Text>
                      )}
                    </div>

                    {/* Retry Count */}
                    <div>
                      <Label>Retry Count</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          {...methods.register("retry_count", { valueAsNumber: true })}
                          min={0}
                          max={10}
                          className="mt-1"
                        />
                      ) : (
                        <Text className="text-ui-fg-base">{action.retry_count || 0}</Text>
                      )}
                    </div>

                    {/* Fail Fast */}
                    <div>
                      <Label>Fail Fast</Label>
                      {editMode ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Controller
                            name="fail_fast"
                            control={control}
                            render={({ field }) => (
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Text className="text-sm text-ui-fg-subtle">
                            {watch("fail_fast") ? "Yes" : "No"}
                          </Text>
                        </div>
                      ) : (
                        <Badge color={action.fail_fast ? "red" : "grey"} size="small">
                          {action.fail_fast ? "Yes" : "No"}
                        </Badge>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </Container>
          </div>

          {/* Right Column - Type-specific Configuration */}
          <div className="space-y-6">
            <Container>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Heading level="h3">Action Configuration</Heading>
                  <Badge size="small" color={getTypeColor(actionType)}>
                    {actionType?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                
                {/* Type-specific Fields */}
                <div className="space-y-6">
                  {actionType === "DB_OPERATION" && (
                    <DatabaseOperationFields
                      editMode={editMode} 
                      initialConfig={action.config} 
                    />
                  )}

                  {actionType === "API_CALL" && (
                    <ApiCallFields 
                      editMode={editMode} 
                      initialConfig={action.config} 
                    />
                  )}

                  {actionType === "SCRIPT" && (
                    <ScriptFields 
                      editMode={editMode}
                      action={action}
                      initialConfig={action.config}
                      onEditModeChange={onEditModeChange}
                      isPending={isPending}
                    />
                  )}

                  {actionType === "AI_ACTION" && (
                    <AiActionFields 
                      editMode={editMode} 
                      initialConfig={action.config} 
                    />
                  )}

                  {actionType === "WORKFLOW" && (
                    <WorkflowFields 
                      editMode={editMode}
                      initialConfig={action.config}
                      availableActions={availableActions}
                    />
                  )}

                  {![
                    "DB_OPERATION", 
                    "API_CALL", 
                    "SCRIPT", 
                    "AI_ACTION", 
                    "WORKFLOW"
                  ].includes(actionType) && (
                    <div className="bg-ui-bg-subtle rounded-md p-4">
                      <Text className="text-ui-fg-muted text-center">
                        No configuration editor available for type: {actionType}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </Container>

            {/* Metadata Container */}
            {action.metadata && Object.keys(action.metadata).length > 0 && (
              <Container>
                <div className="p-6">
                  <Heading level="h3" className="mb-4">Metadata</Heading>
                  <CodeBlock
                    snippets={[{
                      label: "JSON",
                      language: "json",
                      code: JSON.stringify(action.metadata, null, 2),
                    }]}
                  >
                    <CodeBlock.Header />
                    <CodeBlock.Body />
                  </CodeBlock>
                </div>
              </Container>
            )}
          </div>
        </div>

        {/* Edit Mode Actions */}
        {editMode && (
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              size="base"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X /> Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="base"
              isLoading={isPending}
              disabled={isPending}
            >
              <Check /> Save Changes
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}



/* ============================================================
   API Call Fields
============================================================ */
const ApiCallFields = ({ 
  editMode, 
  initialConfig 
}: { 
  editMode: boolean
  initialConfig?: any
}) => {
  const { control, register, setValue, watch } = useFormContext<ActionFormData>();
  const [headersError, setHeadersError] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)
  
  const headersValue = watch("config.headers")
  const bodyValue = watch("config.body")

  // Parse and format JSON on input change
  const handleJsonChange = (
    value: string,
    field: 'headers' | 'body',
    setError: (error: string | null) => void
  ) => {
    try {
      // Remove extra whitespace and newlines
      const trimmed = value.trim()
      
      if (!trimmed) {
        setValue(`config.${field}`, field === 'headers' ? {} : '')
        setError(null)
        return
      }

      // Parse JSON to validate
      const parsed = JSON.parse(trimmed)
      
      // Store as parsed object (not string)
      setValue(`config.${field}`, parsed)
      setError(null)
    } catch (error: any) {
      setError(`Invalid JSON: ${error.message}`)
    }
  }

  // Format object to pretty JSON string for display/editing
  const formatJsonForEditing = (value: any): string => {
    if (!value) return ''
    if (typeof value === 'string') {
      // Try to parse if it's a string to format it properly
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    return JSON.stringify(value, null, 2)
  }

  // Initialize form with parsed values
  useEffect(() => {
    if (initialConfig) {
      // Handle headers
      if (initialConfig.headers) {
        if (typeof initialConfig.headers === 'string') {
          try {
            const parsed = JSON.parse(initialConfig.headers)
            setValue('config.headers', parsed)
          } catch {
            setValue('config.headers', initialConfig.headers)
          }
        } else {
          setValue('config.headers', initialConfig.headers)
        }
      }

      // Handle body
      if (initialConfig.body) {
        if (typeof initialConfig.body === 'string') {
          try {
            const parsed = JSON.parse(initialConfig.body)
            setValue('config.body', parsed)
          } catch {
            setValue('config.body', initialConfig.body)
          }
        } else {
          setValue('config.body', initialConfig.body)
        }
      }
    }
  }, [initialConfig, setValue])


useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // Force re-render when config changes
    if (name?.startsWith('config')) {
      // This will trigger a re-render with the new config values
    }
  });
  
  return () => subscription.unsubscribe();
}, [watch]);

  return (
    <div className="space-y-6">
      {/* URL */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">URL</Label>
        {editMode ? (
          <Input
            {...register("config.url")}
            placeholder="https://api.example.com/endpoint"
            className="font-mono text-sm"
          />
        ) : (
          <div className="group flex items-center justify-between bg-ui-bg-subtle p-3 rounded-md">
            <Text className="font-mono text-sm break-all">
              {initialConfig?.url || '-'}
            </Text>
            {initialConfig?.url && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(initialConfig.url)
                  // Add toast notification here
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-ui-bg-base-hover rounded"
                title="Copy URL"
              >
                <Copy className="h-4 w-4 text-ui-fg-muted" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Method */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Method</Label>
        {editMode ? (
          <Controller
            name="config.method"
            control={control}
            defaultValue="GET"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value placeholder="Select HTTP method" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="GET">GET</Select.Item>
                  <Select.Item value="POST">POST</Select.Item>
                  <Select.Item value="PUT">PUT</Select.Item>
                  <Select.Item value="PATCH">PATCH</Select.Item>
                  <Select.Item value="DELETE">DELETE</Select.Item>
                </Select.Content>
              </Select>
            )}
          />
        ) : (
          <Badge
            size="large"
            color={
              initialConfig?.method === "GET" ? "green" :
              initialConfig?.method === "POST" ? "blue" :
              initialConfig?.method === "PUT" ? "orange" :
              initialConfig?.method === "PATCH" ? "purple" :
              initialConfig?.method === "DELETE" ? "red" : "grey"
            }
          >
            {initialConfig?.method || 'GET'}
          </Badge>
        )}
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-sm font-medium">Headers</Label>
          {editMode && (
            <span className="text-xs text-ui-fg-muted">
              Enter valid JSON object
            </span>
          )}
        </div>
        
        {editMode ? (
          <div className="space-y-2">
            <Textarea
              defaultValue={formatJsonForEditing(initialConfig?.headers)}
              onChange={(e) => handleJsonChange(e.target.value, 'headers', setHeadersError)}
              placeholder={`{
  "Authorization": "Bearer {{token}}",
  "Content-Type": "application/json",
  "X-Custom-Header": "value"
}`}
              rows={6}
              className="font-mono text-sm"
            />
            {headersError && (
              <Alert variant="error" className="mt-2">
                <ExclamationCircleSolid className="h-4 w-4" />
                <Alert.Title>Invalid Headers</Alert.Title>
                <Alert.Description>{headersError}</Alert.Description>
              </Alert>
            )}
          </div>
        ) : (
          <div className="bg-ui-bg-subtle rounded-md overflow-hidden">
            {initialConfig?.headers && Object.keys(initialConfig.headers).length > 0 ? (
              <div className="divide-y divide-ui-border-base">
                {Object.entries(initialConfig.headers).map(([key, value]) => (
                  <div key={key} className="flex items-start p-3 group hover:bg-ui-bg-base-hover">
                    <div className="grid grid-cols-[120px,1fr,auto] gap-4 flex-1 text-sm">
                      <span className="font-mono text-ui-fg-muted">{key}:</span>
                      <span className="font-mono break-all">{value as string}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${key}: ${value}`)
                          // Add toast
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-4 w-4 text-ui-fg-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text className="p-3 text-ui-fg-muted">No headers configured</Text>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-sm font-medium">Request Body</Label>
          {editMode && (
            <span className="text-xs text-ui-fg-muted">
              Enter valid JSON
            </span>
          )}
        </div>
        
        {editMode ? (
          <div className="space-y-2">
            <Textarea
              defaultValue={formatJsonForEditing(initialConfig?.body)}
              onChange={(e) => handleJsonChange(e.target.value, 'body', setBodyError)}
              placeholder={`{
  "query": "{{input.query}}",
  "variables": {
    "limit": 10,
    "offset": 0
  }
}`}
              rows={8}
              className="font-mono text-sm"
            />
            {bodyError && (
              <Alert variant="error" className="mt-2">
                <ExclamationCircleSolid className="h-4 w-4" />
                <Alert.Title>Invalid Body</Alert.Title>
                <Alert.Description>{bodyError}</Alert.Description>
              </Alert>
            )}
          </div>
        ) : (
          <div className="bg-ui-bg-subtle rounded-md overflow-hidden">
            {initialConfig?.body ? (
              <div className="p-3">
                <CodeBlock
                  snippets={[{
                    label: "JSON",
                    language: "json",
                    code: typeof initialConfig.body === 'object'
                      ? JSON.stringify(initialConfig.body, null, 2)
                      : initialConfig.body,
                  }]}
                  className="max-h-96 overflow-auto"
                >
                  <CodeBlock.Header />
                  <CodeBlock.Body />
                </CodeBlock>
              </div>
            ) : (
              <Text className="p-3 text-ui-fg-muted">No body configured</Text>
            )}
          </div>
        )}
      </div>

      {/* Preview in edit mode */}
      {editMode && (headersValue || bodyValue) && (
        <div className="mt-4 p-4 bg-ui-bg-subtle rounded-lg">
          <Label className="text-sm font-medium mb-2">Preview (Parsed)</Label>
          <div className="space-y-3">
            {headersValue && Object.keys(headersValue).length > 0 && (
              <div>
                <div className="text-xs text-ui-fg-muted mb-1">Headers:</div>
                <pre className="text-xs font-mono bg-ui-bg-base p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(headersValue, null, 2)}
                </pre>
              </div>
            )}
            {bodyValue && (
              <div>
                <div className="text-xs text-ui-fg-muted mb-1">Body:</div>
                <pre className="text-xs font-mono bg-ui-bg-base p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(bodyValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Script Fields
============================================================ */
/* ============================================================
   Script Fields - FIXED
============================================================ */

const ScriptFields = ({ 
  editMode,
  action,
  onEditModeChange,
  isPending,
  initialConfig
}: { 
  editMode: boolean
  initialConfig?: any
  action: any
  onEditModeChange: (editMode: boolean) => void
  isPending: boolean
}) => {
  const { register, control, setValue, getValues, watch } = useFormContext<ActionFormData>()
  const codeRef = useRef<string>(initialConfig?.code || '')

  // Initialize form
  useEffect(() => {
    if (initialConfig) {
      setValue('config.runtime', initialConfig.runtime || 'javascript')
      setValue('config.code', initialConfig.code || '')
      setValue('config.timeout', initialConfig.timeout || 30)
      codeRef.current = initialConfig.code || ''
    }
  }, [initialConfig, setValue])



useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // Force re-render when config changes
    if (name?.startsWith('config')) {
      // This will trigger a re-render with the new config values
    }
  });
  
  return () => subscription.unsubscribe();
}, [watch]);


  // Handle save from JsCodeEditor
  const handleSave = (config) => {
  console.log(config, 'SASVEE')
    setValue('config.code', config.code)
    // onEditModeChange(false)
  }

  return (
    <div className="space-y-4">
      {/* Runtime - same as above */}
      
      {/* Script Code */}
      <div>
        <Label>Script Code</Label>
        {editMode ? (
          <>
            <input type="hidden" {...register("config.code")} />
            <JsCodeEditor
              action={action}
              editMode={editMode}
              onEditModeChange={onEditModeChange}
              onSave={handleSave}
              isLoading={isPending}
            />
          </>
        ) : (
          <div className="bg-ui-bg-subtle rounded-md p-4 max-h-[400px] overflow-auto mt-1">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {initialConfig?.code || '// No code provided'}
            </pre>
          </div>
        )}
      </div>

      {/* Timeout - same as above */}
    </div>
  )
}

/* ============================================================
   AI Action Fields
============================================================ */

const AiActionFields = ({ 
  editMode, 
  initialConfig 
}: { 
  editMode: boolean
  initialConfig?: any
}) => {
  const { control, register, watch } = useFormContext<ActionFormData>()


useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // Force re-render when config changes
    if (name?.startsWith('config')) {
      // This will trigger a re-render with the new config values
    }
  });
  
  return () => subscription.unsubscribe();
}, [watch]);




  return (
    <div className="space-y-4">
      {/* Model */}
      <div>
        <Label>Model</Label>
        {editMode ? (
          <Controller
            name="config.model"
            control={control}
            render={({ field }) => (
              <Select value={field.value || "gpt-4"} onValueChange={field.onChange}>
                <Select.Trigger className="mt-1">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="gpt-4">GPT-4</Select.Item>
                  <Select.Item value="gpt-4-turbo">GPT-4 Turbo</Select.Item>
                  <Select.Item value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Item>
                  <Select.Item value="claude-3">Claude 3</Select.Item>
                  <Select.Item value="llama-3">Llama 3</Select.Item>
                </Select.Content>
              </Select>
            )}
          />
        ) : (
          <Badge color="green">{initialConfig?.model || 'gpt-4'}</Badge>
        )}
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Temperature</Label>
          {editMode ? (
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              {...register("config.temperature", { valueAsNumber: true })}
              placeholder="0.7"
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.temperature ?? 0.7}</Text>
          )}
        </div>
        <div>
          <Label>Max Tokens</Label>
          {editMode ? (
            <Input
              type="number"
              {...register("config.max_tokens", { valueAsNumber: true })}
              placeholder="2000"
              min={1}
              max={32000}
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.max_tokens ?? 2000}</Text>
          )}
        </div>
        <div>
          <Label>Top P</Label>
          {editMode ? (
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              {...register("config.top_p", { valueAsNumber: true })}
              placeholder="1.0"
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.top_p ?? 1.0}</Text>
          )}
        </div>
        <div>
          <Label>Top K</Label>
          {editMode ? (
            <Input
              type="number"
              {...register("config.top_k", { valueAsNumber: true })}
              placeholder="40"
              min={1}
              max={100}
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.top_k ?? 40}</Text>
          )}
        </div>
        <div>
          <Label>Repeat Penalty</Label>
          {editMode ? (
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              {...register("config.repeat_penalty", { valueAsNumber: true })}
              placeholder="1.0"
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.repeat_penalty ?? 1.0}</Text>
          )}
        </div>
        <div>
          <Label>Context Window</Label>
          {editMode ? (
            <Input
              type="number"
              {...register("config.num_ctx", { valueAsNumber: true })}
              placeholder="2048"
              min={512}
              max={128000}
              className="mt-1"
            />
          ) : (
            <Text>{initialConfig?.num_ctx ?? 2048}</Text>
          )}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <Label>System Prompt</Label>
        {editMode ? (
          <Textarea
            {...register("config.system_prompt")}
            placeholder="You are a helpful assistant."
            rows={4}
            className="mt-1"
          />
        ) : (
          <div className="bg-ui-bg-subtle rounded-md p-3 mt-1">
            <Text className="text-sm whitespace-pre-wrap">
              {initialConfig?.system_prompt || initialConfig?.prompt || 'No system prompt provided'}
            </Text>
          </div>
        )}
      </div>

      {/* Functions */}
      <div>
        <Label>Functions</Label>
        {editMode ? (
          <Textarea
            {...register("config.functions")}
            placeholder={`[\n  {\n    "name": "get_weather",\n    "description": "Get current weather",\n    "parameters": {...}\n  }\n]`}
            rows={6}
            className="mt-1 font-mono text-sm"
          />
        ) : (
          initialConfig?.functions && (
            <CodeBlock
              snippets={[{
                label: "JSON",
                language: "json",
                code: JSON.stringify(initialConfig.functions, null, 2),
              }]}
            >
              <CodeBlock.Body />
            </CodeBlock>
          )
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Workflow Fields with Drag & Drop
============================================================ */

const WorkflowFields = ({ 
  editMode,
  initialConfig,
  availableActions,
}: { 
  editMode: boolean
  initialConfig?: any
  availableActions: Array<{ id: string; name: string; description?: string }>
}) => {
  const { control, watch } = useFormContext<ActionFormData>()
  const [isDragging, setIsDragging] = useState(false)

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "config.actions",
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const selectedIds = new Set(fields.map((f) => f.action_id))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id)
      const newIndex = fields.findIndex((item) => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex)
      }
    }
    setIsDragging(false)
  }

  const handleAddAction = (value: string) => {
    if (selectedIds.has(value)) return
    const action = availableActions.find(a => a.id === value)
    append({ 
      action_id: value,
      name: action?.name || value,
      description: action?.description,
      parameters: {}
    })
  }

  useEffect(() => {
  const subscription = watch((value, { name, type }) => {
    // Force re-render when config changes
    if (name?.startsWith('config')) {
      // This will trigger a re-render with the new config values
    }
  });
  
  return () => subscription.unsubscribe();
}, [watch]);



  if (!editMode) {
    return (
      <div className="space-y-4">
        <div>
          <Text className="font-medium text-ui-fg-muted mb-2">
            Actions ({initialConfig?.actions?.length || 0})
          </Text>
          {initialConfig?.actions && initialConfig.actions.length > 0 ? (
            <div className="space-y-3">
              {initialConfig.actions.map((workflowAction: any, index: number) => (
                <div key={workflowAction.id || index} className="bg-ui-bg-subtle rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge size="small" color="purple">
                        Step {index + 1}
                      </Badge>
                      <Text className="font-medium">
                        {workflowAction.name || workflowAction.action_id}
                      </Text>
                    </div>
                  </div>
                  {workflowAction.description && (
                    <Text className="text-xs text-ui-fg-muted mb-2">
                      {workflowAction.description}
                    </Text>
                  )}
                  {workflowAction.parameters && Object.keys(workflowAction.parameters).length > 0 && (
                    <CodeBlock
                      snippets={[{
                        label: "Parameters",
                        language: "json",
                        code: JSON.stringify(workflowAction.parameters, null, 2),
                      }]}
                    >
                      <CodeBlock.Body />
                    </CodeBlock>
                  )}
                </div>
              ))}
              
              {/* Sequence Visualization */}
              <div className="mt-4 pt-4 border-t border-ui-border-base">
                <Text className="font-medium text-ui-fg-muted mb-3">
                  Execution Sequence
                </Text>
                <div className="flex items-center gap-2 flex-wrap">
                  {initialConfig.actions.map((_: any, index: number) => (
                    <React.Fragment key={index}>
                      <Badge size="small" color="grey" className="px-3 py-1.5">
                        {index + 1}
                      </Badge>
                      {index < initialConfig.actions.length - 1 && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ui-fg-muted">
                          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-ui-border-base rounded-md p-4 text-center">
              <Text className="text-ui-fg-muted">No actions configured</Text>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Picker */}
      <div>
        <Label>Add Action</Label>
        <Select onValueChange={handleAddAction}>
          <Select.Trigger className="mt-1">
            <Select.Value placeholder="Add action to workflow" />
          </Select.Trigger>
          <Select.Content>
            {availableActions.map((action) => (
              <Select.Item
                key={action.id}
                value={action.id}
                disabled={selectedIds.has(action.id)}
              >
                <div className="flex flex-col">
                  <span>{action.name}</span>
                  {action.description && (
                    <span className="text-xs text-ui-fg-muted truncate">
                      {action.description}
                    </span>
                  )}
                </div>
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {/* Drag & Drop Instructions */}
      {fields.length > 1 && (
        <div className="text-xs text-ui-fg-muted flex items-center gap-2 p-2 bg-ui-bg-subtle rounded-md">
          <HandTruck size={12} />
          Drag and drop to reorder actions
        </div>
      )}

      {/* Sortable Actions List */}
      {fields.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setIsDragging(false)}
        >
          <SortableContext
            items={fields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={`space-y-2 transition-opacity ${isDragging ? 'opacity-70' : ''}`}>
              {fields.map((field, index) => (
                <SortableWorkflowItem
                  key={field.id}
                  id={field.id}
                  index={index}
                  field={field}
                  availableActions={availableActions}
                  onRemove={() => remove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="border border-dashed border-ui-border-base rounded-lg p-8 text-center bg-ui-bg-subtle">
          <div className="text-ui-fg-muted mb-2">
            No actions added yet
          </div>
          <div className="text-xs text-ui-fg-subtle">
            Use the dropdown above to add actions to your workflow
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Sortable Workflow Item
============================================================ */

const SortableWorkflowItem = ({ 
  id, 
  index, 
  field, 
  availableActions, 
  onRemove 
}: { 
  id: string
  index: number
  field: any
  availableActions: Array<{ id: string; name: string; description?: string }>
  onRemove: () => void
}) => {
  const { control } = useFormContext<ActionFormData>()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const action = availableActions.find(a => a.id === field.action_id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-ui-bg-subtle rounded-md p-4 border border-ui-border-base"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-ui-fg-muted hover:text-ui-fg-base"
        >
          <GripVertical size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge size="small" color="purple">
                Step {index + 1}
              </Badge>
              <Text className="font-medium">
                {action?.name || field.action_id}
              </Text>
            </div>
            <Button
              variant="transparent"
              size="small"
              onClick={onRemove}
              className="text-ui-fg-muted hover:text-ui-fg-error"
            >
              <Trash size={16} />
            </Button>
          </div>

          {/* Action Description */}
          {action?.description && (
            <Text className="text-xs text-ui-fg-muted">
              {action.description}
            </Text>
          )}

          {/* Parameters Editor */}
          <div>
            <Label className="text-xs">Parameters</Label>
            <Controller
              name={`config.actions.${index}.parameters`}
              control={control}
              render={({ field: paramField }) => (
                <Textarea
                  value={JSON.stringify(paramField.value || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      paramField.onChange(parsed)
                    } catch {
                      // Allow invalid JSON during editing
                      paramField.onChange(e.target.value)
                    }
                  }}
                  rows={4}
                  className="mt-1 font-mono text-sm"
                  placeholder="{}"
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}