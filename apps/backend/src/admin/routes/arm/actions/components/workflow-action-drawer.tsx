import { useState, useEffect, useCallback, useMemo } from 'react'
import { Drawer, Select, Button, Checkbox, Label, Input, Tabs, Badge, Tooltip, Text, Textarea, toast } from '@medusajs/ui'
import { InformationCircle, ExclamationCircle } from '@medusajs/icons'
import JsonEditor from '../../../../components/jsonEditor'
import { Copy, Check } from "lucide-react"

interface Parameter {
  id: string
  name: string
  type: string
  required?: boolean
  description?: string
  options?: string[]
  default?: any
}

interface ActionDrawerProps {
  action?: {
    id: string
    name?: string
    parameters?: Record<string, any>
    output_template?: Record<string, any>
    context_template?: Record<string, any>
    conditions?: any
    output_as?: any
    index?: number
    next_action_id?: string
  } | null
  isOpen: boolean
  onClose: () => void
  onUpdateAction: (action: any) => void
  availableActions?: any
}

type TabType = 'parameters' | 'output' | 'context' | 'condition'

const operators = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not Equals (!=)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater Than or Equal (>=)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less Than or Equal (<=)' },
  { value: 'in', label: 'In Array' },
  { value: 'like', label: 'Contains' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Does Not Exist' }
]

const valueTypes = [
  { value: 'string', label: "String" },
  { value: 'number', label: "Number" },
  { value: 'boolean', label: "Boolean" },
  { value: 'date', label: "Date" }
]

const WorkflowActionDrawer = ({ 
  action,
  isOpen, 
  onClose, 
  onUpdateAction, 
  availableActions 
}: ActionDrawerProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('parameters')
  const [selectedActionId, setSelectedActionId] = useState<string>("")
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [output, setOutput] = useState<Record<string, any>>({})
  const [outputAs, setOutputAs] = useState<any>(null)
  const [context, setContext] = useState<Record<string, any>>({})
  const [availableParameters, setAvailableParameters] = useState<Parameter[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  
  const [localCondition, setLocalCondition] = useState<{
    field: string;
    operator: string;
    value: any;
    fieldType: string;
    exit: boolean;
  }>({
    field: '',
    operator: 'eq',
    value: '',
    fieldType: 'string',
    exit: false
  })

  // Get selected action details
  const selectedAction = useMemo(() => 
    availableActions?.find((a: any) => a.id === selectedActionId),
    [selectedActionId, availableActions]
  )

  // Initialize form when action changes or drawer opens
  useEffect(() => {
    if (action && isOpen) {
      const actionToUse = availableActions.find((a: any) => a.id === action.id)
      
      setSelectedActionId(action.id)
      setAvailableParameters(actionToUse?.parameters || [])
      
      // Populate parameters with existing values or defaults
      const initialParams: Record<string, any> = {}
      actionToUse?.parameters?.forEach((param: Parameter) => {
        // Use existing value if available, otherwise use default
        const existingValue = action.parameters?.[param.name]
        initialParams[param.name] = existingValue !== undefined ? existingValue : param.default
      })
      setParameters(initialParams)
      
      // Populate other tabs
      setOutput(action.output_template || {})
      setContext(action.context_template || {})
      setOutputAs(action.output_as || null)
      
      // Populate conditions with existing values or defaults
      setLocalCondition({
        field: action.conditions?.field || '',
        operator: action.conditions?.operator || 'eq',
        value: action.conditions?.value || '',
        fieldType: action.conditions?.fieldType || 'string',
        exit: action.conditions?.exit || false
      })
      
      setIsDirty(false)
      setValidationErrors({})
    }
  }, [action, availableActions, isOpen])

  // Update available parameters when selected action changes
  useEffect(() => {
    if (selectedActionId && isOpen) {
      const selected = availableActions.find((a: any) => a.id === selectedActionId)
      setAvailableParameters(selected?.parameters || [])
      
      // If this is a new action (not editing existing), initialize with defaults
      if (action?.id !== selectedActionId) {
        const initialParams: Record<string, any> = {}
        selected?.parameters?.forEach((param: Parameter) => {
          initialParams[param.name] = param.default
        })
        setParameters(initialParams)
        setIsDirty(true)
      }
    }
  }, [selectedActionId, availableActions, action?.id, isOpen])

  // Track changes
  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }))
    setIsDirty(true)
    
    // Clear validation error for this field
    if (validationErrors[paramName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[paramName]
        return newErrors
      })
    }
  }

  const handleOutputChange = (value: Record<string, any>) => {
    setOutput(value)
    setIsDirty(true)
  }

  const handleOutputAsChange = (value: string) => {
    setOutputAs(value)
    setIsDirty(true)
  }

  const handleContextChange = (value: Record<string, any>) => {
    setContext(value)
    setIsDirty(true)
  }

  const handleConditionChange = (updates: Partial<typeof localCondition>) => {
    setLocalCondition(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }

  // Validation
  const validateParameters = (): boolean => {
    const errors: Record<string, string> = {}
    
    availableParameters.forEach(param => {
      const value = parameters[param.name]
      
      if (param.required) {
        if (value === undefined || value === null || value === '') {
          errors[param.name] = `${param.name} is required`
        }
      }
      
      // Type-specific validation
      if (value !== undefined && value !== '') {
        switch (param.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors[param.name] = `${param.name} must be a valid number`
            }
            break
          case 'array':
          case 'object':
            try {
              if (typeof value === 'string') {
                JSON.parse(value)
              }
            } catch {
              errors[param.name] = `${param.name} must be valid JSON`
            }
            break
        }
      }
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isConditionValid = useCallback(() => {
    if (!localCondition.field) return false
    if (!localCondition.operator) return false
    if (!['exists', 'not_exists'].includes(localCondition.operator) && 
        (localCondition.value === undefined || localCondition.value === '')) {
      return false
    }
    return true
  }, [localCondition])

  const handleSave = () => {
    // Validate based on active tab
    if (activeTab === 'parameters' && !validateParameters()) {
      return
    }

    if (!selectedAction) return
    
    const updatedAction = {
      ...action,
      id: selectedActionId,
      action_id: selectedActionId,
      name: selectedAction.name,
      parameters,
      output_template: output,
      context_template: context,
      output_as: outputAs,
      index: action?.index,
      next_action_id: action?.next_action_id,
      conditions: localCondition.field ? localCondition : undefined
    }
    
    
    console.log(updatedAction, action, selectedAction, selectedActionId, 'UPDAATED ACT')
    
    
    onUpdateAction(updatedAction)
    setIsDirty(false)
    onClose()
  }

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // Render parameter field based on type
  const renderParameterField = (param: Parameter) => {
    const value = parameters[param.name]
    const error = validationErrors[param.name]
    
    const fieldClasses = `w-full px-3 py-2 bg-ui-bg-field border rounded-md ${
      error ? 'border-ui-fg-error' : 'border-ui-border-base'
    } focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive`

    switch (param.type) {
      case 'string':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={`Enter ${param.name}`}
            className={error ? "border-ui-fg-error" : ""}
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value !== undefined ? value : ''}
            onChange={(e) => handleParameterChange(
              param.name, 
              e.target.value ? Number(e.target.value) : ''
            )}
            placeholder={`Enter ${param.name}`}
            className={error ? "border-ui-fg-error" : ""}
          />
        )
      
      case 'boolean':
        return (
          <Select 
            value={value !== undefined ? String(value) : 'false'} 
            onValueChange={(val) => handleParameterChange(param.name, val === 'true')}
          >
            <Select.Trigger className={error ? "border-ui-fg-error" : ""}>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="true">True</Select.Item>
              <Select.Item value="false">False</Select.Item>
            </Select.Content>
          </Select>
        )
      
      case 'enum':
        return (
          <Select 
            value={value || ''} 
            onValueChange={(val) => handleParameterChange(param.name, val)}
          >
            <Select.Trigger className={error ? "border-ui-fg-error" : ""}>
              <Select.Value placeholder={`Select ${param.name}`} />
            </Select.Trigger>
            <Select.Content>
              {param.options?.map((option: string) => (
                <Select.Item key={option} value={option}>
                  {option}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )
      
      case 'array':
        return (
          <Textarea
            value={Array.isArray(value) ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleParameterChange(param.name, Array.isArray(parsed) ? parsed : [parsed])
              } catch {
                handleParameterChange(param.name, e.target.value)
              }
            }}
            className={`${fieldClasses} font-mono text-sm min-h-[100px]`}
            placeholder={`Enter JSON array for ${param.name}`}
          />
        )
      
      case 'object':
      case 'json':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleParameterChange(param.name, parsed)
              } catch {
                handleParameterChange(param.name, e.target.value)
              }
            }}
            className={`${fieldClasses} font-mono text-sm min-h-[200px]`}
            placeholder={`Enter JSON object for ${param.name}`}
          />
        )
      
      default:
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            placeholder={`Enter ${param.name}`}
            className={error ? "border-ui-fg-error" : `${fieldClasses} font-mono text-sm min-h-[100px]`}
          />
        )
    }
  }

  // Render value input for conditions
  const renderConditionValueInput = () => {
    if (!localCondition.operator || ['exists', 'not_exists'].includes(localCondition.operator)) {
      return null
    }

    switch (localCondition.operator) {
      case 'in':
        return (
          <div className="space-y-1">
            <Input
              type="text"
              value={Array.isArray(localCondition.value) ? localCondition.value.join(', ') : ''}
              onChange={(e) => {
                const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                handleConditionChange({ value: values })
              }}
              placeholder="Comma-separated values"
            />
            <Text size="small" className="text-ui-fg-muted">
              Enter values separated by commas
            </Text>
          </div>
        )

      case 'like':
        return (
          <Input
            type="text"
            value={localCondition.value || ''}
            onChange={(e) => handleConditionChange({ value: e.target.value })}
            placeholder="Search text..."
          />
        )

      default:
        if (localCondition.fieldType === 'number') {
          return (
            <Input
              type="number"
              value={localCondition.value || ''}
              onChange={(e) => handleConditionChange({ 
                value: e.target.value ? Number(e.target.value) : '' 
              })}
              placeholder="Enter a number"
            />
          )
        } else if (localCondition.fieldType === 'boolean') {
          return (
            <Select
              value={String(localCondition.value || 'false')}
              onValueChange={(val) => handleConditionChange({ value: val === 'true' })}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="true">True</Select.Item>
                <Select.Item value="false">False</Select.Item>
              </Select.Content>
            </Select>
          )
        } else {
          return (
            <Input
              type="text"
              value={localCondition.value || ''}
              onChange={(e) => handleConditionChange({ value: e.target.value })}
              placeholder="Enter value"
            />
          )
        }
    }
  }

  // Tab content renderers
  const renderParametersTab = () => (
    <div className="space-y-6">
      {/* Action Selection */}
      <div className="bg-ui-bg-field rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-subtle text-sm font-medium">
            Action Type
          </Label>
          {selectedAction && (
            <Badge size="small" variant="outlined">
              {selectedAction.id}
            </Badge>
          )}
        </div>
        
        <Select value={selectedActionId} onValueChange={setSelectedActionId}>
          <Select.Trigger className="w-full">
            <Select.Value placeholder="Select an action" />
          </Select.Trigger>
          <Select.Content>
            {availableActions?.map((availableAction: any) => (
              <Select.Item key={availableAction.id} value={availableAction.id}>
                {availableAction.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        
        {selectedAction?.description && (
          <div className="mt-2 flex items-start gap-1 text-xs text-ui-fg-muted">
            <InformationCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{selectedAction.description}</span>
          </div>
        )}
      </div>

      {/* Parameters */}
      {availableParameters.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-ui-fg-subtle text-sm font-medium">
              Parameters
            </Label>
            <Badge size="small" variant="outlined">
              {availableParameters.filter(p => p.required).length} required • {availableParameters.length} total
            </Badge>
          </div>
          
          <div className="space-y-6">
            {availableParameters.map((param) => (
              <div key={param.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm font-medium">
                      {param.name}
                    </Label>
                    {param.required && (
                      <Badge size="small" color="red">Required</Badge>
                    )}
                  </div>
                  <Badge size="small" variant="outlined">
                    {param.type}
                  </Badge>
                </div>
                
                {renderParameterField(param)}
                
                {param.description && (
                  <div className="flex items-start gap-1 text-xs text-ui-fg-muted">
                    <InformationCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{param.description}</span>
                  </div>
                )}
                
                {validationErrors[param.name] && (
                  <div className="flex items-start gap-1 text-xs text-ui-fg-error">
                    <ExclamationCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{validationErrors[param.name]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-ui-bg-subtle rounded-lg p-8 text-center">
          <Text size="small" className="text-ui-fg-muted">
            This action has no configurable parameters.
          </Text>
        </div>
      )}

      {/* Step Info */}
      <div className="bg-ui-bg-subtle rounded-lg p-4">
        <div className="text-xs text-ui-fg-muted space-y-2">
          <div className="font-medium mb-2 flex items-center gap-2">
            <span>Step Information</span>
            <Badge size="small" variant="outlined">
              {selectedAction?.handle}
                <button
            onClick={() => {
              navigator.clipboard.writeText(selectedAction?.handle || '')
              toast.success('Action handle copied!')
            }}
            className="hover:text-ui-fg-base transition-colors"
            title="Copy full ID"
          >
            <Copy className="h-3 w-3" />
          </button>
            </Badge>
            
            
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span>Node ID:</span>
            <span className="font-mono">{action?.id}
             <button
            onClick={() => {
              navigator.clipboard.writeText(action?.id || '')
              toast.success('Full ID copied!')
            }}
            className="hover:text-ui-fg-base transition-colors"
            title="Copy full ID"
          >
            <Copy className="h-3 w-3" />
          </button>
            </span>
            <span>Position:</span>
            <span>Step {action?.index}</span>
            <span>Current Action:</span>
            <span className="font-medium">{selectedAction?.name || 'Not selected'}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderOutputTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-ui-fg-subtle text-sm font-medium">
          Output Variable Name
        </Label>
        <Input
          type="text"
          value={outputAs || ''}
          onChange={(e) => handleOutputAsChange(e.target.value)}
          placeholder="e.g., user_data, api_response"
        />
        <Text size="small" className="text-ui-fg-muted">
          This variable name will be used to access the output in subsequent actions
        </Text>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-ui-fg-subtle text-sm font-medium">
            Output Template
          </Label>
          <Badge size="small" variant="outlined">JSON</Badge>
        </div>
        
        <div className="border border-ui-border-base rounded-lg overflow-hidden">
          <JsonEditor
            value={output}
            onChange={handleOutputChange}
            height="300px"
            placeholder={`{
  // Define the output structure here
  "result": "{{value}}"
}`}
          />
        </div>
      </div>

      <div className="bg-ui-bg-subtle rounded-lg p-4">
        <div className="flex items-start gap-2">
          <InformationCircle className="h-5 w-5 text-ui-fg-muted flex-shrink-0" />
          <Text size="small" className="text-ui-fg-muted">
            The output will be available to subsequent actions via <span className="font-mono">outputs.{outputAs || 'variable'}</span>. 
            Use double curly braces like <span className="font-mono">&#123;&#123;value&#125;&#125;</span> to reference context variables.
          </Text>
        </div>
      </div>
    </div>
  )

  const renderContextTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-ui-fg-subtle text-sm font-medium">
            Context Template
          </Label>
          <Badge size="small" variant="outlined">JSON</Badge>
        </div>
        
        <div className="border border-ui-border-base rounded-lg overflow-hidden">
          <JsonEditor
            value={context}
            onChange={handleContextChange}
            height="400px"
            placeholder={`{
  // Define context variables here
  "user_id": "{{outputs.previous_step.user_id}}",
  "timestamp": "{{context.timestamp}}"
}`}
          />
        </div>
      </div>

      <div className="bg-ui-bg-subtle rounded-lg p-4">
        <div className="flex items-start gap-2">
          <InformationCircle className="h-5 w-5 text-ui-fg-muted flex-shrink-0" />
          <Text size="small" className="text-ui-fg-muted">
            Context variables persist across multiple actions. Use <span className="font-mono">&#123;&#123;outputs.action_name.field&#125;&#125;</span> 
            to reference outputs from previous steps.
          </Text>
        </div>
      </div>
    </div>
  )

  const renderConditionsTab = () => (
    <div className="space-y-6">
      <div className="bg-ui-bg-field rounded-lg p-6">
        <div className="space-y-4">
          {/* Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Field Path <span className="text-ui-fg-error">*</span>
            </Label>
            <Input
              type="text"
              value={localCondition.field}
              onChange={(e) => handleConditionChange({ field: e.target.value })}
              placeholder="e.g., outputs.previous_step.status, context.user.age"
              className="font-mono"
            />
            <Text size="small" className="text-ui-fg-muted">
              Dot notation path to the value in context or outputs
            </Text>
          </div>

          {/* Operator and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Operator <span className="text-ui-fg-error">*</span>
              </Label>
              <Select value={localCondition.operator} onValueChange={(val) => handleConditionChange({ operator: val })}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {operators.map((op) => (
                    <Select.Item key={op.value} value={op.value}>
                      {op.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Value Type
              </Label>
              <Select value={localCondition.fieldType} onValueChange={(val) => handleConditionChange({ fieldType: val })}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {valueTypes.map((type) => (
                    <Select.Item key={type.value} value={type.value}>
                      {type.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>

          {/* Value */}
          {renderConditionValueInput()}

          {/* Exit Switch */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="exit-switch">Exit Process on Condition Met</Label>
              <Text size="small" className="text-ui-fg-muted">
                Stop workflow execution if this condition is true
              </Text>
            </div>
            <Checkbox
              id="exit-switch"
              checked={localCondition.exit}
              onCheckedChange={(checked) => handleConditionChange({ exit: checked })}
            />
          </div>
        </div>

        {/* Preview */}
        {localCondition.field && localCondition.operator && (
          <div className="mt-6 p-4 bg-ui-bg-subtle rounded-lg">
            <Text size="small" className="font-medium text-ui-fg-muted mb-2">
              Condition Preview
            </Text>
            <div className="font-mono text-sm bg-ui-bg-base p-3 rounded">
              {localCondition.field} {operators.find(op => op.value === localCondition.operator)?.label} {
                localCondition.value !== undefined && !['exists', 'not_exists'].includes(localCondition.operator) 
                  ? (localCondition.fieldType === 'number' ? Number(localCondition.value) : JSON.stringify(localCondition.value))
                  : ''
              }
            </div>
          </div>
        )}

        {/* Validation */}
        {localCondition.field && localCondition.operator && !isConditionValid() && (
          <div className="mt-4 p-3 bg-ui-bg-error/10 rounded-lg flex items-start gap-2">
            <ExclamationCircle className="h-4 w-4 text-ui-fg-error flex-shrink-0 mt-0.5" />
            <Text size="small" className="text-ui-fg-error">
              Please provide a value for the condition
            </Text>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="bg-ui-bg-subtle rounded-lg p-4">
        <Text size="small" className="font-medium text-ui-fg-muted mb-2">
          How conditions work
        </Text>
        <ul className="text-xs text-ui-fg-muted space-y-1 list-disc list-inside">
          <li>If no condition is set, the action always executes</li>
          <li>The field path is evaluated against the current context/outputs</li>
          <li>For 'exists' and 'not_exists', no value is needed</li>
          <li>For 'in' operator, enter comma-separated values</li>
          <li>For 'like' operator, performs case-insensitive contains</li>
          <li>Enable 'Exit Process' to stop workflow when condition is met</li>
        </ul>
      </div>
    </div>
  )
  
  
  
  

  if (!action) return null

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <Drawer.Content className="w-[700px] max-w-full">
        <Drawer.Header>
          <Drawer.Title className="flex items-center gap-2">
            <span>Configure Action</span>
            {selectedAction && (
              <Badge size="small" variant="outlined">
                {selectedAction.name}
              </Badge>
            )}
          </Drawer.Title>
          <Drawer.Description>
            Configure the action parameters, output template, context variables, and execution conditions
          </Drawer.Description>
        </Drawer.Header>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as TabType)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <Tabs.List className="border-b px-6 shrink-0">
            <Tabs.Trigger value="parameters">
              Parameters
              {availableParameters.length > 0 && (
                <Badge size="small" variant="outlined" className="ml-2">
                  {availableParameters.length}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="output">Output</Tabs.Trigger>
            <Tabs.Trigger value="context">Context</Tabs.Trigger>
            <Tabs.Trigger value="condition">
              Condition
              {localCondition.field && (
                <Badge size="small" color="green" className="ml-2">●</Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="parameters" className="flex-1 overflow-hidden">
            <Drawer.Body className="overflow-y-auto h-full">
              {renderParametersTab()}
            </Drawer.Body>
          </Tabs.Content>

          <Tabs.Content value="output" className="flex-1 overflow-hidden">
            <Drawer.Body className="overflow-y-auto h-full">
              {renderOutputTab()}
            </Drawer.Body>
          </Tabs.Content>

          <Tabs.Content value="context" className="flex-1 overflow-hidden">
            <Drawer.Body className="overflow-y-auto h-full">
              {renderContextTab()}
            </Drawer.Body>
          </Tabs.Content>

          <Tabs.Content value="condition" className="flex-1 overflow-hidden">
            <Drawer.Body className="overflow-y-auto h-full">
              {renderConditionsTab()}
            </Drawer.Body>
          </Tabs.Content>
        </Tabs>

        <Drawer.Footer className="border-t border-ui-border-base">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {isDirty && (
                <Badge size="small" color="orange">Unsaved changes</Badge>
              )}
              {activeTab === 'parameters' && availableParameters.length > 0 && (
                <Text size="small" className="text-ui-fg-muted">
                  Required fields marked with <span className="text-ui-fg-error">*</span>
                </Text>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!selectedActionId}
                className="min-w-[100px]"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export default WorkflowActionDrawer