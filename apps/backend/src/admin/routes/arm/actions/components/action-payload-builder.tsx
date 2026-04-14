import { useState, useCallback, useMemo, useEffect } from "react"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  toast,
  Badge,
  CodeBlock,
  Text,
  Tooltip,
  IconButton,
  Drawer,
  Switch,
  Alert,
} from "@medusajs/ui"
import {
  Plus,
  Trash,
  CheckCircle,
  XMark,
  PencilSquare,

} from "@medusajs/icons"
import {
  GripVertical,
  Copy,
  Download,
  Eye,
  Edit,
  Info
} from 'lucide-react'
import { useUpdateActionTemplate } from "../../../../hooks/api/actions"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface PayloadField {
  id: string
  name: string
  type: 'string' | 'text' | 'number' | 'date' | 'array' | 'json' | 'enum' | 'boolean'
  required: boolean
  nullable: boolean
  defaultValue?: any
  description?: string
  enumValues?: string[]
  arrayType?: 'string' | 'number' | 'object'
}

interface ActionPayloadBuilderProps {
  action: any
  editMode: boolean
  onEditModeChange?: (mode: boolean) => void
}

// Sortable Field Item Component
const SortableFieldItem = ({
  field,
  onRemove,
  onEdit,
  editMode
}: {
  field: PayloadField
  onRemove: (id: string) => void
  onEdit: (field: PayloadField) => void
  editMode: boolean
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Container className={isDragging ? "shadow-lg" : ""}>
        <div className="p-4 flex items-center gap-3">
          {editMode && (
            <div
              className="cursor-grab active:cursor-grabbing text-ui-fg-muted hover:text-ui-fg-base"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Text className="font-medium">{field.name}</Text>
              <Badge size="small">{field.type}</Badge>
              {field.required && (
                <Badge size="small" color="red">Required</Badge>
              )}
              {field.arrayType && (
                <Badge size="small" variant="outlined">
                  {field.arrayType} array
                </Badge>
              )}
            </div>

            {field.description && (
              <Text className="text-ui-fg-subtle text-sm mt-1">{field.description}</Text>
            )}

            {field.enumValues && field.enumValues.length > 0 && (
              <div className="mt-2">
                <Text className="text-xs text-ui-fg-muted mb-1">Allowed values:</Text>
                <div className="flex flex-wrap gap-1">
                  {field.enumValues.map((value, idx) => (
                    <Badge key={idx} size="small" variant="outlined">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {field.defaultValue !== undefined && field.defaultValue !== '' && (
              <div className="mt-2">
                <Text className="text-xs text-ui-fg-muted">
                  Default: <span className="font-mono">{String(field.defaultValue)}</span>
                </Text>
              </div>
            )}
          </div>

          {editMode && (
            <div className="flex items-center gap-1">
              <Tooltip content="Edit field">
                <IconButton
                  variant="transparent"
                  size="small"
                  onClick={() => onEdit(field)}
                  className="text-ui-fg-subtle hover:text-ui-fg-base"
                >
                  <Edit className="h-4 w-4" />
                </IconButton>
              </Tooltip>

              <Tooltip content="Remove field">
                <IconButton
                  variant="transparent"
                  size="small"
                  onClick={() => onRemove(field.id)}
                  className="text-ui-fg-error hover:text-ui-fg-error-hover"
                >
                  <Trash />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

// Field Editor Drawer Component
const FieldEditorDrawer = ({
  open,
  onOpenChange,
  field,
  onSave,
  onDelete,
  existingFields,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: Partial<PayloadField> | null
  onSave: (field: PayloadField) => void
  onDelete?: () => void
  existingFields: PayloadField[]
}) => {
  const [editedField, setEditedField] = useState<any>(
    field || { name: '', defaultValue: '', description: '', type: 'string', required: false, nullable: true }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fieldTypes = [
    { label: "String", value: "string" },
    { label: "Number", value: "number" },
    { label: "Date", value: "date" },
    { label: "Array", value: "array" },
    { label: "JSON", value: "json" },
    { label: "Enum", value: "enum" },
    { label: "Boolean", value: "boolean" },
    { label: "TextArea", value: "text" }
  ]

  const arrayTypes = [
    { label: "String", value: "string" },
    { label: "Number", value: "number" },
    { label: "Object", value: "object" },
  ]

  const validateField = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!editedField?.name?.trim()) {
      newErrors.name = "Field name is required"
    } else {
      // Check for duplicate names (excluding current field if editing)
      const isDuplicate = existingFields.some(
        f => f.id !== field?.id && f.name.toLowerCase() === editedField?.name!.toLowerCase()
      )
      if (isDuplicate) {
        newErrors.name = "A field with this name already exists"
      }
    }

    if (editedField?.type === 'enum') {
      if (!editedField?.enumValues || editedField?.enumValues.length === 0) {
        newErrors.enumValues = "At least one enum value is required"
      }
    }

    if (editedField?.type === 'array' && !editedField?.arrayType) {
      newErrors.arrayType = "Array item type is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateField()) return

    const savedField: PayloadField = {
      ...editedField,
      id: field?.id,
      name: editedField?.name!.trim(),
      type: editedField?.type as PayloadField['type'],
      required: editedField?.required,
      nullable: editedField?.nullable,
      description: editedField?.description?.trim(),
      defaultValue: editedField?.defaultValue,
      enumValues: editedField?.enumValues,
      arrayType: editedField?.arrayType as PayloadField['arrayType'],
    }

    onSave(savedField)
    onOpenChange(false)
  }

  const handleClose = () => {
    setEditedField({ name: '', defaultValue: '', description: '', type: 'string', required: false, nullable: true })
    setErrors({})
    onOpenChange(false)
  }

  useEffect(() => {

    setEditedField(field)

  }, [field])


  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {field?.id ? 'Edit Field' : 'Add New Field'}
          </Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="space-y-6">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="field-name" className="text-ui-fg-subtle">
              Field Name <span className="text-ui-fg-error">*</span>
            </Label>
            <Input
              id="field-name"
              value={editedField?.name || ""}
              onChange={(e) => setEditedField({ ...editedField, name: e.target.value })}
              placeholder="e.g., user_id"
              className={errors.name ? "border-ui-border-error" : ""}
            />
            {errors.name && (
              <Text className="text-ui-fg-error text-sm">{errors.name}</Text>
            )}
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="field-type" className="text-ui-fg-subtle">
              Field Type <span className="text-ui-fg-error">*</span>
            </Label>
            <Select
              value={editedField?.type}
              onValueChange={(value) => setEditedField({
                ...editedField,
                type: value as PayloadField['type']
              })}
            >
              <Select.Trigger id="field-type">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {fieldTypes.map(type => (
                  <Select.Item key={type.value} value={type.value}>
                    {type.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          {/* Dynamic field options based on type */}
          {editedField?.type === 'enum' && (
            <div className="space-y-2">
              <Label htmlFor="enum-values" className="text-ui-fg-subtle">
                Enum Values <span className="text-ui-fg-error">*</span>
              </Label>
              <Input
                id="enum-values"
                value={editedField?.enumValues?.join(", ") || ""}
                onChange={(e) => setEditedField({
                  ...editedField,
                  enumValues: e.target.value.split(",").map(v => v.trim()).filter(Boolean)
                })}
                placeholder="value1, value2, value3"
                className={errors.enumValues ? "border-ui-border-error" : ""}
              />
              {errors.enumValues && (
                <Text className="text-ui-fg-error text-sm">{errors.enumValues}</Text>
              )}
              <Text className="text-ui-fg-muted text-sm">
                Enter comma-separated values
              </Text>
            </div>
          )}

          {editedField?.type === 'array' && (
            <div className="space-y-2">
              <Label htmlFor="array-type" className="text-ui-fg-subtle">
                Array Item Type <span className="text-ui-fg-error">*</span>
              </Label>
              <Select
                value={editedField?.arrayType}
                onValueChange={(value) => setEditedField({
                  ...editedField,
                  arrayType: value as PayloadField['arrayType']
                })}
              >
                <Select.Trigger id="array-type">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {arrayTypes.map(type => (
                    <Select.Item key={type.value} value={type.value}>
                      {type.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              {errors.arrayType && (
                <Text className="text-ui-fg-error text-sm">{errors.arrayType}</Text>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-ui-fg-subtle">
              Description
            </Label>
            <Textarea
              id="description"
              value={editedField?.description || ""}
              onChange={(e) => setEditedField({ ...editedField, description: e.target.value })}
              placeholder="Field description (optional)"
              rows={3}
            />
          </div>

          {/* Default Value */}
          <div className="space-y-2">
            <Label htmlFor="default-value" className="text-ui-fg-subtle">
              Default Value
            </Label>
            <Input
              id="default-value"
              value={editedField?.defaultValue || ""}
              onChange={(e) => setEditedField({ ...editedField, defaultValue: e.target.value })}
              placeholder="Optional default value"
            />
          </div>

          {/* Required Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="required-switch">Required field</Label>
              <Text className="text-ui-fg-muted text-sm">
                Make this field mandatory in the payload
              </Text>
            </div>
            <Switch
              id="required-switch"
              checked={editedField?.required || false}
              onCheckedChange={(checked) => setEditedField({ ...editedField, required: checked })}
            />
          </div>
          {/* Required Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="nullable-switch">Nullable field</Label>
              <Text className="text-ui-fg-muted text-sm">
                Make this field nullable in the query
              </Text>
            </div>
            <Switch
              id="nullable-switch"
              checked={editedField?.nullable || false}
              onCheckedChange={(checked) => setEditedField({ ...editedField, nullable: checked })}
            />
          </div>

          {/* Delete button for existing fields */}
          {field?.id && onDelete && (
            <>
              <div className="border-t border-ui-border-base my-4" />
              <Button
                variant="danger"
                className="w-full"
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}
              >
                <Trash /> Delete Field
              </Button>
            </>
          )}
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {field?.id ? 'Save Changes' : 'Add Field'}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export const ActionPayloadBuilder = ({ action, editMode, onEditModeChange }: ActionPayloadBuilderProps) => {
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>(
    () => action.parameters || []
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingField, setEditingField] = useState<any>(null)

  const { mutateAsync: updateAction, isPending } = useUpdateActionTemplate(action.id)

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setPayloadFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)
        return arrayMove(items, oldIndex, newIndex)
      })
      setHasUnsavedChanges(true)
    }
  }

  const handleSaveField = (field: PayloadField) => {
    if (editingField) {
      // Update existing field
      setPayloadFields(prev =>
        prev.map(f => f.id === field.id ? field : f)
      )
      // toast.success('Field updated', {
      //   description: `"${field.name}" has been updated.`,
      // })
    } else {
      // Add new field
      setPayloadFields(prev => [...prev, field])
      toast.success('Field added', {
        description: `"${field.name}" has been added.`,
      })
    }
    setHasUnsavedChanges(true)
    setEditingField({})
  }

  const handleDeleteField = (id: string) => {
    const field = payloadFields.find(f => f.id === id)
    setPayloadFields(prev => prev.filter(f => f.id !== id))
    setHasUnsavedChanges(true)
    toast.info('Field removed', {
      description: `"${field?.name}" has been removed.`,
    })
  }

  const handleSavePayload = async () => {
    try {
      await updateAction({
        parameters: payloadFields
      })
      setHasUnsavedChanges(false)
      toast.success('Success', {
        description: "Payload template updated successfully",
      })
    } catch (error) {
      toast.error('Error', {
        description: "Failed to update payload template",
      })
    }
  }

  const handleCancel = () => {
    setPayloadFields(action.parameters || [])
    setHasUnsavedChanges(false)
    onEditModeChange?.(false)
  }

  const generatePayloadExample = useMemo(() => {
    const example: Record<string, any> = {}

    payloadFields.forEach(field => {
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        example[field.name] = field.defaultValue
        return
      }

      switch (field.type) {
        case 'string':
          example[field.name] = "example_string"
          break
        case 'text':
          example[field.name] = "example_text"
          break
        case 'number':
          example[field.name] = 123
          break
        case 'date':
          example[field.name] = new Date().toISOString().split('T')[0]
          break
        case 'array':
          if (field.arrayType === 'string') {
            example[field.name] = ["example", "values"]
          } else if (field.arrayType === 'number') {
            example[field.name] = [1, 2, 3]
          } else {
            example[field.name] = [{}]
          }
          break
        case 'json':
          example[field.name] = { key: "value" }
          break
        case 'enum':
          example[field.name] = field.enumValues?.[0] || "value"
          break
        case 'boolean':
          example[field.name] = true
          break
      }
    })

    return JSON.stringify(example, null, 2)
  }, [payloadFields])

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(generatePayloadExample)
      toast.success('Copied!', {
        description: "Payload example copied to clipboard",
      })
    } catch (error) {
      toast.error('Error', {
        description: "Failed to copy to clipboard",
      })
    }
  }

  const handleDownloadExample = () => {
    const blob = new Blob([generatePayloadExample], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${action.handle || 'action'}-payload-example.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Field Editor Drawer */}
      <FieldEditorDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        field={editingField}
        onSave={handleSaveField}
        onDelete={editingField ? () => handleDeleteField(editingField.id) : undefined}
        existingFields={payloadFields}
      />

      {/* Payload Fields Container */}
      <Container>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="w-full flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <Heading level="h3">Payload Fields</Heading>
                {hasUnsavedChanges && (
                  <Badge color="orange" size="small">Unsaved changes</Badge>
                )}
              </div>

              {!editMode && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => onEditModeChange?.(true)}
                >
                  <Eye className="h-4 w-4" /> Edit Payload
                </Button>
              )}
            </div>

            {editMode && (
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleCancel}
                  >
                    <XMark /> Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="small"
                  className="w-[150px]"
                  onClick={handleSavePayload}
                  disabled={isPending || !hasUnsavedChanges}
                >
                  <CheckCircle /> {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          {editMode ? (
            <>
              {/* Add New Field Button */}
              {!isDrawerOpen && (
                <Button
                  variant="secondary"
                  className="mb-6"
                  onClick={() => {
                    setEditingField(null)
                    setIsDrawerOpen(true)
                  }}
                >
                  <Plus /> Add New Field
                </Button>
              )}

              {/* Info Alert */}
              <Alert variant="info" className="mb-6">
                <Info />
                <div className="flex-1">
                  <Text size="small">
                    Drag fields using the grip handle <GripVertical className="h-4 w-4 inline" /> to reorder them.
                    Click the edit button to modify field properties.
                  </Text>
                </div>
              </Alert>

              {/* Existing Fields List with Drag and Drop */}
              {payloadFields.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={payloadFields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {payloadFields.map((field) => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          onRemove={handleDeleteField}
                          onEdit={(field) => {
                            setEditingField(field)
                            setIsDrawerOpen(true)
                          }}
                          editMode={editMode}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div
                  className="text-center py-16 bg-ui-bg-subtle rounded-lg border-2 border-dashed border-ui-border-base cursor-pointer hover:bg-ui-bg-base transition-colors"
                  onClick={() => {
                    setEditingField(null)
                    setIsDrawerOpen(true)
                  }}
                >
                  <Plus className="h-8 w-8 mx-auto mb-4 text-ui-fg-muted" />
                  <Text className="text-ui-fg-subtle">
                    No payload fields defined. Click to add your first field.
                  </Text>
                </div>
              )}
            </>
          ) : (
            /* View Mode: Display payload fields */
            <div className="space-y-2">
              {payloadFields.length > 0 ? (
                payloadFields.map((field) => (
                  <Container key={field.id}>
                    <div className="p-4">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Text className="font-medium">{field.name}</Text>
                        <Badge size="small">{field.type}</Badge>
                        {field.required && (
                          <Badge size="small" color="red">Required</Badge>
                        )}
                      </div>

                      {field.description && (
                        <Text className="text-ui-fg-subtle text-sm mb-2">{field.description}</Text>
                      )}

                      {field.enumValues && field.enumValues.length > 0 && (
                        <div className="mt-2">
                          <Text className="text-xs text-ui-fg-muted mb-1">Allowed values:</Text>
                          <div className="flex flex-wrap gap-1">
                            {field.enumValues.map((value, idx) => (
                              <Badge key={idx} size="small" variant="outlined">
                                {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {field.defaultValue !== undefined && field.defaultValue !== '' && (
                        <div className="mt-2">
                          <Text className="text-xs text-ui-fg-muted">
                            Default: <span className="font-mono">{String(field.defaultValue)}</span>
                          </Text>
                        </div>
                      )}
                    </div>
                  </Container>
                ))
              ) : (
                <div className="text-center py-12 bg-ui-bg-subtle rounded-lg">
                  <Text className="text-ui-fg-subtle">
                    No payload fields defined for this action.
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>

      {/* Payload Example Container */}
      <Container>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Heading level="h3">Payload Example</Heading>
            <div className="flex items-center gap-2">
              <Tooltip content="Copy to clipboard">
                <IconButton
                  variant="secondary"
                  size="small"
                  onClick={handleCopyExample}
                  disabled={payloadFields.length === 0}
                >
                  <Copy className="h-4 w-4" />
                </IconButton>
              </Tooltip>

              <Tooltip content="Download as JSON">
                <IconButton
                  variant="secondary"
                  size="small"
                  onClick={handleDownloadExample}
                  disabled={payloadFields.length === 0}
                >
                  <Download className="h-4 w-4" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

          <Text className="text-ui-fg-subtle mb-4">
            {payloadFields.length > 0
              ? "Based on the defined fields, here's an example of what the payload should look like:"
              : "Add fields to see an example payload structure."}
          </Text>

          <div className="border rounded-lg overflow-hidden">
            <CodeBlock
              snippets={[{
                label: "JSON",
                language: "json",
                code: generatePayloadExample,
              }]}
            >
              <CodeBlock.Header />
              <CodeBlock.Body />
            </CodeBlock>
          </div>
        </div>
      </Container>

      {/* Context Template Container */}
      {action.context_template && (
        <Container>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h3">Context Template</Heading>
              {action.context_as && (
                <Badge>{action.context_as}</Badge>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <CodeBlock
                snippets={[{
                  label: "JSON",
                  language: "json",
                  code: JSON.stringify(action.context_template, null, 2),
                }]}
              >
                <CodeBlock.Header />
                <CodeBlock.Body />
              </CodeBlock>
            </div>

            <Text className="mt-4 text-ui-fg-subtle text-sm">
              This template defines how the action context is structured and will be merged with the payload.
            </Text>
          </div>
        </Container>
      )}
    </div>
  )
}