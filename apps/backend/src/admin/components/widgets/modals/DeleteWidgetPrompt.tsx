import React from "react"
import {
  Prompt,
  Text,
} from "@medusajs/ui"
import { Widget } from "../../dashboard/types"

interface DeleteWidgetPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: Widget | null
  onConfirm: () => void
}

export const DeleteWidgetPrompt: React.FC<DeleteWidgetPromptProps> = ({
  open,
  onOpenChange,
  widget,
  onConfirm,
}) => {
  if (!widget) return null

  return (
    <Prompt open={open} onOpenChange={onOpenChange}>
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>Delete Widget</Prompt.Title>
          <Prompt.Description>
            Are you sure you want to delete "{widget.title}"?
          </Prompt.Description>
        </Prompt.Header>
        <div className="p-4 bg-ui-bg-subtle border-y border-ui-border-base">
          <Text size="small" className="text-ui-fg-subtle">
            This action cannot be undone. The widget will be permanently removed from your dashboard.
          </Text>
        </div>
        <Prompt.Footer>
          <Prompt.Cancel onClick={() => onOpenChange(false)}>
            Cancel
          </Prompt.Cancel>
          <Prompt.Action onClick={onConfirm}>
            Delete
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}