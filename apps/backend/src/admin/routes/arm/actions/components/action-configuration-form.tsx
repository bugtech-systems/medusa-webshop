// action-configuration-form.tsx
import { useState, useEffect } from "react"
import {
  Container,
  Heading,
  Button,
  CodeBlock,
  Text,
  Textarea,
  toast,
  Badge,

} from "@medusajs/ui"
import { 
  XIcon,
  Check,
  PenSquare, } from 'lucide-react';
import { useUpdateActionTemplate } from "../../../../hooks/api/actions"
import { removeNullKeys } from "../../../../../utils/helpers";

interface ActionConfigurationFormProps {
  action: any
  editMode: boolean
  onEditModeChange: (editMode: boolean) => void
}

interface JsonField {
  key: 'config' | 'output_template' | 'context_template'
  label: string
  description: string
  defaultValue: any
}

const JSON_FIELDS: JsonField[] = [
  {
    key: 'config',
    label: 'Configuration',
    description: 'JSON configuration for the action execution',
    defaultValue: {}
  },
  {
    key: 'output_template',
    label: 'Output Template',
    description: 'Template for formatting the action output',
    defaultValue: null
  },
  {
    key: 'context_template',
    label: 'Context Template',
    description: 'Template for the action execution context',
    defaultValue: null
  }
]

export const ActionConfigurationForm = ({ 
  action, 
  editMode, 
  onEditModeChange 
}: ActionConfigurationFormProps) => {
  // State for each JSON field
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [fieldValidity, setFieldValidity] = useState<Record<string, boolean>>({})
  const { mutateAsync: updateAction, isPending } = useUpdateActionTemplate(action.id)

  // Initialize field values from action data
  useEffect(() => {
    const initialValues: Record<string, string> = {}
    const initialValidity: Record<string, boolean> = {}

    JSON_FIELDS.forEach(field => {
      const value = action[field.key] || field.defaultValue;
      
      const cleanedValue = removeNullKeys(value)
      initialValues[field.key] = JSON.stringify(cleanedValue, null, 2)
      initialValidity[field.key] = true
    })

    setFieldValues(initialValues)
    setFieldValidity(initialValidity)
  }, [action, editMode])

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
    
    // Validate JSON
    try {
      JSON.parse(value)
      setFieldValidity(prev => ({ ...prev, [key]: true }))
    } catch {
      setFieldValidity(prev => ({ ...prev, [key]: false }))
    }
  }

  const validateAllFields = (): boolean => {
    return Object.values(fieldValidity).every(isValid => isValid)
  }

  const handleSave = async () => {
    if (!validateAllFields()) {
      toast.error('Invalid JSON', {
        description: "Please fix JSON syntax errors in all fields",
      })
      return
    }

    try {
      // Prepare update data with parsed JSON values
      const updateData: Record<string, any> = {}
      
      JSON_FIELDS.forEach(field => {
        const parsed = JSON.parse(fieldValues[field.key])
        // Only include fields that have non-null values
        if (parsed !== null) {
          updateData[field.key] = parsed
        }
      })

      await updateAction(updateData)
      
      toast.success('Success', {
        description: "Configuration updated successfully",
      })
      onEditModeChange(false)
    } catch (error) {
      toast.error('Error', {
        description: "Failed to update configuration",
      })
    }
  }

  const handleCancel = () => {
    // Reset to original values
    JSON_FIELDS.forEach(field => {
      const value = action[field.key] || field.defaultValue
      setFieldValues(prev => ({ 
        ...prev, 
        [field.key]: JSON.stringify(value, null, 2) 
      }))
      setFieldValidity(prev => ({ ...prev, [field.key]: true }))
    })
    onEditModeChange(false)
  }

  const hasInvalidFields = !validateAllFields()

  return (
    <Container>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level="h3">Action Configuration</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Configure the JSON settings for this action
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  <XIcon /> Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={hasInvalidFields || isPending}
                >
                  <Check /> Save Changes
                </Button>
              </>
            ) : (
              <Button 
                variant="secondary" 
                onClick={() => onEditModeChange(true)}
              >
                <PenSquare /> Edit Configuration
              </Button>
            )}
          </div>
        </div>

        {/* JSON Fields */}
        <div className="space-y-8">
          {JSON_FIELDS.map(field => (
            <JsonFieldEditor
              key={field.key}
              field={field}
              value={fieldValues[field.key] || ''}
              isValid={fieldValidity[field.key] || false}
              onChange={(value) => handleFieldChange(field.key, value)}
              editMode={editMode}
            />
          ))}
        </div>

        {/* Read-only view when not in edit mode */}
        {!editMode && (
          <div className="mt-6 pt-6 border-t">
            <Text className="text-ui-fg-subtle text-sm">
              Click "Edit Configuration" to modify these JSON fields
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}

// Individual JSON Field Editor Component
interface JsonFieldEditorProps {
  field: JsonField
  value: string
  isValid: boolean
  onChange: (value: string) => void
  editMode: boolean
}

const JsonFieldEditor = ({ 
  field, 
  value, 
  isValid, 
  onChange, 
  editMode 
}: JsonFieldEditorProps) => {
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h4" className="text-sm font-medium">
            {field.label}
          </Heading>
          <Text className="text-ui-fg-subtle text-xs mt-0.5">
            {field.description}
          </Text>
        </div>
        {editMode && !isValid && (
          <Badge color="red" size="small">Invalid JSON</Badge>
        )}
      </div>

      {editMode ? (
        <div className="space-y-2">
          <Textarea
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            rows={field.key === 'config' ? 20 : 10}
            className="font-mono text-sm"
            placeholder={`Enter ${field.label} JSON...`}
          />
          {!isValid && (
            <Text className="text-ui-fg-error text-xs">
              Please enter valid JSON
            </Text>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {localValue && localValue !== 'null' ? (
            <CodeBlock
              snippets={[{
                label: field.label,
                language: "json",
                code: localValue,
              }]}
            >
              <CodeBlock.Header />
              <CodeBlock.Body />
            </CodeBlock>
          ) : (
            <div className="p-8 text-center bg-ui-bg-subtle">
              <Text className="text-ui-fg-subtle">
                No {field.label.toLowerCase()} set
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  )
}