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
import {
  DocumentText,
  ListBullet,
} from "@medusajs/icons"
import { 
  Table as TableIcon
} from 'lucide-react'
import { useExecution } from "../../../../hooks/api/actions"

interface BasicInfoStepProps {
  data: {
    title: string
    description: string
    type: string
    action_id: string
  }
  onChange: (data: any) => void
  onNext: () => void
}

const reportTypeIcons: Record<string, any> = {
  table: TableIcon,
  list: ListBullet,
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

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  onNext,
}) => {
  const { data: actionsData } = useExecution("get-active-actions") as any;
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reportTypes = [
    { 
      value: "table", 
      label: "Table Report", 
      description: "Display data in a sortable, filterable table format"
    },
    { 
      value: "list", 
      label: "List Report", 
      description: "Show data as a formatted list with icons"
    },
  ]

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!data.title?.trim()) {
      newErrors.title = "Title is required"
    }
    if (!data.type) {
      newErrors.type = "Report type is required"
    }
    if (!data.action_id) {
      newErrors.action_id = "Data action is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const actionOptions = actionsData?.data ? actionsData.data.map((action: any) => ({
    value: action.id,
    label: action.name,
    description: `Handle: ${action.handle}`
  })) : []

  // Find selected type for display
  const selectedType = data.type 
    ? reportTypes.find(t => t.value === data.type)
    : null

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Heading level="h2" className="text-lg">
            Basic Information
          </Heading>
          <Badge color="blue" size="small">
            Step 1 of 2
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Enter the basic details for your report
        </Text>
      </div>

      {/* Report Title */}
      <div>
        <Label htmlFor="report-title" className="text-ui-fg-subtle">
          Report Title <span className="text-ui-fg-error">*</span>
        </Label>
        <Input
          id="report-title"
          placeholder="e.g., Orders Report, Customer List"
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

      {/* Description */}
      <div>
        <Label htmlFor="report-description" className="text-ui-fg-subtle">
          Description <span className="text-ui-fg-muted">(optional)</span>
        </Label>
        <Textarea
          id="report-description"
          placeholder="Describe what this report shows..."
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      {/* Data Action */}
      <div>
        <Label htmlFor="data-action" className="text-ui-fg-subtle">
          Data Action <span className="text-ui-fg-error">*</span>
        </Label>
        <div className="mt-1">
          <CustomSelect
            value={data.action_id || ""}
            onValueChange={(val) => onChange({ ...data, action_id: val })}
            options={actionOptions}
            placeholder="Select data action..."
            error={errors.action_id}
          />
        </div>
        {errors.action_id && (
          <Text size="small" className="text-ui-tag-red-text mt-1">
            {errors.action_id}
          </Text>
        )}
      </div>

      {/* Report Type */}
      <div>
        <Label htmlFor="report-type" className="text-ui-fg-subtle">
          Report Type <span className="text-ui-fg-error">*</span>
        </Label>
        
        {/* Report Type Cards */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {reportTypes.map((type) => {
            const Icon = reportTypeIcons[type.value] || DocumentText
            const isSelected = data.type === type.value
            
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange({ ...data, type: type.value })}
                className={`p-4 border rounded-lg text-left hover:border-ui-border-interactive transition-colors ${
                  isSelected 
                    ? "border-ui-border-interactive bg-ui-bg-base-hover ring-2 ring-ui-border-interactive ring-offset-2" 
                    : "border-ui-border-base"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-ui-bg-interactive text-white' : 'bg-ui-bg-base-hover'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <Text weight="plus" size="small" className="mb-1">
                      {type.label}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {type.description}
                    </Text>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        
        {errors.type && (
          <Text size="small" className="text-ui-tag-red-text mt-2">
            {errors.type}
          </Text>
        )}
      </div>

      {/* Selected Type Preview */}
      {selectedType && (
        <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Heading level="h3" className="text-sm font-medium mb-1">
                {selectedType.label} Configuration
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                You'll be able to configure fields, sorting, filtering, and search options in the next step.
              </Text>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button 
          variant="primary" 
          onClick={handleNext}
          disabled={!data.title?.trim() || !data.type || !data.action_id}
        >
          Next: Configure Fields
        </Button>
      </div>
    </div>
  )
}