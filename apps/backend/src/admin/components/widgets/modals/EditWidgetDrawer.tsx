import React, { useState, useEffect } from "react"
import {
  Drawer,
  Input,
  Label,
  Textarea,
  Text,
  Button,
  toast,
} from "@medusajs/ui"
import { Widget } from "../../dashboard/types"
import { ConfigStep } from "./AddWidgetModal/ConfigStep"

interface EditWidgetDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: Widget | null
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void
}

export const EditWidgetDrawer: React.FC<EditWidgetDrawerProps> = ({
  open,
  onOpenChange,
  widget,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<Partial<Widget>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (widget) {
      setFormData(widget)
    }
  }, [widget])

  if (!widget) return null

  const handleUpdate = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate(widget.id, {
        title: formData.title,
        description: formData.description,
        config: formData.config,
      })
      onOpenChange(false)
      toast.success("Widget updated successfully")
    } catch (error) {
      toast.error("Failed to update widget")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="z-40">
        <Drawer.Header>
          <Drawer.Title>Edit Widget</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>
          <div className="space-y-4">
            <div>
              <Label>Widget Title</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {widget.type && (
              <div className="pt-4 border-t border-ui-border-base">
                <Text weight="plus" size="small" className="mb-2">
                  Configuration
                </Text>
                <ConfigStep
                  type={widget.type}
                  config={formData.config || {}}
                  onChange={(config) => setFormData({ ...formData, config })}
                  onBack={() => {}}
                  onSave={handleUpdate}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleUpdate}
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}