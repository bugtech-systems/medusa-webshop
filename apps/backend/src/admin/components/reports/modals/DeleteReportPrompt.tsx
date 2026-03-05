import React from "react"
import { Prompt, Text } from "@medusajs/ui"
import { AdminReport } from "../../../../types/reports"

interface DeleteReportPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AdminReport | null
  onConfirm: () => Promise<void>
}

export const DeleteReportPrompt: React.FC<DeleteReportPromptProps> = ({
  open,
  onOpenChange,
  record,
  onConfirm,
}) => {
  if (!record) return null

  const handleConfirm = async () => {
    await onConfirm()
    // onOpenChange(false)
  }


  return (
    <Prompt open={open} onOpenChange={onOpenChange}>
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>Delete Report</Prompt.Title>
          <Prompt.Description>
            Are you sure you want to delete "{record.label}"?
          </Prompt.Description>
        </Prompt.Header>
        <div className="p-4 bg-ui-bg-subtle border-y border-ui-border-base">
          <Text size="small" className="text-ui-fg-subtle">
            This action cannot be undone. The report will be permanently removed.
          </Text>
        </div>
        <Prompt.Footer>
          <Prompt.Cancel>Cancel</Prompt.Cancel>
          <Prompt.Action onClick={handleConfirm}>Delete</Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}