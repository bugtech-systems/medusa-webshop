import { useMemo, useState } from "react"
import {
  Drawer,
  Button,
  Heading,
  Select,
  Label,
  Badge,
  IconButton,
  Input,
  Textarea,
  Switch,
} from "@medusajs/ui"
import { Trash, ChevronDown, ChevronUpMini } from "@medusajs/icons"
import {
  useForm,
  Controller,
  FormProvider,
  useFieldArray,
  useWatch,
} from "react-hook-form"

/* ============================================================
   Types
============================================================ */

interface ActionParameter {
  id: string
  name: string
  type: "string" | "number" | "boolean" | "object" | "array"
  required: boolean
  description?: string
}

interface Action {
  id: string
  name: string
  description?: string
  parameters?: ActionParameter[]
}

interface HookConfig {
  output_field?: string
  context?: Record<string, any>
  condition?: string
  parameters?: Record<string, any>
}

interface HookFormItem {
  action_id: string
  config?: HookConfig
}

interface HookDetailsFormData {
  hook: HookFormItem
}

interface ActionHooksDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentActionId: string
  actions: Action[]
  defaultHook?: HookFormItem
  onSave: (data: HookDetailsFormData) => Promise<void>
}

/* ============================================================
   Parameter Field Component
============================================================ */

interface ParameterFieldProps {
  parameter: ActionParameter
  name: string
  control: any
}

const ParameterField = ({ parameter, name, control }: ParameterFieldProps) => {
  const renderField = () => {
    switch (parameter.type) {
      case "boolean":
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        )
      case "number":
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Input
                type="number"
                value={field.value || ""}
                onChange={(e) => {
                  const value = e.target.value
                  field.onChange(value === "" ? undefined : Number(value))
                }}
                placeholder={`Enter ${parameter.name}`}
              />
            )}
          />
        )
      case "object":
      case "array":
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Textarea
                value={field.value ? JSON.stringify(field.value, null, 2) : ""}
                onChange={(e) => {
                  try {
                    const value = e.target.value
                    if (!value.trim()) {
                      field.onChange(undefined)
                      return
                    }
                    field.onChange(JSON.parse(value))
                  } catch {
                    // Keep invalid JSON as string for user to fix
                    field.onChange(e.target.value)
                  }
                }}
                placeholder={`Enter ${parameter.type} as JSON`}
                className="font-mono text-sm"
              />
            )}
          />
        )
      default: // string
        return (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={`Enter ${parameter.name}`}
              />
            )}
          />
        )
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>
        {parameter.name}
        {parameter.required && <span className="text-red-500 ml-1">*</span>}
        {parameter.description && (
          <span className="text-gray-500 text-xs ml-2">
            {parameter.description}
          </span>
        )}
      </Label>
      {renderField()}
    </div>
  )
}

/* ============================================================
   Hook Configuration Section
============================================================ */

interface HookConfigurationProps {
  selectedAction?: Action
  control: any
}

const HookConfiguration = ({ selectedAction, control }: HookConfigurationProps) => {
  const [showConfig, setShowConfig] = useState(true)
  const [showParams, setShowParams] = useState(false)

  if (!selectedAction) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* General Configuration */}
      <section className="border border-gray-200 rounded-lg p-4">
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setShowConfig(!showConfig)}
        >
          <Heading level="h4">Hook Configuration</Heading>
          {showConfig ? <ChevronUpMini /> : <ChevronDown />}
        </button>
        
        {showConfig && (
          <div className="mt-4 space-y-4">
            {/* Output Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="output_field">Output Field Mapping</Label>
              <Controller
                control={control}
                name="hook.config.output_field"
                render={({ field }) => (
                  <Input
                    id="output_field"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="e.g., result.data"
                  />
                )}
              />
              <span className="text-gray-500 text-xs">
                Where to store the hook's output in the workflow context
              </span>
            </div>

            {/* Condition */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="condition">Execution Condition</Label>
              <Controller
                control={control}
                name="hook.config.condition"
                render={({ field }) => (
                  <Textarea
                    id="condition"
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="e.g., {{context.user.role === 'admin'}}"
                    rows={3}
                  />
                )}
              />
              <span className="text-gray-500 text-xs">
                JavaScript expression. Hook only executes if this evaluates to truthy.
              </span>
            </div>

            {/* Context Overrides */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="context">Context Overrides</Label>
              <Controller
                control={control}
                name="hook.config.context"
                render={({ field }) => (
                  <Textarea
                    id="context"
                    value={field.value ? JSON.stringify(field.value, null, 2) : ""}
                    onChange={(e) => {
                      try {
                        const value = e.target.value
                        if (!value.trim()) {
                          field.onChange(undefined)
                          return
                        }
                        field.onChange(JSON.parse(value))
                      } catch {
                        field.onChange(e.target.value)
                      }
                    }}
                    placeholder="Override workflow context values as JSON"
                    rows={4}
                    className="font-mono text-sm"
                  />
                )}
              />
              <span className="text-gray-500 text-xs">
                Override specific context values for this hook only
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Action Parameters */}
      {selectedAction.parameters && selectedAction.parameters.length > 0 && (
        <section className="border border-gray-200 rounded-lg p-4">
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowParams(!showParams)}
          >
            <Heading level="h4">
              Action Parameters
              <Badge size="small" className="ml-2">
                {selectedAction.parameters.length}
              </Badge>
            </Heading>
            {showParams ? <ChevronUpMini /> : <ChevronDown />}
          </button>
          
          {showParams && (
            <div className="mt-4 space-y-4">
              {selectedAction.parameters.map((param) => (
                <ParameterField
                  key={param.id}
                  parameter={param}
                  name={`hook.config.parameters.${param.id}`}
                  control={control}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

/* ============================================================
   Drawer
============================================================ */

export const ActionHooksDrawer = ({
  open,
  onOpenChange,
  currentActionId,
  actions,
  defaultHook = { action_id: "" },
  onSave,
}: ActionHooksDrawerProps) => {
  const form = useForm<HookDetailsFormData>({
    defaultValues: {
      hook: defaultHook,
    },
  })

  const { control, handleSubmit, reset, watch } = form

  // Watch for action_id changes to get selected action
  const selectedActionId = watch("hook.action_id")
  const selectedAction = useMemo(
    () => actions.find(a => a.id === selectedActionId),
    [actions, selectedActionId]
  )

  const selectableActions = useMemo(
    () => actions.filter((a) => a.id !== currentActionId),
    [actions, currentActionId]
  )

  const submit = async (data: HookDetailsFormData) => {
    await onSave(data)
    onOpenChange(false)
    reset() // Clear form on successful save
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Configure Hook</Drawer.Title>
          <Drawer.Description>
            Select an action and configure hook details
          </Drawer.Description>
        </Drawer.Header>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(submit)}>
            <Drawer.Body className="flex flex-col gap-8 overflow-y-auto max-h-[70vh]">
              {/* ================================================= */}
              {/* ACTION SELECTION */}
              {/* ================================================= */}
              
              <section className="flex flex-col gap-4">
                <Heading level="h3">Select Action</Heading>
                
                <div className="flex flex-col gap-2">
                  <Label htmlFor="action-select">Hook Action</Label>
                  <Controller
                    control={control}
                    name="hook.action_id"
                    rules={{ required: "Please select an action" }}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-1">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder="Select an action" />
                          </Select.Trigger>
                          <Select.Content>
                            {selectableActions.map((action) => (
                              <Select.Item key={action.id} value={action.id}>
                                {action.name}
                                {action.description && (
                                  <span className="text-gray-500 ml-2">
                                    - {action.description}
                                  </span>
                                )}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                        {fieldState.error && (
                          <span className="text-red-500 text-xs">
                            {fieldState.error.message}
                          </span>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* Selected Action Info */}
                {selectedAction && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Heading level="h4" className="mb-2">{selectedAction.name}</Heading>
                    {selectedAction.description && (
                      <p className="text-gray-600 text-sm mb-2">
                        {selectedAction.description}
                      </p>
                    )}
                    {selectedAction.parameters && (
                      <div className="flex gap-2 flex-wrap">
                        {selectedAction.parameters.map((param) => (
                          <Badge
                            key={param.id}
                            size="small"
                            color={param.required ? "red" : "blue"}
                          >
                            {param.name}
                            <span className="ml-1 text-xs opacity-75">
                              ({param.type})
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ================================================= */}
              {/* HOOK CONFIGURATION */}
              {/* ================================================= */}
              
              {selectedAction && (
                <HookConfiguration
                  selectedAction={selectedAction}
                  control={control}
                />
              )}
            </Drawer.Body>

            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Drawer.Close>

              <Button 
                type="submit" 
                disabled={!selectedActionId}
              >
                Save Hook Configuration
              </Button>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  )
}