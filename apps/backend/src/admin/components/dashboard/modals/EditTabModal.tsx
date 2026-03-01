import React, { useState, useEffect } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text as UiText,
  Label,
  Input,
  Textarea,
  toast,
} from "@medusajs/ui"
import { DashboardTab } from "../../../../types/dashboards"

interface EditTabModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tab: DashboardTab | null
  onSave: (title: string, description: string) => void
}

export const EditTabModal: React.FC<EditTabModalProps> = ({
  open,
  onOpenChange,
  tab,
  onSave,
}) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when tab changes or modal opens
  useEffect(() => {
    if (tab && open) {
      setTitle(tab.title)
      setDescription(tab.description || "")
    }
  }, [tab, open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      // Small delay to prevent visual flicker
      setTimeout(() => {
        setTitle("")
        setDescription("")
        setIsLoading(false)
      }, 200)
    }
  }, [open])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a tab title")
      return
    }

    setIsLoading(true)
    
    try {
      await onSave(title.trim(), description.trim())
      toast.success("Tab updated successfully")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update tab")
      console.error("Error updating tab:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    
    // Close on Escape
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (!tab) return null

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="z-20">
        {/* Header */}
        <FocusModal.Header>
          <div className="flex items-center gap-2 w-full justify-end">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={!title.trim()}
            >
              Save Changes
            </Button>
          </div>
        </FocusModal.Header>

        {/* Body */}
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-2xl w-full p-8">
            {/* Header Section */}
            <div className="mb-8">
              <Heading level="h1" className="text-2xl font-semibold mb-2">
                Edit Tab
              </Heading>
              <UiText className="text-ui-fg-subtle">
                Update the tab title and description. Press{" "}
                <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded text-ui-fg-subtle text-xs">
                  ⌘+Enter
                </kbd>{" "}
                to save.
              </UiText>
            </div>

            {/* Form Section */}
            <div className="space-y-6" onKeyDown={handleKeyDown}>
              {/* Tab Title */}
              <div className="space-y-2">
                <Label htmlFor="tab-title" className="text-ui-fg-subtle">
                  Tab Title <span className="text-ui-fg-error">*</span>
                </Label>
                <Input
                  id="tab-title"
                  placeholder="e.g., Analytics, Reports, Overview"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  className="w-full"
                />
                <UiText size="small" className="text-ui-fg-subtle">
                  Give your tab a clear and descriptive title
                </UiText>
              </div>

              {/* Tab Description */}
              <div className="space-y-2">
                <Label htmlFor="tab-description" className="text-ui-fg-subtle">
                  Description <span className="text-ui-fg-muted">(optional)</span>
                </Label>
                <Textarea
                  id="tab-description"
                  placeholder="Describe what this tab is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                  className="w-full resize-none"
                />
                <UiText size="small" className="text-ui-fg-subtle">
                  Help others understand the purpose of this tab
                </UiText>
              </div>

              {/* Tab Info Card */}
              <div className="mt-8 p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Heading level="h3" className="text-sm font-medium mb-2">
                      Tab Information
                    </Heading>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ui-fg-subtle">Widgets</span>
                        <span className="font-medium">{tab.widgets?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ui-fg-subtle">Grid Columns</span>
                        <span className="font-medium">{tab.layout?.columns || 12}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ui-fg-subtle">Row Height</span>
                        <span className="font-medium">{tab.layout?.rowHeight || 100}px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ui-fg-subtle">Gap</span>
                        <span className="font-medium">{tab.layout?.gap || 16}px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="mt-6 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
                <Heading level="h3" className="text-sm font-medium mb-2">
                  💡 Tips
                </Heading>
                <ul className="space-y-2 text-sm text-ui-fg-subtle list-disc list-inside">
                  <li>Use clear, descriptive titles for easy navigation</li>
                  <li>Add descriptions to explain the tab's purpose to other users</li>
                  <li>You can always edit this information later</li>
                  <li>Changes will be saved locally until you click "Save Changes"</li>
                </ul>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-4 flex items-center justify-end gap-4 text-xs text-ui-fg-muted">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">Enter</kbd>
                  <span className="ml-1">to save</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-ui-bg-base border border-ui-border-base rounded">Esc</kbd>
                  <span className="ml-1">to cancel</span>
                </span>
              </div>
            </div>
          </div>
        </FocusModal.Body>

        {/* Footer */}
        <FocusModal.Footer>
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={!title.trim()}
            >
              Save Changes
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}