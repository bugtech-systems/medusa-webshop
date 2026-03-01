import React, { useState } from "react"
import {
  Button,
  Heading,
  Text,
  Input,
  Label,
  Badge,
  Switch,
} from "@medusajs/ui"
import { Plus, Trash, ArrowUpMini, ArrowDown } from "@medusajs/icons"

interface ConfigStepProps {
  data: Record<string, any>
  onChange: (data: Record<string, any>) => void
  onBack: () => void
  onSave: () => void
  type: string
}

interface Field {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean'
  sortable: boolean
  filterable: boolean
  searchable: boolean
  visible: boolean
  width?: string
  format?: string
}

export const ConfigStep: React.FC<ConfigStepProps> = ({
  data,
  onChange,
  onBack,
  onSave,
  type,
}) => {
  const [fields, setFields] = useState<Field[]>(data.fields || [
    { id: '1', key: 'id', label: 'ID', type: 'text', sortable: true, filterable: true, searchable: true, visible: true },
    { id: '2', key: 'name', label: 'Name', type: 'text', sortable: true, filterable: true, searchable: true, visible: true },
    { id: '3', key: 'created_at', label: 'Created Date', type: 'date', sortable: true, filterable: true, searchable: false, visible: true },
  ])
  const [nextId, setNextId] = useState(4)
  const [newField, setNewField] = useState<Partial<Field>>({
    key: '',
    label: '',
    type: 'text',
    sortable: true,
    filterable: true,
    searchable: true,
    visible: true,
  })
  const [showAddField, setShowAddField] = useState(false)

  const handleFieldChange = (index: number, updates: Partial<Field>) => {
    const updatedFields = [...fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFields(updatedFields)
    onChange({ ...data, fields: updatedFields })
  }

  const handleAddField = () => {
    if (!newField.key || !newField.label) return
    
    const field: Field = {
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
    onChange({ ...data, fields: [...fields, field] })
    setNewField({ key: '', label: '', type: 'text', sortable: true, filterable: true, searchable: true, visible: true })
    setShowAddField(false)
    setNextId(nextId + 1)
  }

  const handleRemoveField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
    onChange({ ...data, fields: updatedFields })
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
    onChange({ ...data, fields: updatedFields })
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
                pageSizeOptions: e.target.value.split(',').map(n => parseInt(n.trim())) 
              })}
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
                <th className="px-4 py-2 text-left">Field Key</th>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-center">Sortable</th>
                <th className="px-4 py-2 text-center">Filterable</th>
                <th className="px-4 py-2 text-center">Searchable</th>
                <th className="px-4 py-2 text-center">Visible</th>
                <th className="px-4 py-2 text-center">Actions</th>
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

  const renderListConfig = () => (
    <div className="space-y-6">
      <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
        <Heading level="h3" className="text-sm font-medium mb-4">
          List Settings
        </Heading>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.showIcons !== false}
                onChange={(e) => onChange({ ...data, showIcons: e.target.checked })}
                className="rounded border-ui-border-base"
              />
              <Text size="small">Show Icons</Text>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.dense || false}
                onChange={(e) => onChange({ ...data, dense: e.target.checked })}
                className="rounded border-ui-border-base"
              />
              <Text size="small">Dense Layout</Text>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.dividers !== false}
                onChange={(e) => onChange({ ...data, dividers: e.target.checked })}
                className="rounded border-ui-border-base"
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
              max={100}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Fields Configuration (reuse from table) */}
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
    <div className="space-y-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Heading level="h2" className="text-lg">
            Configure Report Fields
          </Heading>
          <Badge color="blue" size="small">
            Step 2 of 2
          </Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Define the fields and their properties for your report
        </Text>
      </div>

      <div className="space-y-4">
        {renderConfigFields()}
      </div>

      <div className="flex justify-between gap-2 pt-4 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onSave}>
          Create Report
        </Button>
      </div>
    </div>
  )
}