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
} from "@medusajs/ui"
import { Widget } from "../../../../types/dashboards"

interface EditWidgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: Widget | null
  onSave: (widget: Widget) => void
}

export const EditWidgetModal: React.FC<EditWidgetModalProps> = ({
  open,
  onOpenChange,
  widget,
  onSave,
}) => {
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)

  useEffect(() => {
    if (widget) {
      setEditingWidget({ ...widget })
    }
  }, [widget])

  if (!editingWidget) return null

  const renderConfigFields = () => {
    switch (editingWidget.type) {
      case "stat":
        return (
          <>
            <div>
              <Label>Value</Label>
              <Input
                value={editingWidget.config.value || ""}
                onChange={(e) => setEditingWidget({
                  ...editingWidget,
                  config: { ...editingWidget.config, value: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editingWidget.config.description || ""}
                onChange={(e) => setEditingWidget({
                  ...editingWidget,
                  config: { ...editingWidget.config, description: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Trend (%)</Label>
              <Input
                type="number"
                value={editingWidget.config.trend || ""}
                onChange={(e) => setEditingWidget({
                  ...editingWidget,
                  config: { ...editingWidget.config, trend: e.target.value }
                })}
              />
            </div>
          </>
        )

      case "chart":
        return (
          <>
            <div>
              <Label>Chart Type</Label>
              <Select
                value={editingWidget.config.type || "line"}
                onValueChange={(val) => setEditingWidget({
                  ...editingWidget,
                  config: { ...editingWidget.config, type: val }
                })}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="line">Line Chart</Select.Item>
                  <Select.Item value="bar">Bar Chart</Select.Item>
                  <Select.Item value="pie">Pie Chart</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div>
              <Label>Data (JSON)</Label>
              <Textarea
                value={JSON.stringify(editingWidget.config.data || [], null, 2)}
                onChange={(e) => {
                  try {
                    const data = JSON.parse(e.target.value)
                    setEditingWidget({
                      ...editingWidget,
                      config: { ...editingWidget.config, data }
                    })
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={5}
              />
            </div>
          </>
        )

      case "table":
        return (
          <>
            <div>
              <Label>Columns (comma-separated)</Label>
              <Input
                value={editingWidget.config.columns?.join(", ") || ""}
                onChange={(e) => setEditingWidget({
                  ...editingWidget,
                  config: {
                    ...editingWidget.config,
                    columns: e.target.value.split(",").map(s => s.trim())
                  }
                })}
              />
            </div>
            <div>
              <Label>Page Size</Label>
              <Input
                type="number"
                value={editingWidget.config.pageSize || 5}
                onChange={(e) => setEditingWidget({
                  ...editingWidget,
                  config: { ...editingWidget.config, pageSize: parseInt(e.target.value) }
                })}
              />
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="z-20">
        <FocusModal.Header>
          <Button 
            variant="primary" 
            onClick={() => {
              onSave(editingWidget)
              onOpenChange(false)
            }}
          >
            Save Changes
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-2xl w-full p-8">
            <Heading level="h1" className="mb-2">Edit Widget</Heading>
            <UiText className="text-ui-fg-subtle mb-6">
              Configure your {editingWidget.type} widget
            </UiText>

            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingWidget.title}
                  onChange={(e) => setEditingWidget({
                    ...editingWidget,
                    title: e.target.value
                  })}
                />
              </div>

              {renderConfigFields()}
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}