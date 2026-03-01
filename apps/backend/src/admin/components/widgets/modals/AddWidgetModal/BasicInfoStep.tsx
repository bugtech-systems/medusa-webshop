import React, { useState } from "react"
import {
  Button,
  Heading,
  Text,
  Input,
  Label,
  Select,
  Textarea,
} from "@medusajs/ui"
import {
  DocumentText,
  ChartBar,
  ListBullet,
  Clock,
  Star,
} from "@medusajs/icons"
import { Table as TableIcon } from 'lucide-react'
import { getAvailableWidgetTypes, getWidgetTypeName } from "../../../../utils/dashboards/widgetHelpers"
import { useExecution } from "../../../../hooks/api/actions"


interface BasicInfoStepProps {
  data: {
    title: string
    description: string
    type: string,
    action_id: string
  }
  onChange: (data: any) => void
  onNext: () => void
}

const widgetTypeIcons: Record<string, any> = {
  stat: DocumentText,
  chart: ChartBar,
  table: TableIcon,
  list: ListBullet,
  progress: Clock,
  kpi: Star,
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


export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  onNext,
}) => {
  let { data: actions } = useExecution("get-active-actions") as any;
  const widgetTypes = getAvailableWidgetTypes()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!data.title?.trim()) {
      newErrors.title = "Title is required"
    }
    if (!data.type) {
      newErrors.type = "Widget type is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const handleTypeChange = (value: string) => {
    onChange({ ...data, type: value })
    setIsSelectOpen(false)
  }

  // Find selected type label for display
  const selectedType = data.type 
    ? widgetTypes.find(t => t.value === data.type)
    : null

  let actionOptions = actions ? actions.data : [];


  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Heading level="h2" className="text-lg">
          Basic Information
        </Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Enter the basic details for your widget
        </Text>
      </div>

      <div>
        <Label htmlFor="widget-title" className="text-ui-fg-subtle">
          Widget Title <span className="text-ui-fg-error">*</span>
        </Label>
        <Input
          id="widget-title"
          placeholder="e.g., Total Orders, Revenue Chart"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="mt-1"
        />
        {errors.title && (
          <Text size="small" className="text-ui-tag-red-text mt-1">
            {errors.title}
          </Text>
        )}
      </div>

      <div>
        <Label htmlFor="widget-description" className="text-ui-fg-subtle">
          Description <span className="text-ui-fg-muted">(optional)</span>
        </Label>
        <Textarea
          id="widget-description"
          placeholder="Describe what this widget shows..."
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>
        <div>
          <Label>Data Action</Label>
          <CustomSelect
            value={data.action_id || ""}
            onValueChange={(val) => onChange({ ...data, action_id: val })}
            options={actionOptions.map((action: any) => ({
              value: action.id,
              label: `${action.name} (${action.handle})`
            }))}
          />
        </div> 
      <div>
        <Label htmlFor="widget-type" className="text-ui-fg-subtle">
          Widget Type <span className="text-ui-fg-error">*</span>
        </Label>
        
        {/* Custom Select Implementation */}
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => setIsSelectOpen(!isSelectOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-ui-bg-base border border-ui-border-base rounded-lg hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          >
            {selectedType ? (
              <div className="flex items-center gap-2">
                {selectedType.value && widgetTypeIcons[selectedType.value] && (
                  <div className="w-5 h-5 text-ui-fg-subtle">
                    {React.createElement(widgetTypeIcons[selectedType.value], { className: "w-5 h-5" })}
                  </div>
                )}
                <div className="text-left">
                  <Text size="small" weight="plus">{selectedType.label}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {selectedType.category}
                  </Text>
                </div>
              </div>
            ) : (
              <span className="text-ui-fg-muted">Select widget type...</span>
            )}
            <svg 
              className={`w-4 h-4 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isSelectOpen && (
            <>
              {/* Backdrop for clicking outside */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsSelectOpen(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute z-50 w-full mt-1 bg-ui-bg-base border border-ui-border-base rounded-lg shadow-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  {widgetTypes.map((type) => {
                    const Icon = widgetTypeIcons[type.value] || DocumentText
                    const isSelected = data.type === type.value
                    
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeChange(type.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover transition-colors ${
                          isSelected ? 'bg-ui-bg-base-hover' : ''
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <Icon className="w-5 h-5 text-ui-fg-subtle" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text size="small" weight="plus" className="truncate">
                            {type.label}
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-subtle truncate">
                            {type.category} • {type.description}
                          </Text>
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 text-ui-fg-interactive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        
        {errors.type && (
          <Text size="small" className="text-ui-tag-red-text mt-1">
            {errors.type}
          </Text>
        )}
      </div>

      {data.type && (
        <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Heading level="h3" className="text-sm font-medium mb-1">
                {getWidgetTypeName(data.type)} Configuration
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {widgetTypes.find(t => t.value === data.type)?.description}
              </Text>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          variant="primary" 
          onClick={handleNext}
          disabled={!data.title?.trim() || !data.type}
        >
          Next: Configure Widget
        </Button>
      </div>
    </div>
  )
}