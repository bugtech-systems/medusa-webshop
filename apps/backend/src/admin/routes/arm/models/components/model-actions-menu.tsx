'use client'

import { ModelFormDrawer } from './model-form-drawer';
import { DropdownMenu, IconButton, usePrompt, toast } from "@medusajs/ui"
import { EllipsisHorizontal, PencilSquare, Trash, MediaPlay, ChatBubble } from "@medusajs/icons"
import { useDeleteAction, useDuplicateAction, useExecuteAction } from "../../../../hooks/api/actions"
import { useNavigate } from "react-router-dom"
import { useState } from 'react';
import { AIModelTestDrawer } from './model-chat-drawer';
import { PlaneTakeoff } from 'lucide-react';

interface ActionActionsMenuProps {
  model: any
}

export const ModelActionsMenu = ({ model }: ActionActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false)
  const prompt = usePrompt()
  const navigate = useNavigate()

  const { mutateAsync: deleteAction, isPending: isDeleting } = useDeleteAction()
  const { mutateAsync: duplicateAction, isPending: isDuplicating } = useDuplicateAction()
  const { mutateAsync: executeAction, isPending: isExecuting } = useExecuteAction('push-model')

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: "Delete Action",
      description: "Are you sure you want to delete this model? This model cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      try {
        await deleteAction(model.id)
        toast({
          title: "Success",
          description: "Action deleted successfully",
          variant: "success",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete model",
          variant: "error",
        })
      }
    }
  }

  const handleDuplicate = async () => {
    try {
      await duplicateAction(model.id)
      toast({
        title: "Success",
        description: "Action duplicated successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate model",
        variant: "error",
      })
    }
  }
  
  const handleEdit = () => {
    // navigate(`/app/actions/${model.id}/edit`)
    setOpen(true)
    
  }

  const handleDeploy = async () => {
    try {
    
    
      await executeAction({ parameters: {
        model: model.model_name,
        from: model.base_model,
        system: model.system,
        parameters: model.config
      }
      })
      
      toast.success('Success', {
        description: "Action executed successfully",
      })
    } catch (error) {
      toast.error("Error", {
        description: "Failed to execute model",
      })
    }
  }
  
    const handleSendMessage = async (message: string, context: any) => {
    // Implement your actual AI model API call here
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return `This is a response from the ${context.model} model. You said: "${message}"`
  }

  const handleUpdateContext = (newContext: any) => {
    // Save context to state or backend
  }



  return (
  <>
  <ModelFormDrawer 
     model={model}
     isOpen={open}
     handleOpen={setOpen}
  />
        <AIModelTestDrawer
        open={isChatDrawerOpen}
        onOpenChange={setIsChatDrawerOpen}
        onSendMessage={handleSendMessage}
        onUpdateContext={handleUpdateContext}
        initialParameters={model.config}
        initialContext={model}
      />
      <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={handleEdit}>
          <PencilSquare className="text-ui-fg-subtle mr-2" />
          Edit
        </DropdownMenu.Item>
        {/* ✅ Correct separator usage */}
        <DropdownMenu.Separator />
      
        <DropdownMenu.Item onClick={handleDeploy} disabled={isDuplicating}>
          <PlaneTakeoff className="text-ui-fg-subtle mr-2" />
          Re-deploy
        </DropdownMenu.Item>
        <DropdownMenu.Item onClick={() => setIsChatDrawerOpen(true)} >
          <ChatBubble className="text-ui-fg-subtle mr-2" />
          Chat-test
        </DropdownMenu.Item>
        {/* ✅ Correct separator usage */}
        <DropdownMenu.Separator />
        <DropdownMenu.Item onClick={handleDelete} disabled={isDeleting} className="text-ui-fg-error">
          <Trash className="text-ui-fg-error mr-2" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
    </>
     
  )
}