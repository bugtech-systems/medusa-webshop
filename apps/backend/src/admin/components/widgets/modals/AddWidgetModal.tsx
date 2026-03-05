import React, { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text as UiText,
  Label,
  Select,
  Input,
  Badge,
  Switch,
  Container,
  Textarea,
} from "@medusajs/ui"
import {
  ArrowLeft,
  CheckCircle,
  Code,
  Puzzle,
} from "@medusajs/icons"
import { ArrowRight } from "lucide-react"
import JsonEditor from "../../../components/jsonEditor" // Adjust path
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

interface AddWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widgetData: any) => void
}

// Widget type definitions with their specific configuration fields
const widgetTypes = [
  { 
    value: "stat", 
    label: "Statistic Card", 
    description: "Display key metrics",
    icon: "📊",
    configFields: [
      { name: "title", label: "Card Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "text", required: false },
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
    value: "chart", 
    label: "Chart", 
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
    value: "table", 
    label: "Table", 
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
    value: "list", 
    label: "List", 
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

// Mock actions for the dropdown - in real app, fetch from API
const availableActions = [
  { value: "get-users", label: "Get Users", description: "Retrieve all users" },
  { value: "get-orders", label: "Get Orders", description: "Retrieve recent orders" },
  { value: "get-revenue", label: "Get Revenue", description: "Calculate total revenue" },
  { value: "get-products", label: "Get Products", description: "List all products" },
  { value: "get-stats", label: "Get Statistics", description: "Dashboard statistics" },
  { value: "get-customers", label: "Get Customers", description: "Customer list" }
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

// ---------- Reusable Select Field Component ----------
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
                    <UiText size="small" weight="plus">{option.label}</UiText>
                    {option.description && (
                      <UiText size="xsmall" className="text-ui-fg-subtle">
                        {option.description}
                      </UiText>
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
        <Select.Content className="z-50"> {/* 👈 Force high z-index */}
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
export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  open,
  onOpenChange,
  onAddWidget,
}) => {
    const { data: actionsData } = useExecution("get-active-actions") as any;
  
  const [formData, setFormData] = useState<any>({});
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedType, setSelectedType] = useState("stat")
  const [configValues, setConfigValues] = useState<Record<string, any>>({})
  const [selectedAction, setSelectedAction] = useState("")
  const [isJsonMode, setIsJsonMode] = useState(false)
  const [jsonConfig, setJsonConfig] = useState<any>({})
  const [isLoadingActions, setIsLoadingActions] = useState(false)

  const steps = [
    { title: "Widget Type", description: "Choose widget type" },
    { title: "Configure", description: "Set widget properties" },
    { title: "Data Action", description: "Select data source" },
  ]

  const selectedWidgetType = widgetTypes.find((w) => w.value === selectedType)
  const actionOptions = actionsData?.data ? actionsData.data.map((action: any) => ({
    value: action.id,
    label: action.name,
    description: `Handle: ${action.handle}`
  })) : []
  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0)
      setSelectedType("stat")
      setConfigValues({})
      setFormData({});
      setSelectedAction("")
      setIsJsonMode(false)
      setJsonConfig(defaultJsonConfig)
    }
  }, [open])

  // Simulate loading actions (replace with real fetch)
  useEffect(() => {
    if (currentStep === 2) {
      setIsLoadingActions(true)
      // Simulate API call
      const timer = setTimeout(() => setIsLoadingActions(false), 500)
      return () => clearTimeout(timer)
    }
  }, [currentStep])

  const handleFormChanges = (prop:any) => (e: any) => {
     setFormData({...formData, [prop]: e.target.value})
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleAdd = () => {
    let widgetData
    if (isJsonMode) {
      try {
        const parsedConfig = JSON.parse(jsonConfig)
        widgetData = parsedConfig;
      } catch (e) {
        console.error("Invalid JSON config", e)
        widgetData = {
          type: "custom",
          config: { error: "Invalid JSON", raw: jsonConfig },
          actionId: selectedAction,
          createdAt: new Date().toISOString(),
          isCustom: true,
        }
      }
    } else {
      widgetData = {
        ...formData,
        type: selectedType,
        config: configValues,
        action_id: selectedAction,
      }
    }
    onAddWidget(widgetData)
    onOpenChange(false)
  }

  const handleConfigChange = (fieldName: string, value: any) => {
    setConfigValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const toggleJsonMode = () => {
    setIsJsonMode(!isJsonMode)
    if (!isJsonMode) setCurrentStep(1) // reset to step 1 when switching to JSON
  }

  const isStepValid = () => {
    if (isJsonMode) {
      if (currentStep === 1) {
        try {
          JSON.parse(jsonConfig)
          return true
        } catch {
          return false
        }
      }
      if (currentStep === 2) return selectedAction !== ""
      return selectedType !== ""
    }

    switch (currentStep) {
      case 0:
        return selectedType !== ""
      case 1:
        if (!selectedWidgetType) return false
        return selectedWidgetType.configFields
          .filter((f) => f.required)
          .every((f) => configValues[f.name])
      case 2:
        return selectedAction !== ""
      default:
        return false
    }
  }

  const renderConfigFields = () => {
    if (!selectedWidgetType) return null

    return selectedWidgetType.configFields.map((field) => {
      const commonProps = {
        key: field.name,
        field,
        value: configValues[field.name] || "",
        onChange: (value: any) => handleConfigChange(field.name, value),
      }

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
          return <ConfigSelect {...commonProps} />

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



  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="z-20">
        <FocusModal.Header>
          <div className="flex items-center gap-2">
            {!isJsonMode && currentStep > 0 && (
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft className="mr-2" />
                Back
              </Button>
            )}

            {!isJsonMode && currentStep == 0  && (
              <Button variant="secondary" onClick={toggleJsonMode}>
                <Code className="mr-2" />
                Edit as JSON
              </Button>
            )}

            {isJsonMode && (
              <Button variant="secondary" onClick={toggleJsonMode}>
                <Puzzle className="mr-2" />
                Back to Form
              </Button>
            )}

            {!isJsonMode && currentStep < 2 && (
              <Button variant="secondary" onClick={handleNext}>
                Next
                <ArrowRight className="ml-2" />
              </Button>
            )}

            <Button variant="primary" onClick={handleAdd} disabled={!isStepValid()}>
              Add Widget
            </Button>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-4xl w-full p-8">
            {/* Header */}
            <div className="mb-8">
              <Heading level="h1" className="mb-2">
                {isJsonMode ? "Edit Widget JSON Configuration" : "Add Widget to Dashboard"}
              </Heading>
              <UiText className="text-ui-fg-subtle">
                {isJsonMode
                  ? "Configure your widget using JSON"
                  : "Configure your widget in three simple steps"}
              </UiText>
            </div>

            {/* Progress Steps */}
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
              {isJsonMode ? (
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

                  <div className="mt-6">
                    <Heading level="h3" className="mb-4">
                      Data Action
                    </Heading>
                    {renderActionSelect()}
                  </div>
                </div>
              ) : (
                <>
                   {/* Step 1: Widget Type Selection */}
                    {currentStep === 0 && (
                      <div>
                                    {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="mb-2 block">
                  Widget Title <span className="text-ui-fg-error ml-1">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleFormChanges('title')}
                  placeholder="Enter widget title"
                />
              </div>

              <div>
                <Label htmlFor="description" className="mb-2 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleFormChanges('description')}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
                        <Heading level="h2" className="mb-4">Choose Widget Type</Heading>
                        <div className="grid grid-cols-2 gap-4">
                          {widgetTypes.map(type => (
                            <button
                              key={type.value}
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
                    )}
  
                    {/* Step 2: Configuration */}
                    {currentStep === 1 && selectedWidgetType && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">{selectedWidgetType.icon}</span>
                          <Heading level="h2">Configure {selectedWidgetType.label}</Heading>
                        </div>
                        
                        <UiText className="text-ui-fg-subtle mb-6">
                          Set the properties for your {selectedWidgetType.label.toLowerCase()}
                        </UiText>
                        
                        <div className="space-y-4">
                          {renderConfigFields()}
                        </div>
                      </div>
                    )}
  
                    {/* Step 3: Data Action Configuration */}
                    {currentStep === 2 && (
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
                              {availableActions.find(a => a.value === selectedAction)?.description}
                            </UiText>
                          </div>
                        )}
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Summary */}
            {!isJsonMode && currentStep === 2 && (
              <div className="mt-6 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
                <Heading level="h3" className="mb-3">
                  Widget Summary
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <UiText size="small" className="text-ui-fg-subtle">
                      Type
                    </UiText>
                    <UiText weight="plus">{selectedWidgetType?.label}</UiText>
                  </div>
                  <div>
                    <UiText size="small" className="text-ui-fg-subtle">
                      Action
                    </UiText>
                    <UiText weight="plus">
                      {availableActions.find((a) => a.value === selectedAction)?.label}
                    </UiText>
                  </div>
                </div>
                {Object.keys(configValues).length > 0 && (
                  <div className="mt-3">
                    <UiText size="small" className="text-ui-fg-subtle">
                      Configuration
                    </UiText>
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
                )}
              </div>
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}