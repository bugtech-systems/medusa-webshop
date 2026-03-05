import React, { useState, useEffect } from "react"
import {
  Drawer,
  Button,
  Input,
  Label,
  Textarea,
  toast,
  Badge,
  Switch,
  Heading,
  Text,
  ProgressTabs,
  Checkbox,
} from "@medusajs/ui"
import { Plus, Trash, ArrowUpMini, ArrowDown } from "@medusajs/icons"
import { AdminReport, AdminUpdateReport } from "../../../types/reports"
import { Config } from "../types"
import { useExecution } from "../../../hooks/api/actions"

interface EditReportDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AdminReport | null
  onUpdate: (data: AdminUpdateReport) => Promise<void>
  config: Config
}

interface Field {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage'
  sortable: boolean
  filterable: boolean
  searchable: boolean
  visible: boolean
  editable?: boolean
  required?: boolean
  width?: string
  format?: string
  alignment?: 'left' | 'center' | 'right'
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

// Basic Information Tab (same as before)
const BasicInfoTab = ({
  data,
  onChange,
}: {
  data: Record<string, any>
  onChange: (data: Record<string, any>) => void
}) => {
  const { data: actionsData } = useExecution("get-active-actions") as any;
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reportTypes = [
    { 
      value: "table", 
      label: "Table Report", 
      description: "Display data in a sortable, filterable table format",
      disabled: false
    },
    { 
      value: "list", 
      label: "List Report", 
      description: "Show data as a formatted list with icons",
      disabled: true
    },
  ]

  const actionOptions = actionsData?.data ? actionsData.data.map((action: any) => ({
    value: action.id,
    label: action.name,
    description: `Handle: ${action.handle}`
  })) : []

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="edit-report-title" className="text-ui-fg-subtle">
          Report Title <span className="text-ui-fg-error">*</span>
        </Label>
        <Input
          id="edit-report-title"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-report-description" className="text-ui-fg-subtle">
          Description <span className="text-ui-fg-muted">(optional)</span>
        </Label>
        <Textarea
          id="edit-report-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-data-action" className="text-ui-fg-subtle">
          Data Action <span className="text-ui-fg-error">*</span>
        </Label>
        <div className="mt-1">
          <CustomSelect
            value={data.action_id || ""}
            onValueChange={(val) => onChange({ ...data, action_id: val })}
            options={actionOptions}
            placeholder="Select data action..."
          />
        </div>
      </div>

      <div>
        <Label htmlFor="edit-report-type" className="text-ui-fg-subtle">
          Report Type <span className="text-ui-fg-error">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          {reportTypes.map((type) => {
            const isSelected = data.type === type.value
            
            return (
              <button
                key={type.value}
                type="button"
                disabled={type.disabled}
                onClick={() => onChange({ ...data, type: type.value })}
                className={`p-4 border rounded-lg text-left hover:border-ui-border-interactive transition-colors ${
                  isSelected 
                    ? "border-ui-border-interactive bg-ui-bg-base-hover ring-2 ring-ui-border-interactive ring-offset-2" 
                    : "border-ui-border-base"
                }`}
              >
                <div className="flex-1">
                  <Text weight="plus" size="small" className="mb-1">
                    {type.label}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {type.description}
                  </Text>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Enhanced Configuration Tab with proper field management
const ConfigTab = ({
  data,
  onChange,
  type,
}: {
  data: Record<string, any>
  onChange: (data: Record<string, any>) => void
  type: string
}) => {
  const [fields, setFields] = useState<Field[]>(data.fields || [])
  const [nextId, setNextId] = useState((data.fields?.length || 0) + 1)
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState<Partial<Field>>({
    key: '',
    label: '',
    type: 'text',
    sortable: true,
    filterable: true,
    searchable: true,
    visible: true,
    editable: true,
    required: false,
    alignment: 'left',
  })

  // Update parent when fields change
  useEffect(() => {
    onChange({ ...data, fields })
  }, [fields])

  const handleFieldChange = (index: number, updates: Partial<Field>) => {
    const updatedFields = [...fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFields(updatedFields)
  }

  const handleRemoveField = (index: number) => {
    // Show confirmation before removing
    const fieldToRemove = fields[index]
    if (window.confirm(`Are you sure you want to remove the field "${fieldToRemove.label}"?`)) {
      const updatedFields = fields.filter((_, i) => i !== index)
      setFields(updatedFields)
      toast.success(`Field "${fieldToRemove.label}" removed`)
    }
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
  }

  const handleAddField = () => {
    if (!newField.key || !newField.label) {
      toast.error("Field key and label are required")
      return
    }

    // Check for duplicate keys
    if (fields.some(f => f.key === newField.key)) {
      toast.error(`Field with key "${newField.key}" already exists`)
      return
    }
    
    const field: Field = {
      id: nextId.toString(),
      key: newField.key,
      label: newField.label,
      type: newField.type as any || 'text',
      sortable: newField.sortable ?? true,
      filterable: newField.filterable ?? true,
      searchable: newField.searchable ?? true,
      visible: newField.visible ?? true,
      editable: newField.editable ?? true,
      required: newField.required ?? false,
      alignment: newField.alignment || 'left',
    }
    
    setFields([...fields, field])
    setNewField({
      key: '',
      label: '',
      type: 'text',
      sortable: true,
      filterable: true,
      searchable: true,
      visible: true,
      editable: true,
      required: false,
      alignment: 'left',
    })
    setShowAddField(false)
    setNextId(nextId + 1)
    toast.success(`Field "${field.label}" added`)
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
              value={data.pageSize || 10}
              onChange={(e) => onChange({ ...data, pageSize: parseInt(e.target.value) })}
              min={1}
              max={100}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Page Size Options</Label>
            <Input
              value={data.pageSizeOptions?.join(', ') || '10, 25, 50, 100'}
              onChange={(e) => onChange({ 
                ...data, 
                pageSizeOptions: e.target.value.split(',').map((n: string) => parseInt(n.trim())) 
              })}
              placeholder="10, 25, 50, 100"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2">
            <Checkbox 
              checked={data.showRowNumbers || false}
              onCheckedChange={(checked) => onChange({ ...data, showRowNumbers: checked })}
            />
            <Text size="small">Show Row Numbers</Text>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox 
              checked={data.stickyHeader || true}
              onCheckedChange={(checked) => onChange({ ...data, stickyHeader: checked })}
            />
            <Text size="small">Sticky Header</Text>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox 
              checked={data.exportable || false}
              onCheckedChange={(checked) => onChange({ ...data, exportable: checked })}
            />
            <Text size="small">Allow Export</Text>
          </label>
        </div>
      </div>

      {/* Fields Configuration */}
      <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading level="h3" className="text-sm font-medium">
              Fields ({fields.length})
            </Heading>
            <Text size="xsmall" className="text-ui-fg-subtle">
              Configure display and behavior of each field
            </Text>
          </div>
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
        {fields.length > 0 ? (
          <div className="border border-ui-border-base rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-bg-base-hover sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left w-16">Order</th>
                    <th className="px-4 py-2 text-left">Field Key</th>
                    <th className="px-4 py-2 text-left">Label</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-center">Sortable</th>
                    <th className="px-4 py-2 text-center">Filterable</th>
                    <th className="px-4 py-2 text-center">Searchable</th>
                    <th className="px-4 py-2 text-center">Visible</th>
                    <th className="px-4 py-2 text-center">Editable</th>
                    <th className="px-4 py-2 text-center">Required</th>
                    <th className="px-4 py-2 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-t border-ui-border-base hover:bg-ui-bg-base-hover">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveField(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-ui-bg-base rounded disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUpMini className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveField(index, 'down')}
                            disabled={index === fields.length - 1}
                            className="p-1 hover:bg-ui-bg-base rounded disabled:opacity-30"
                            title="Move down"
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
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                          size="small"
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, { type: e.target.value as any })}
                          className="w-24 px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="percentage">Percentage</option>
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
                        <Switch
                          checked={field.filterable}
                          onCheckedChange={(checked) => handleFieldChange(index, { filterable: checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Switch
                          checked={field.searchable}
                          onCheckedChange={(checked) => handleFieldChange(index, { searchable: checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Switch
                          checked={field.visible}
                          onCheckedChange={(checked) => handleFieldChange(index, { visible: checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Switch
                          checked={field.editable || false}
                          onCheckedChange={(checked) => handleFieldChange(index, { editable: checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Switch
                          checked={field.required || false}
                          onCheckedChange={(checked) => handleFieldChange(index, { required: checked })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleRemoveField(index)}
                          className="p-1 text-ui-tag-red-text hover:bg-ui-tag-red-bg rounded transition-colors"
                          title="Remove field"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <Text className="text-ui-fg-subtle mb-2">No fields configured yet</Text>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowAddField(true)}
            >
              Add your first field
            </Button>
          </div>
        )}

        {/* Add Field Form */}
        {showAddField && (
          <div className="mt-4 p-4 border border-ui-border-base rounded-lg bg-ui-bg-base">
            <Heading level="h4" className="text-sm font-medium mb-4">
              Add New Field
            </Heading>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label size="xsmall" className="text-ui-fg-subtle">
                  Field Key <span className="text-ui-fg-error">*</span>
                </Label>
                <Input
                  size="small"
                  value={newField.key}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                  placeholder="e.g., customer_email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label size="xsmall" className="text-ui-fg-subtle">
                  Display Label <span className="text-ui-fg-error">*</span>
                </Label>
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
                  className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm mt-1"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div>
                <Label size="xsmall">Alignment</Label>
                <select
                  value={newField.alignment}
                  onChange={(e) => setNewField({ ...newField, alignment: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm mt-1"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.sortable}
                    onCheckedChange={(checked) => setNewField({ ...newField, sortable: checked })}
                  />
                  <Text size="small">Sortable</Text>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.filterable}
                    onCheckedChange={(checked) => setNewField({ ...newField, filterable: checked })}
                  />
                  <Text size="small">Filterable</Text>
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.searchable}
                    onCheckedChange={(checked) => setNewField({ ...newField, searchable: checked })}
                  />
                  <Text size="small">Searchable</Text>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.visible}
                    onCheckedChange={(checked) => setNewField({ ...newField, visible: checked })}
                  />
                  <Text size="small">Visible</Text>
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.editable}
                    onCheckedChange={(checked) => setNewField({ ...newField, editable: checked })}
                  />
                  <Text size="small">Editable</Text>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                  />
                  <Text size="small">Required</Text>
                </label>
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

  const renderListConfig = () => (
    <div className="space-y-6">
      <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
        <Heading level="h3" className="text-sm font-medium mb-4">
          List Settings
        </Heading>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={data.showIcons !== false}
                onCheckedChange={(checked) => onChange({ ...data, showIcons: checked })}
              />
              <Text size="small">Show Icons</Text>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={data.dense || false}
                onCheckedChange={(checked) => onChange({ ...data, dense: checked })}
              />
              <Text size="small">Dense Layout</Text>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={data.dividers !== false}
                onCheckedChange={(checked) => onChange({ ...data, dividers: checked })}
              />
              <Text size="small">Show Dividers</Text>
            </label>
          </div>

          <div>
            <Label>Max Items</Label>
            <Input
              type="number"
              value={data.maxItems || 10}
              onChange={(e) => onChange({ ...data, maxItems: parseInt(e.target.value) })}
              min={1}
              max={1000}
              className="mt-1 w-32"
            />
          </div>

          <div>
            <Label>Icon Field</Label>
            <select
              value={data.iconField || ''}
              onChange={(e) => onChange({ ...data, iconField: e.target.value })}
              className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm mt-1"
            >
              <option value="">None</option>
              {fields.filter(f => f.visible).map(f => (
                <option key={f.id} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Primary Field</Label>
            <select
              value={data.primaryField || ''}
              onChange={(e) => onChange({ ...data, primaryField: e.target.value })}
              className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm mt-1"
            >
              <option value="">Select primary field</option>
              {fields.filter(f => f.visible).map(f => (
                <option key={f.id} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Secondary Field</Label>
            <select
              value={data.secondaryField || ''}
              onChange={(e) => onChange({ ...data, secondaryField: e.target.value })}
              className="w-full px-2 py-1.5 bg-ui-bg-base border border-ui-border-base rounded text-sm mt-1"
            >
              <option value="">None</option>
              {fields.filter(f => f.visible).map(f => (
                <option key={f.id} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reuse fields configuration from table */}
      {renderTableConfig()}
    </div>
  )

  const renderConfigFields = () => {
    switch (type) {
      case "table":
        return renderTableConfig()
      case "list":
        return renderListConfig()
      default:
        return (
          <div className="p-4 text-center bg-ui-bg-subtle rounded-lg">
            <Text className="text-ui-fg-subtle">
              Select a report type to configure
            </Text>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {renderConfigFields()}
    </div>
  )
}

// Main EditReportDrawer Component
export const EditReportDrawer: React.FC<EditReportDrawerProps> = ({
  open,
  onOpenChange,
  record,
  onUpdate,
  config,
}) => {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (record) {
      setFormData({
        ...record.configuration,
        title: record.label || "",
        description: record?.configuration?.description || "",
        type: record?.configuration?.type || "",
        action_id: record.action_id || "",
        fields: record?.configuration?.fields || [],
        pageSize: record?.configuration?.pageSize || 10,
        pageSizeOptions: record?.configuration?.pageSizeOptions || [10, 25, 50, 100],
        showRowNumbers: record?.configuration?.showRowNumbers || false,
        stickyHeader: record?.configuration?.stickyHeader !== false,
        exportable: record?.configuration?.exportable || false,
        showIcons: record?.configuration?.showIcons !== false,
        dense: record?.configuration?.dense || false,
        dividers: record?.configuration?.dividers !== false,
        maxItems: record?.configuration?.maxItems || 10,
        iconField: record?.configuration?.iconField || '',
        primaryField: record?.configuration?.primaryField || '',
        secondaryField: record?.configuration?.secondaryField || '',
      })
    }
  }, [record])

  if (!record) return null

  const handleSubmit = async (e: React.FormEvent) => {
    // e.preventDefault()
    setIsSubmitting(true)
    try {

      // Prepare the update data
      const updateData = {
        ...formData,
        fields: formData.fields?.map((field: any) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          sortable: field.sortable,
          filterable: field.filterable,
          searchable: field.searchable,
          visible: field.visible,
          editable: field.editable,
          required: field.required,
          alignment: field.alignment,
        })),
      }
      

      await onUpdate(updateData)
      onOpenChange(false)
      toast.success("Report updated successfully")
    } catch (error) {
      toast.error("Failed to update report")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!formData.title || !formData.type || !formData.action_id) {
      toast.error("Please fill in all required fields")
      return
    }
    setStep(1)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="z-40 max-w-5xl">
        <Drawer.Header>
          <Drawer.Title>Edit Report: {record.title}</Drawer.Title>
          <div className="flex items-center gap-4 w-full mt-2">
            <ProgressTabs value={step.toString()} className="w-full">
              <ProgressTabs.List className="border-0">
                <ProgressTabs.Trigger 
                  value="0" 
                  className="text-sm"
                  onClick={() => setStep(0)}
                >
                  Basic Information
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger 
                  value="1" 
                  className="text-sm"
                  onClick={() => formData.title && formData.type && formData.action_id ? setStep(1) : null}
                  disabled={!formData.title || !formData.type || !formData.action_id}
                >
                  Configure Fields ({formData.fields?.length || 0})
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </ProgressTabs>
          </div>
        </Drawer.Header>
        
        <Drawer.Body className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* <form onSubmit={handleSubmit}> */}
            {step === 0 && (
              <BasicInfoTab
                data={formData}
                onChange={setFormData}
              />
            )}

            {step === 1 && (
              <ConfigTab
                data={formData}
                onChange={setFormData}
                type={formData.type}
              />
            )}

            <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-ui-border-base">
              <Button 
                variant="secondary" 
                type="button" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              {step === 0 ? (
                <Button 
                  variant="primary" 
                  type="button"
                  onClick={handleNext}
                  disabled={!formData.title || !formData.type || !formData.action_id}
                >
                  Next: Configure Fields
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    type="button"
                    onClick={() => setStep(0)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={() => handleSubmit()}
                    isLoading={isSubmitting}
                  >
                    Update Report
                  </Button>
                </div>
              )}
            </div>
          {/* </form> */}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}