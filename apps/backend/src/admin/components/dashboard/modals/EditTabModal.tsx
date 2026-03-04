import React, { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text as UiText,
  Label,
  Input,
  Textarea,
  Select,
  Drawer,
  Switch,
  Badge,
  toast,
  DropdownMenu,
} from "@medusajs/ui"
import {
  ArrowLeft,
  CheckCircle,
  Trash,
  Puzzle,
  Code,
  ChevronDown,
} from "@medusajs/icons"
import { ArrowRight } from "lucide-react"
import { DashboardTab } from "../../../../types/dashboards"
import { useExecution } from "../../../hooks/api/actions"

// ---------- Types (same as AddWidgetModal) ----------
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

// ---------- Widget type definitions (used for configuration UI) ----------
const widgetTypes: WidgetType[] = [
  {
    value: "stat",
    label: "Statistic Card",
    description: "Display key metrics",
    icon: "📊",
    configFields: [
      { name: "title", label: "Card Title", type: "text", required: false },
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
          { value: "currency_dollar", label: "Currency" },
        ],
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
          { value: "purple", label: "Purple" },
        ],
      },
      {
        name: "format",
        label: "Number Format",
        type: "select",
        options: [
          { value: "number", label: "Plain Number" },
          { value: "currency", label: "Currency ($)" },
          { value: "percentage", label: "Percentage (%)" },
          { value: "compact", label: "Compact (1.2K)" },
        ],
      },
    ],
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
          { value: "radar", label: "Radar Chart" },
        ],
      },
      { name: "xAxis", label: "X-Axis Field", type: "text", required: true },
      { name: "yAxis", label: "Y-Axis Field", type: "text", required: true },
      { name: "height", label: "Chart Height (px)", type: "number", required: false },
      { name: "showLegend", label: "Show Legend", type: "boolean", required: false },
    ],
  },
  {
    value: "table",
    label: "Table",
    description: "Show tabular data",
    icon: "📋",
    configFields: [
      { name: "title", label: "Table Title", type: "text", required: false },
      { name: "pageSize", label: "Rows per page", type: "number", required: false },
      { name: "showSearch", label: "Show Search", type: "boolean", required: false },
      { name: "showFilters", label: "Show Filters", type: "boolean", required: false },
      { name: "dense", label: "Dense Layout", type: "boolean", required: false },
      { name: "stickyHeader", label: "Sticky Header", type: "boolean", required: false },
    ],
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
      { name: "showAvatars", label: "Show Avatars", type: "boolean", required: false },
    ],
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
          { value: "red", label: "Red" },
        ],
      },
    ],
  },
]

// ---------- Reusable config field renderer (used inside drawer) ----------
interface ConfigFieldRendererProps {
  field: ConfigField
  value: any
  onChange: (value: any) => void
}

const ConfigFieldRenderer: React.FC<ConfigFieldRendererProps> = ({ field, value, onChange }) => {
  switch (field.type) {
    case "text":
      return (
        <Input
          id={field.name}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          placeholder={`Enter ${field.label.toLowerCase()}`}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <Select.Trigger className="w-full">
            <Select.Value placeholder={`Select ${field.label.toLowerCase()}`} />
          </Select.Trigger>
          <Select.Content className="z-[100]">
            {field.options?.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      )
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch id={field.name} checked={!!value} onCheckedChange={onChange} />
          <Label htmlFor={field.name}>{field.label}</Label>
        </div>
      )
    default:
      return null
  }
}

// ---------- Multi‑select dropdown using Medusa UI DropdownMenu ----------
interface MultiSelectDropdownProps {
  options: Array<{ value: string; label: string }>
  selectedValues: string[]
  onChange: (values: string[]) => void
  isLoading?: boolean
  placeholder?: string
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  isLoading = false,
  placeholder = "Select widgets",
}) => {
  const [open, setOpen] = useState(false)

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" className="w-full justify-between">
          <span>
            {selectedValues.length === 0
              ? placeholder
              : `${selectedValues.length} widget(s) selected`}
          </span>
          <ChevronDown />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content 
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto z-[100]"
        align="start"
        sideOffset={8}
      >
        {isLoading ? (
          <div className="p-2 text-ui-fg-muted">Loading...</div>
        ) : options.length === 0 ? (
          <div className="p-2 text-ui-fg-muted">No widgets available</div>
        ) : (
          options.map((option) => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onSelect={(e) => {
                e.preventDefault()
                toggleValue(option.value)
              }}
            >
              {option.label}
            </DropdownMenu.CheckboxItem>
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}


// ---------- Props ----------
interface EditTabModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: DashboardTab | null
  onSave: (updates: Partial<DashboardTab>) => Promise<void>
}

export const EditTabModal: React.FC<EditTabModalProps> = ({
  open,
  onOpenChange,
  tab,
  onSave,
}) => {
    // Selected widgets that will be part of the tab
    const [selectedWidgets, setSelectedWidgets] = useState<
      Array<{
        id: string
        type: string
        title: string
        config: Record<string, any>
      }>
    >([])
  const [currentStep, setCurrentStep] = useState(0)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [layout, setLayout] = useState({
    gap: 16,
    columns: 12,
    rowHeight: 100,
  })
  const [widgets, setWidgets] = useState<any>([])
  const [isLoading, setIsLoading] = useState(false)
  // Configuration drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null)
  const [tempConfig, setTempConfig] = useState<Record<string, any>>({})
    const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([])
  
  const { data: executionResult, isPending: isOptionsLoading } = useExecution("get-dashboard-widgets")

  // Safely access the data - handle different response structures
  const availableWidgets = React.useMemo(() => {
    if (!executionResult) return []
    
    // Handle case where data is nested in executionResult.data
    if (executionResult.data && Array.isArray(executionResult.data)) {
      return executionResult.data
    }
    
    // Handle case where executionResult itself is the array
    if (Array.isArray(executionResult)) {
      return executionResult
    }
    
    // Handle case where data is in executionResult.result
    if (executionResult.result && Array.isArray(executionResult.result)) {
      return executionResult.result
    }
    
    return []
  }, [executionResult])



  const steps = [
    { title: "Tab Details", description: "Name and description" },
    { title: "Widgets", description: "Configure widgets" },
  ]


  // Prepare options for multi‑select
  const widgetOptions = React.useMemo(() => {
    return availableWidgets.map((w: any) => ({
      value: w.id,
      label: w.name || w.label || w.title || "Unnamed Widget",
    }))
  }, [availableWidgets])

  // Reset form when tab changes or modal opens
  useEffect(() => {
    if (tab && open) {
      setTitle(tab.title || "")
      setDescription(tab.description || "")
      setLayout({
        gap: tab.layout?.gap || 16,
        columns: tab.layout?.columns || 12,
        rowHeight: tab.layout?.rowHeight || 100,
      })
      setWidgets(tab.widgets || [])
      setSelectedWidgets(tab.widgets || [])
      setCurrentStep(0)
    }
  }, [tab, open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTitle("")
        setDescription("")
        setLayout({ gap: 16, columns: 12, rowHeight: 100 })
        setWidgets([])
        setCurrentStep(0)
        setIsLoading(false)
      }, 200)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  const isStepValid = () => {
    if (currentStep === 0) {
      return title.trim() !== ""
    }
    return widgets.length > 0
  }

  const handleNext = () => setCurrentStep(1)
  const handleBack = () => setCurrentStep(0)

  // Add selected widgets from the multi‑select dropdown
  const handleAddSelectedWidgets = () => {
    if (!availableWidgets.length) return

    const newWidgets = selectedWidgetIds
      .map((id) => {
        const src = availableWidgets.find((w: any) => w.id === id)
        if (!src) return null
        return {
          id: src.id,
          type: src.metadata.type,
          title: src.name || src.label || "New Widget",
          config: src.configuration ? { ...src.configuration } : {},
        }
      })
      .filter(Boolean) as Array<{
        id: string
        type: string
        title: string
        config: Record<string, any>
      }>

    if (newWidgets.length > 0) {
      setSelectedWidgets([...selectedWidgets, ...newWidgets])
      setWidgets([...widgets, ...newWidgets])
      setSelectedWidgetIds([]) // clear selection
      toast.success(`${newWidgets.length} widget(s) added`)
    }
  }

  // Remove a widget
  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id))
    setSelectedWidgets(selectedWidgets.filter((w) => w.id !== id))
    toast.success("Widget removed")
  }

  // Open configuration drawer
  const handleOpenConfig = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget) return
    setEditingWidgetId(widgetId)
    setTempConfig({ ...widget.config })
    setEditDrawerOpen(true)
  }

  // Save configuration from drawer
  const handleSaveConfig = () => {
    if (!editingWidgetId) return
    setWidgets((prev) =>
      prev.map((w) => (w.id === editingWidgetId ? { ...w, config: tempConfig } : w))
    )
    setEditDrawerOpen(false)
    setEditingWidgetId(null)
    setTempConfig({})
    toast.success("Widget configuration updated")
  }

  const handleSave = async () => {
    if (!isStepValid()) return

    setIsLoading(true)
    
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        layout,
        widgets,
      })
      toast.success("Tab updated successfully")
      // onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update tab")
      console.error("Error updating tab:", error)
    } finally {
      setIsLoading(false)
    }
  }




  if (!tab) return null




  return (
    <>
      <FocusModal open={open} onOpenChange={onOpenChange}>
        <FocusModal.Content className="z-20">
          <FocusModal.Header>
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="secondary" onClick={handleBack} disabled={isLoading}>
                    <ArrowLeft className="mr-2" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentStep < 1 && (
                  <Button variant="primary" onClick={handleNext} disabled={!isStepValid()}>
                    Next
                    <ArrowRight className="ml-2" />
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isLoading}
                    disabled={!isStepValid()}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
            <div className="max-w-2xl w-full p-8">
              {/* Header */}
              <div className="mb-8">
                <Heading level="h1" className="mb-2">
                  Edit Tab
                </Heading>
                <UiText className="text-ui-fg-subtle">
                  Update your tab in two simple steps
                </UiText>
              </div>

              {/* Progress Steps */}
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

              {/* Step Content */}
              <div className="bg-ui-bg-subtle rounded-lg p-6">
                {currentStep === 0 && (
                  <div onKeyDown={handleKeyDown}>
                    <Heading level="h2" className="mb-4">
                      Tab Details
                    </Heading>
                    <UiText className="text-ui-fg-subtle mb-6">
                      Update the tab name and description
                    </UiText>
                    
                    <div className="space-y-4">
                      {/* Tab Title */}
                      <div>
                        <Label htmlFor="tab-title" className="mb-2 block">
                          Tab Title <span className="text-ui-fg-error">*</span>
                        </Label>
                        <Input
                          id="tab-title"
                          placeholder="e.g., Analytics, Reports, Overview"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          autoFocus
                          disabled={isLoading}
                          className="w-full"
                        />
                      </div>

                      {/* Tab Description */}
                      <div>
                        <Label htmlFor="tab-description" className="mb-2 block">
                          Description <span className="text-ui-fg-muted">(optional)</span>
                        </Label>
                        <Textarea
                          id="tab-description"
                          placeholder="Describe what this tab is for..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          disabled={isLoading}
                          className="w-full resize-none"
                        />
                      </div>

                      {/* Layout Settings */}
                      <div className="mt-6">
                        <Heading level="h3" className="mb-3">
                          Grid Settings
                        </Heading>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="gap" className="mb-2 block">
                              Gap (px)
                            </Label>
                            <Input
                              id="gap"
                              type="number"
                              value={layout.gap}
                              onChange={(e) =>
                                setLayout({ ...layout, gap: parseInt(e.target.value) || 16 })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="columns" className="mb-2 block">
                              Columns
                            </Label>
                            <Input
                              id="columns"
                              type="number"
                              value={layout.columns}
                              onChange={(e) =>
                                setLayout({ ...layout, columns: parseInt(e.target.value) || 12 })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="rowHeight" className="mb-2 block">
                              Row Height (px)
                            </Label>
                            <Input
                              id="rowHeight"
                              type="number"
                              value={layout.rowHeight}
                              onChange={(e) =>
                                setLayout({ ...layout, rowHeight: parseInt(e.target.value) || 100 })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div>
                    <Heading level="h2" className="mb-4">
                      Layout & Widgets
                    </Heading>

                    {/* Layout Settings */}
                    <div className="mb-6">
                      <Heading level="h3" className="mb-3">
                        Grid Settings
                      </Heading>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="gap" className="mb-2 block">
                            Gap (px)
                          </Label>
                          <Input
                            id="gap"
                            type="number"
                            value={layout.gap}
                            onChange={(e) =>
                              setLayout({ ...layout, gap: parseInt(e.target.value) || 16 })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="columns" className="mb-2 block">
                            Columns
                          </Label>
                          <Input
                            id="columns"
                            type="number"
                            value={layout.columns}
                            onChange={(e) =>
                              setLayout({ ...layout, columns: parseInt(e.target.value) || 12 })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="rowHeight" className="mb-2 block">
                            Row Height (px)
                          </Label>
                          <Input
                            id="rowHeight"
                            type="number"
                            value={layout.rowHeight}
                            onChange={(e) =>
                              setLayout({ ...layout, rowHeight: parseInt(e.target.value) || 100 })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Add Widgets from pre‑built list */}
                    <div className="mb-6">
                      <Heading level="h3" className="mb-3">
                        Add Pre‑built Widgets
                      </Heading>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label htmlFor="widget-select" className="mb-2 block">
                            Select Widgets
                          </Label>
                          <MultiSelectDropdown
                            options={widgetOptions}
                            selectedValues={selectedWidgetIds}
                            onChange={setSelectedWidgetIds}
                            isLoading={isLoading}
                            placeholder="Choose widgets to add"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          onClick={handleAddSelectedWidgets}
                          disabled={selectedWidgetIds.length === 0}
                        >
                          Add Selected
                        </Button>
                      </div>
                    </div>

                    {/* Widget List */}
                    {selectedWidgets.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-ui-border-base rounded-lg">
                        <UiText className="text-ui-fg-muted">
                          No widgets added yet. Use the selector above to add some.
                        </UiText>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedWidgets.map((widget) => {
                          const typeDef = widgetTypes.find((t) => t.value === widget.type)
                          return (
                            <div
                              key={widget.id}
                              className="flex items-center gap-3 p-3 bg-ui-bg-base border border-ui-border-base rounded-lg"
                            >
                              <span className="text-2xl">{typeDef?.icon || "📦"}</span>
                              <div className="flex-1">
                                <Input
                                  value={widget.title}
                                  onChange={(e) => handleTitleChange(widget.id, e.target.value)}
                                  placeholder="Widget title"
                                  className="mb-1"
                                />
                                <UiText size="small" className="text-ui-fg-subtle">
                                  {typeDef?.label || widget.type}
                                </UiText>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() => handleOpenConfig(widget.id)}
                                >
                                  <Puzzle className="mr-2" />
                                  Configure
                                </Button> */}
                                <Button
                                  variant="danger"
                                  size="small"
                                  onClick={() => handleRemoveWidget(widget.id)}
                                >
                                  <Trash />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary */}
              {currentStep === 1 && widgets.length > 0 && (
                <div className="mt-6 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
                  <Heading level="h3" className="mb-3">
                    Summary
                  </Heading>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ui-fg-subtle">Tab Title</span>
                      <span className="font-medium">{title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ui-fg-subtle">Widgets</span>
                      <span className="font-medium">{widgets.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ui-fg-subtle">Grid</span>
                      <span className="font-medium">
                        {layout.columns} cols, {layout.rowHeight}px rows
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts */}
              <div className="mt-4 flex items-center justify-end gap-4 text-xs text-ui-fg-muted">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">Enter</kbd>
                  <span className="ml-1">to save</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">Esc</kbd>
                  <span className="ml-1">to cancel</span>
                </span>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Configuration Drawer */}
      <Drawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
        <Drawer.Content className="z-50">
          <Drawer.Header>
            <Drawer.Title>Configure Widget</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            {editingWidgetId && (
              <div className="space-y-6">
                {(() => {
                  const widget = widgets.find((w) => w.id === editingWidgetId)
                  const typeDef = widgetTypes.find((t) => t.value === widget?.type)
                  if (!widget || !typeDef) return null

                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeDef.icon}</span>
                        <Heading level="h2">{typeDef.label} Configuration</Heading>
                      </div>

                      <UiText className="text-ui-fg-subtle">
                        Adjust the properties for this {typeDef.label.toLowerCase()}
                      </UiText>

                      {typeDef.configFields.map((field) => (
                        <div key={field.name} className="mb-4">
                          <Label htmlFor={`edit-${field.name}`} className="mb-2 block">
                            {field.label}
                            {field.required && <span className="text-ui-fg-error ml-1">*</span>}
                          </Label>
                          <ConfigFieldRenderer
                            field={field}
                            value={tempConfig[field.name]}
                            onChange={(val) =>
                              setTempConfig((prev) => ({ ...prev, [field.name]: val }))
                            }
                          />
                        </div>
                      ))}
                    </>
                  )
                })()}
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditDrawerOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveConfig}>
                Save Configuration
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}