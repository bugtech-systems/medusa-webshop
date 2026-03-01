import React, { useState } from "react"
import {
  FocusModal,
  Button,
  Heading,
  Text as UiText,
  Label,
  Input,
  Textarea,
} from "@medusajs/ui"

interface CreateTabModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTab: (tab: any) => void
}

export const CreateTabModal: React.FC<CreateTabModalProps> = ({
  open,
  onOpenChange,
  onCreateTab,
}) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleCreate = () => {
    if (!title.trim()) return
    onCreateTab({title, description})
    setTitle("")
    setDescription("")
    // onOpenChange(false)
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content className="z-20">
        <FocusModal.Header>
          <Button variant="primary" onClick={handleCreate}>
            Create Tab
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center">
          <div className="max-w-lg w-full p-8">
            <Heading level="h1" className="mb-2">Create New Tab</Heading>
            <UiText className="text-ui-fg-subtle mb-6">
              Add a new tab to organize your dashboard widgets
            </UiText>
            <div className="space-y-4">
              <div>
                <Label>Tab Title</Label>
                <Input
                  placeholder="Enter tab title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Enter tab description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}