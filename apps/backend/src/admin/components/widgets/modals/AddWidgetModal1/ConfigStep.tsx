import React, { useState } from "react"
import {
  Button,
  Heading,
  Text,
  Input,
  Label,
  Textarea,
  Badge,
} from "@medusajs/ui"
import { getWidgetTypeName, validateWidgetConfig, getWidgetSizes } from "../../../../utils/dashboards/widgetHelpers"
import { useExecution } from "../../../../hooks/api/actions"

interface ConfigStepProps {
  type: string
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
  onBack: () => void
  onSave: () => void
}

// Custom Select Component
const CustomSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className = "",
}: {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-ui-bg-base border border-ui-border-base rounded-lg hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
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
                  <span className="text-sm">{option.label}</span>
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

export const ConfigStep: React.FC<ConfigStepProps> = ({
  type,
  config,
  onChange,
  onBack,
  onSave,
}) => {
  let { data: actions } = useExecution("get-active-actions") as any;
  const [errors, setErrors] = useState<Record<string, string>>({})


  const validate = () => {
    const { isValid, errors: validationErrors } = validateWidgetConfig(type, config)
    if (!isValid) {
      setErrors(validationErrors.reduce((acc, err) => ({ ...acc, general: err }), {}))
      return false
    }
    return true
  }

  const handleSave = () => {
    if (validate()) {
      onSave()
    }
  }



  const renderStatConfig = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Value</Label>
          <Input
            value={config.value || ""}
            onChange={(e) => onChange({ ...config, value: e.target.value })}
            placeholder="e.g., 1,234"
          />
        </div>
        <div>
          <Label>Format</Label>
          <CustomSelect
            value={config.format || "number"}
            onValueChange={(val) => onChange({ ...config, format: val })}
            options={[
              { value: "number", label: "Number" },
              { value: "currency", label: "Currency" },
              { value: "percentage", label: "Percentage" },
              { value: "text", label: "Text" },
            ]}
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Input
          value={config.description || ""}
          onChange={(e) => onChange({ ...config, description: e.target.value })}
          placeholder="Brief description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Trend (%)</Label>
          <Input
            type="number"
            value={config.trend || ""}
            onChange={(e) => onChange({ ...config, trend: e.target.value })}
            placeholder="12.5"
          />
        </div>
        <div>
          <Label>Icon Color</Label>
          <CustomSelect
            value={config.color || "blue"}
            onValueChange={(val) => onChange({ ...config, color: val })}
            options={[
              { value: "blue", label: "Blue" },
              { value: "green", label: "Green" },
              { value: "red", label: "Red" },
              { value: "orange", label: "Orange" },
              { value: "purple", label: "Purple" },
            ]}
          />
        </div>
      </div>

      <div>
        <Label>Icon</Label>
        <CustomSelect
          value={config.icon || "shopping-cart"}
          onValueChange={(val) => onChange({ ...config, icon: val })}
          options={[
            { value: "shopping-cart", label: "Shopping Cart" },
            { value: "users", label: "Users" },
            { value: "cube", label: "Cube" },
            { value: "currency", label: "Currency" },
            { value: "building", label: "Building" },
            { value: "chart", label: "Chart" },
          ]}
        />
      </div>
    </>
  )

  const renderChartConfig = () => (
    <>
      <div>
        <Label>Chart Type</Label>
        <CustomSelect
          value={config.type || "line"}
          onValueChange={(val) => onChange({ ...config, type: val })}
          options={[
            { value: "line", label: "Line Chart" },
            { value: "bar", label: "Bar Chart" },
            { value: "pie", label: "Pie Chart" },
            { value: "area", label: "Area Chart" },
          ]}
        />
      </div>

      <div>
        <Label>Data (JSON)</Label>
        <Textarea
          value={JSON.stringify(config.data || [], null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value)
              onChange({ ...config, data })
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={5}
          placeholder='[{"date": "Jan", "value": 100}]'
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.options?.showLegend || false}
              onChange={(e) => onChange({
                ...config,
                options: { ...config.options, showLegend: e.target.checked }
              })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Show Legend</Text>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.options?.showGrid || false}
              onChange={(e) => onChange({
                ...config,
                options: { ...config.options, showGrid: e.target.checked }
              })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Show Grid</Text>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.options?.animate !== false}
              onChange={(e) => onChange({
                ...config,
                options: { ...config.options, animate: e.target.checked }
              })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Animate</Text>
          </label>
        </div>
      </div>
    </>
  )

  const renderTableConfig = () => (
    <>
      <div>
        <Label>Columns (JSON)</Label>
        <Textarea
          value={JSON.stringify(config.columns || [], null, 2)}
          onChange={(e) => {
            try {
              const columns = JSON.parse(e.target.value)
              onChange({ ...config, columns })
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={4}
          placeholder='[{"key": "id", "label": "ID", "sortable": true}]'
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Page Size</Label>
          <Input
            type="number"
            value={config.pageSize || 5}
            onChange={(e) => onChange({ ...config, pageSize: parseInt(e.target.value) })}
            min={1}
            max={100}
          />
        </div>
        <div>
          <Label>Sortable</Label>
          <CustomSelect
            value={config.sortable ? "true" : "false"}
            onValueChange={(val) => onChange({ ...config, sortable: val === "true" })}
            options={[
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ]}
          />
        </div>
      </div>

      <div>
        <Label>Filterable</Label>
        <CustomSelect
          value={config.filterable ? "true" : "false"}
          onValueChange={(val) => onChange({ ...config, filterable: val === "true" })}
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
        />
      </div>
    </>
  )

  const renderListConfig = () => (
    <>
      <div>
        <Label>Items (JSON)</Label>
        <Textarea
          value={JSON.stringify(config.items || [], null, 2)}
          onChange={(e) => {
            try {
              const items = JSON.parse(e.target.value)
              onChange({ ...config, items })
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={5}
          placeholder='[{"label": "Item 1", "value": "100"}]'
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showIcons || false}
              onChange={(e) => onChange({ ...config, showIcons: e.target.checked })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Show Icons</Text>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.dense || false}
              onChange={(e) => onChange({ ...config, dense: e.target.checked })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Dense Layout</Text>
          </label>
        </div>
      </div>
    </>
  )

  const renderProgressConfig = () => (
    <>
      <div>
        <Label>Items (JSON)</Label>
        <Textarea
          value={JSON.stringify(config.items || [], null, 2)}
          onChange={(e) => {
            try {
              const items = JSON.parse(e.target.value)
              onChange({ ...config, items })
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={5}
          placeholder='[{"label": "Task 1", "progress": 75, "details": ["Detail 1"]}]'
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showPercentage !== false}
              onChange={(e) => onChange({ ...config, showPercentage: e.target.checked })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Show Percentage</Text>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showLabels !== false}
              onChange={(e) => onChange({ ...config, showLabels: e.target.checked })}
              className="rounded border-ui-border-base text-ui-fg-interactive focus:ring-ui-border-interactive"
            />
            <Text size="small">Show Labels</Text>
          </label>
        </div>
      </div>

      <div>
        <Label>Layout</Label>
        <CustomSelect
          value={config.layout || "stacked"}
          onValueChange={(val) => onChange({ ...config, layout: val })}
          options={[
            { value: "stacked", label: "Stacked" },
            { value: "grid", label: "Grid" },
          ]}
        />
      </div>
    </>
  )

  const renderConfigFields = () => {
    switch (type) {
      case "stat":
        return renderStatConfig()
      case "chart":
        return renderChartConfig()
      case "table":
        return renderTableConfig()
      case "list":
        return renderListConfig()
      case "progress":
        return renderProgressConfig()
      default:
        return (
          <div className="p-4 text-center bg-ui-bg-subtle rounded-lg">
            <Text className="text-ui-fg-subtle">
              No configuration options available for this widget type
            </Text>
          </div>
        )
    }
  }




  return (
    <div className="space-y-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Heading level="h2" className="text-lg">
            Configure {getWidgetTypeName(type)}
          </Heading>
          <Badge color="blue" size="small">
            Step 2 of 2
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Customize the widget's content and appearance
        </Text>
      </div>

      {errors.general && (
        <div className="p-3 bg-ui-tag-red-bg border border-ui-tag-red-border rounded-lg">
          <Text size="small" className="text-ui-tag-red-text">
            {errors.general}
          </Text>
        </div>
      )}

      <div className="space-y-4">
        {renderConfigFields()}

       
      </div>

      <div className="flex justify-between gap-2 pt-4 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Add Widget
        </Button>
      </div>
    </div>
  )
}