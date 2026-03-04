import React, { useState, useEffect } from "react"
import {
  Drawer,
  Button,
  Heading,
  Text as UiText,
  Label,
  Select,
  Input,
  Switch,
  Badge,
  Textarea,
  toast,
  Text,
} from "@medusajs/ui"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpMini,
  CheckCircle,
  Code,
  Plus,
  Puzzle,
  Trash,
} from "@medusajs/icons"
import { ArrowRight } from "lucide-react"
import JsonEditor from "../../../components/jsonEditor" // Adjust path
import { Widget } from "../../dashboard/types"
import { useExecution } from "../../../hooks/api/actions"


// ---------- Types ----------
interface ConfigField {
  name: string
  label: string
  type: "text" | "number" | "select" | "boolean"
  required?: boolean
  options?: { value: string; label: string }[]
}

interface WidgetType {
  value: string
  label: string
  description: string
  icon: string
  configFields: ConfigField[]
}

interface Action {
  value: string
  label: string
  description: string
}

interface EditWidgetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: Widget | null
  onUpdate: (widgetId: string, updates: any) => void
}

// Widget type definitions (same as AddWidgetModal)
const widgetTypes: any = [
  { 
    value: "stat", 
    label: "Statistic Card", 
    description: "Display key metrics",
    disabled: false,
    icon: "📊",
    configFields: [
      { name: "title", label: "Card Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "text", required: false },
      { name: "value", label: "Card Value", type: "text", required: true },
      { 
        name: "icon", 
        label: "Icon", 
        type: "select", 
        options: [
          { value: "users", label: "Users" },
          { value: "revenue", label: "Revenue" },
          { value: "orders", label: "Orders" },
          { value: "products", label: "Products" },
          { value: "cart", label: "Cart" },
          { value: "currency_dollar", label: "Currency" }
        ]
      },
      { 
        name: "color", 
        label: "Color Theme", 
        type: "select", 
        options: [
          { value: "blue", label: "Blue" },
          { value: "green", label: "Green" },
          { value: "orange", label: "Orange" },
          { value: "red", label: "Red" },
          { value: "purple", label: "Purple" }
        ]
      },
      { 
        name: "format", 
        label: "Number Format", 
        type: "select", 
        options: [
          { value: "number", label: "Plain Number" },
          { value: "currency", label: "Currency ($)" },
          { value: "percentage", label: "Percentage (%)" },
          { value: "compact", label: "Compact (1.2K)" }
        ]
      }
    ]
  },
    { 
    value: "table", 
    label: "Table", 
     disabled: false,
    description: "Show tabular data",
    icon: "📋",
    configFields: [
      { name: "title", label: "Table Title", type: "text", required: true },
      { name: "pageSize", label: "Rows per page", type: "number", required: false },
      { name: "showSearch", label: "Show Search", type: "boolean", required: false },
      { name: "showFilters", label: "Show Filters", type: "boolean", required: false },
      { name: "dense", label: "Dense Layout", type: "boolean", required: false },
      { name: "stickyHeader", label: "Sticky Header", type: "boolean", required: false }
    ]
  },
  { 
    value: "chart", 
    label: "Chart",
    disabled: true,
    description: "Visualize data trends",
    icon: "📈",
    configFields: [
      { name: "title", label: "Chart Title", type: "text", required: true },
      { 
        name: "chartType", 
        label: "Chart Type", 
        type: "select", 
        required: true, 
        options: [
          { value: "line", label: "Line Chart" },
          { value: "bar", label: "Bar Chart" },
          { value: "pie", label: "Pie Chart" },
          { value: "area", label: "Area Chart" },
          { value: "radar", label: "Radar Chart" }
        ]
      },
      { name: "xAxis", label: "X-Axis Field", type: "text", required: true },
      { name: "yAxis", label: "Y-Axis Field", type: "text", required: true },
      { name: "height", label: "Chart Height (px)", type: "number", required: false },
      { name: "showLegend", label: "Show Legend", type: "boolean", required: false }
    ]
  },

  { 
    value: "list", 
    label: "List", 
    disabled: true,
    description: "Display item lists",
    icon: "📝",
    configFields: [
      { name: "title", label: "List Title", type: "text", required: true },
      { name: "primaryField", label: "Primary Field", type: "text", required: true },
      { name: "secondaryField", label: "Secondary Field", type: "text", required: false },
      { name: "iconField", label: "Icon Field", type: "text", required: false },
      { name: "showAvatars", label: "Show Avatars", type: "boolean", required: false }
    ]
  },
  { 
    value: "progress", 
    label: "Progress", 
    disabled: true,
    description: "Track progress",
    icon: "⏳",
    configFields: [
      { name: "title", label: "Progress Title", type: "text", required: true },
      { name: "target", label: "Target Value", type: "number", required: true },
      { name: "current", label: "Current Value Field", type: "text", required: true },
      { name: "showPercentage", label: "Show Percentage", type: "boolean", required: false },
      { 
        name: "color", 
        label: "Progress Color", 
        type: "select", 
        options: [
          { value: "blue", label: "Blue" },
          { value: "green", label: "Green" },
          { value: "orange", label: "Orange" },
          { value: "red", label: "Red" }
        ]
      }
    ]
  }
]



const defaultJsonConfig = {
  type: "custom",
  version: "1.0",
  display: {
    title: "Custom Widget",
    description: "My custom widget",
    theme: "light",
  },
  data: {
    actionId: "{{selected_action}}",
    mapping: {},
  },
  layout: {
    width: "full",
    height: "auto",
  },
}

// ---------- Reusable ConfigSelect ----------
interface ConfigSelectProps {
  field: ConfigField
  value: string
  onChange: (value: string) => void
}

// Custom Select Component
const CustomSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  error,
}: {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; description?: string }>
  placeholder?: string
  error?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-ui-bg-base border rounded-lg hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive ${
          error ? 'border-ui-tag-red-border' : 'border-ui-border-base'
        }`}
      >
        <span className={selectedOption ? "text-ui-fg-base" : "text-ui-fg-muted"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-ui-bg-base-hover transition-colors ${
                    value === option.value ? 'bg-ui-bg-base-hover' : ''
                  }`}
                >
                  <div>
                    <Text size="small" weight="plus">{option.label}</Text>
                    {option.description && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {option.description}
                      </Text>
                    )}
                  </div>
                  {value === option.value && (
                    <svg className="w-4 h-4 text-ui-fg-interactive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const ConfigSelect: React.FC<ConfigSelectProps> = ({ field, value, onChange }) => {
  return (
    <div className="mb-4">
      <Label htmlFor={field.name} className="mb-2 block">
        {field.label}
        {field.required && <span className="text-ui-fg-error ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <Select.Trigger id={field.name} className="w-full">
          <Select.Value placeholder={`Select ${field.label.toLowerCase()}`} />
        </Select.Trigger>
        <Select.Content className="z-50">
          {field.options?.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  )
}

// ---------- Main Component ----------
export const EditWidgetDrawer: React.FC<EditWidgetDrawerProps> = ({
  open,
  onOpenChange,
  widget,
  onUpdate,
}) => {
  const { data: actionsData } = useExecution("get-active-actions") as any;
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [configValues, setConfigValues] = useState<Record<string, any>>({})
  const [selectedAction, setSelectedAction] = useState("")
  const [isJsonMode, setIsJsonMode] = useState(false)
  const [jsonConfig, setJsonConfig] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingActions, setIsLoadingActions] = useState(false)
  const [newField, setNewField] = useState<any>({
    key: '',
    label: '',
    type: 'text',
    sortable: true,
    filterable: true,
    searchable: true,
    visible: true,
  })
  const [showAddField, setShowAddField] = useState(false)
  const [nextId, setNextId] = useState(4)
  const [selectedType, setSelectedType] = useState("stat")
  const [fields, setFields] = useState<any>(widget?.configuration?.fields || [ ])


  const steps = [
    { title: "Basic Info", description: "Widget details" },
    { title: "Configure", description: "Set widget properties" },
    { title: "Data Action", description: "Select data source" },
  ]

  const selectedWidgetType = widgetTypes.find((w) => w.value === selectedType)
  const actionOptions = actionsData?.data ? actionsData.data.map((action: any) => ({
    value: action.id,
    label: action.name,
    description: `Handle: ${action.handle}`
  })) : []

  // Populate form when widget changes
  useEffect(() => {
    if (widget) {
      setTitle(widget.label || "")
      setDescription(widget.metadata?.description || "")
      setSelectedAction(widget?.action_id || "")
      // setJsonConfig(JSON.stringify(widget.configuration || defaultJsonConfig, null, 2))
      setSelectedType(widget?.metadata?.type)
      setJsonConfig({
          title: widget.label || "",
          description: widget.metadata?.description || "",
          action_id: widget?.action_id || "",
          type: widget?.metadata?.type,
          config: widget.configuration
      })
      setConfigValues(widget.configuration)
      if(widget?.metadata?.type == 'table'){
        setFields(widget?.configuration?.fields)

      }
      // Handle config based on widget type
      // if (widget.type === "custom" || widget.isCustom) {
      //   // Custom widget - use JSON mode and skip to step 2
      //   setIsJsonMode(true)
      //   setCurrentStep(2)
      //   try {
      //     setJsonConfig(JSON.stringify(widget.config || defaultJsonConfig, null, 2))
      //   } catch {
      //     setJsonConfig(JSON.stringify(defaultJsonConfig, null, 2))
      //   }
      //   setConfigValues({})
      // } else {
      //   // Regular widget - use form mode
      //   setIsJsonMode(false)
      //   setCurrentStep(0)
      //   setConfigValues(widget.config || {})
      //   setJsonConfig(JSON.stringify(defaultJsonConfig, null, 2))
      // }
    }
  }, [widget])

  // Simulate loading actions
  useEffect(() => {
    if (currentStep === 2 && !isJsonMode) {
      setIsLoadingActions(true)
      const timer = setTimeout(() => setIsLoadingActions(false), 500)
      return () => clearTimeout(timer)
    }
  }, [currentStep, isJsonMode])

  if (!widget) return null

  const handleConfigChange = (fieldName: string, value: any) => {
    setConfigValues((prev) => ({ ...prev, [fieldName]: value }))
  }


  const handleFieldChange = (index: number, updates: Partial<Field>) => {
    const updatedFields = [...fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFields(updatedFields)
        setConfigValues((prev) => ({ ...prev, fields: updatedFields }))

  }

  const handleAddField = () => {
    if (!newField.key || !newField.label) return
    
    const field: any = {
      id: nextId.toString(),
      key: newField.key,
      label: newField.label,
      type: newField.type as any || 'text',
      sortable: newField.sortable ?? true,
      filterable: newField.filterable ?? true,
      searchable: newField.searchable ?? true,
      visible: newField.visible ?? true,
    }
    
    setFields([...fields, field])
            setConfigValues((prev) => ({ ...prev, fields: [...fields, field] }))

    setNewField({ key: '', label: '', type: 'text', sortable: true, filterable: true, searchable: true, visible: true })
    setShowAddField(false)
    setNextId(nextId + 1)
  }

  const handleRemoveField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
            setConfigValues((prev) => ({ ...prev, fields: updatedFields }))

  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) {
      return
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updatedFields = [...fields]
    const temp = updatedFields[index]
    updatedFields[index] = updatedFields[newIndex]
    updatedFields[newIndex] = temp
    
    setFields(updatedFields)
    setConfigValues((prev) => ({ ...prev, fields: updatedFields }))

  }


  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleJsonMode = () => {
    if (!isJsonMode) {
      // Switching to JSON: convert current config to JSON string
      setJsonConfig(configValues)
      setCurrentStep(2) // Skip to data action step in JSON mode
    } else {
      // Switching to form: parse JSON and set config (if valid)
      try {
        // const parsed = JSON.parse(jsonConfig)
        setConfigValues(jsonConfig)
        setCurrentStep(0) // Go to configure step in form mode
      } catch (e) {
        toast.error("Cannot switch to form mode: invalid JSON")
        return
      }
    }
    setIsJsonMode(!isJsonMode)
  }

  const isStepValid = () => {
    if (isJsonMode) {
      if (currentStep === 2) {
        try {
          JSON.parse(jsonConfig)
          return title.trim() !== "" && selectedAction !== ""
        } catch {
          return false
        }
      }
      return true
    }

    switch (currentStep) {
      case 0:
        return title.trim() !== ""
      case 1:
        if (!selectedWidgetType) return true
        return true
      case 2:
        return selectedAction !== ""
      default:
        return false
    }
  }

  const handleSave = async () => {
    if (!isStepValid() || (currentStep < steps.length - 1 && !isJsonMode)) return

    setIsSubmitting(true)
    try {
      let updatedConfig = configValues
      if (isJsonMode) {
        try {
          updatedConfig = JSON.parse(jsonConfig)
        } catch (e) {
          toast.error("Invalid JSON configuration")
          setIsSubmitting(false)
          return
        }
      }

      await onUpdate(widget.id, {
        label: title,
        description,
        type: selectedType,
        config: { ...widget.configuration, ...updatedConfig},
        action_id: selectedAction
      })
      
      onOpenChange(false)
      toast.success("Widget updated successfully")
    } catch (error) {
      toast.error("Failed to update widget")
    } finally {
      setIsSubmitting(false)
    }
  }

const renderTableConfig = () => (
    <div className="space-y-6">
      {/* Global Settings */}
      <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
        <Heading level="h3" className="text-sm font-medium mb-4">
          Table Settings
        </Heading>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Default Page Size</Label>
            <Input
              type="number"
              value={configValues.pageSize || 10}
              onChange={(e) => 
                  setConfigValues((prev) => ({ ...prev, pageSize: parseInt(e.target.value) }))

              }
              min={1}
              max={100}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Page Size Options</Label>
            <Input
              value={configValues.pageSizeOptions?.join(', ') || '10, 25, 50, 100'}
              onChange={(e) => 
                setConfigValues((prev) => ({ ...prev, pageSizeOptions: e.target.value.split(',').map(n => parseInt(n.trim())) }))
               }
              placeholder="10, 25, 50, 100"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Fields Configuration */}
      <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h3" className="text-sm font-medium">
            Fields
          </Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowAddField(true)}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </Button>
        </div>

        {/* Fields Table */}
        <div className="border border-ui-border-base rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ui-bg-base-hover">
              <tr>
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-4 py-2 text-left">key</th>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">type</th>
                <th className="px-4 py-2 text-center">Sortable</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-t border-ui-border-base">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveField(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-ui-bg-base-hover rounded disabled:opacity-30"
                      >
                        <ArrowUpMini className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="p-1 hover:bg-ui-bg-base-hover rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={field.key}
                      onChange={(e) => handleFieldChange(index, { key: e.target.value })}
                      size="small"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                      size="small"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={field.type}
                      onChange={(e) => handleFieldChange(index, { type: e.target.value as any })}
                      className="w-full px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Switch
                      checked={field.sortable}
                      onCheckedChange={(checked) => handleFieldChange(index, { sortable: checked })}
                    />
                  </td>
          
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleRemoveField(index)}
                      className="p-1 text-ui-tag-red-text hover:bg-ui-tag-red-bg rounded"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Field Form */}
        {showAddField && (
          <div className="mt-4 p-4 border border-ui-border-base rounded-lg">
            <Heading level="h4" className="text-sm font-medium mb-4">
              Add New Field
            </Heading>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label size="xsmall">Field Key</Label>
                <Input
                  size="small"
                  value={newField.key}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                  placeholder="e.g., customer_email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label size="xsmall">Display Label</Label>
                <Input
                  size="small"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Customer Email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label size="xsmall">Field Type</Label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowAddField(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleAddField}
                disabled={!newField.key || !newField.label}
              >
                Add Field
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )


  const renderConfigFields = () => {
    console.log(selectedWidgetType, 'SELECTED WWIDG')
    if (!selectedWidgetType) return null
    
    if(selectedWidgetType.value == 'table') return renderTableConfig();

    return selectedWidgetType.configFields.map((field) => {
      switch (field.type) {
        case "text":
          return (
            <div key={field.name} className="mb-4">
              <Label htmlFor={field.name} className="mb-2 block">
                {field.label}
                {field.required && <span className="text-ui-fg-error ml-1">*</span>}
              </Label>
              <Input
                id={field.name}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={configValues[field.name] || ""}
                onChange={(e) => handleConfigChange(field.name, e.target.value)}
                required={field.required}
              />
            </div>
          )

        case "number":
          return (
            <div key={field.name} className="mb-4">
              <Label htmlFor={field.name} className="mb-2 block">
                {field.label}
                {field.required && <span className="text-ui-fg-error ml-1">*</span>}
              </Label>
              <Input
                id={field.name}
                type="number"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={configValues[field.name] || ""}
                onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
                required={field.required}
              />
            </div>
          )

        case "select":
          return (
            <ConfigSelect
              key={field.name}
              field={field}
              value={configValues[field.name] || ""}
              onChange={(value) => handleConfigChange(field.name, value)}
            />
          )

        case "boolean":
          return (
            <div key={field.name} className="mb-4">
              <div className="flex items-center gap-2">
                <Switch
                  id={field.name}
                  checked={configValues[field.name] || false}
                  onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
                />
                <Label htmlFor={field.name}>{field.label}</Label>
              </div>
            </div>
          )

        default:
          return null
      }
    })
  }

  const renderActionSelect = () => {
    return (
      <div className="mb-4">
        <Label htmlFor="action-select" className="mb-2 block">
          Data Action <span className="text-ui-fg-error ml-1">*</span>
        </Label>
    <CustomSelect
            value={selectedAction || ""}
            onValueChange={(val) => setSelectedAction(val)}
            options={actionOptions}
            placeholder="Select data action..."
          />
      </div>
    )
  }


  console.log(jsonConfig, 'JSONs')
  const renderStepContent = () => {
    if (isJsonMode) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Code className="text-ui-fg-subtle" />
            <Heading level="h2">JSON Configuration</Heading>
          </div>
          <UiText className="text-ui-fg-subtle mb-6">
            Edit the widget configuration directly in JSON format
          </UiText>
          <div className="border border-ui-border-base rounded-lg">
            <JsonEditor
              value={jsonConfig}
              onChange={setJsonConfig}
              height="500px"
              placeholder={JSON.stringify(defaultJsonConfig, null, 2)}
            />
          </div>

          {/* <div className="mt-6">
            <Heading level="h3" className="mb-4">
              Data Action
            </Heading>
            {renderActionSelect()}
          </div> */}
        </div>
      )
    }

    switch (currentStep) {
      case 0:
        return (
          <div>
            <Heading level="h2" className="mb-4">Basic Information</Heading>
            <UiText className="text-ui-fg-subtle mb-6">
              Set the basic details for your widget
            </UiText>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="mb-2 block">
                  Widget Title <span className="text-ui-fg-error ml-1">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter widget title"
                />
              </div>

              <div>
                <Label htmlFor="description" className="mb-2 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

                        <Heading level="h2" className="mb-4">Choose Widget Type</Heading>
                                     <div className="grid grid-cols-2 gap-4">
                                       {widgetTypes.map(type => (
                                         <button
                                           key={type.value}
                                           disabled={type.disabled}
                                           className={`p-4 border rounded-lg text-left hover:border-ui-border-interactive transition-colors ${
                                             selectedType === type.value 
                                               ? "border-ui-border-interactive bg-ui-bg-base-hover" 
                                               : "border-ui-border-base"
                                           }`}
                                           onClick={() => setSelectedType(type.value)}
                                         >
                                           <div className="flex items-center gap-2 mb-2">
                                             <span className="text-2xl">{type.icon}</span>
                                             <UiText weight="plus">{type.label}</UiText>
                                             {type.value === selectedType && (
                                               <Badge color="green" size="small" className="ml-auto">
                                                 Selected
                                               </Badge>
                                             )}
                                           </div>
                                           <UiText size="small" className="text-ui-fg-subtle">
                                             {type.description}
                                           </UiText>
                                         </button>
                                       ))}
                                     </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{selectedWidgetType?.icon}</span>
              <Heading level="h2">Configure {selectedWidgetType?.label}</Heading>
            </div>
            
            <UiText className="text-ui-fg-subtle mb-6">
              Set the properties for your {selectedWidgetType?.label.toLowerCase()}
            </UiText>
            
            <div className="space-y-4">
              {renderConfigFields()}
            </div>
          </div>
        )

      case 2:
        return (
          <div>
            <Heading level="h2" className="mb-4">Select Data Action</Heading>
            <UiText className="text-ui-fg-subtle mb-6">
              Choose the data source for this widget
            </UiText>
            
            {renderActionSelect()}

            {selectedAction && (
              <div className="mt-4 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
                <UiText weight="plus" size="small" className="mb-1">
                  Selected Action
                </UiText>
                <UiText className="text-ui-fg-subtle">
                  {actionOptions.find(a => a.value === selectedAction)?.description}
                </UiText>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

console.log(widget, 'WIDGET')
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="z-40">
        <Drawer.Header>
          <Drawer.Title>Edit Widget</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full p-4">
            {/* Progress Steps - hide in JSON mode */}
            {!isJsonMode && (
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <React.Fragment key={index}>
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${
                              index < currentStep
                                ? "bg-ui-bg-interactive text-white"
                                : index === currentStep
                                ? "border-2 border-ui-border-interactive text-ui-fg-base"
                                : "border border-ui-border-base text-ui-fg-subtle"
                            }
                          `}
                        >
                          {index < currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
                        </div>
                        <div className="flex flex-col">
                          <UiText weight="plus" size="small">
                            {step.title}
                          </UiText>
                          <UiText size="xsmall" className="text-ui-fg-subtle">
                            {step.description}
                          </UiText>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className="flex-1 h-px bg-ui-border-base mx-4" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Step Content */}
            <div className="bg-ui-bg-subtle rounded-lg p-6">
              {renderStepContent()}
            </div>

            {/* Summary for non-JSON mode on final step */}
            {!isJsonMode && currentStep === 2 && Object.keys(configValues).length > 0 && (
              <div className="mt-6 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
                <Heading level="h3" className="mb-3">Configuration Summary</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <UiText size="small" className="text-ui-fg-subtle">Type</UiText>
                    <UiText weight="plus">{selectedWidgetType?.label}</UiText>
                  </div>
                  <div>
                    <UiText size="small" className="text-ui-fg-subtle">Action</UiText>
                    <UiText weight="plus">
                      {actionOptions.find(a => a.value === selectedAction)?.label}
                    </UiText>
                  </div>
                </div>
                <div className="mt-3">
                  <UiText size="small" className="text-ui-fg-subtle">Configuration</UiText>
                  <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(configValues).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <UiText size="small" className="text-ui-fg-subtle capitalize min-w-[100px]">
                          {key}:
                        </UiText>
                        <UiText size="small" className="truncate">
                          {value !== null && value !== undefined ? String(value) : "—"}
                        </UiText>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!isJsonMode && currentStep > 0 && (
                <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeft className="mr-2" />
                  Back
                </Button>
              )}

              {!isJsonMode && currentStep === 0 && widget.type !== "custom" && (
                <Button variant="secondary" onClick={toggleJsonMode} disabled={isSubmitting}>
                  <Code className="mr-2" />
                  Edit as JSON
                </Button>
              )}

              {isJsonMode && (
                <Button variant="secondary" onClick={toggleJsonMode} disabled={isSubmitting}>
                  <Puzzle className="mr-2" />
                  Back to Form
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {!isJsonMode && currentStep < steps.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!isStepValid() || isSubmitting}
                >
                  Next
                  <ArrowRight className="ml-2" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSubmitting}
                  disabled={!isStepValid()}
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}