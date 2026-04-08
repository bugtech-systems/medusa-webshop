'use client'

import { ActionFormDrawer } from './action-form-drawer';
import { DropdownMenu, IconButton, usePrompt, toast } from "@medusajs/ui"
import { EllipsisHorizontal, PencilSquare, Trash, MediaPlay } from "@medusajs/icons"
import { useCreateActionTemplate, useDeleteAction, useDuplicateAction, useExecuteAction } from "../../../../hooks/api/actions"
import { useNavigate } from "react-router-dom"
import { useState } from 'react';
import { ExecuteActionDrawer } from './action-execution-drawer';
import { Plane } from 'lucide-react';

interface ActionActionsMenuProps {
  action: any
}

export const ActionActionsMenu = ({ action }: ActionActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState('edit');
  const [openExec, setOpenExec] = useState(false);
  const prompt = usePrompt()
  const { mutateAsync: createAction, isPending: isCreating } =
    useCreateActionTemplate()
  const { mutateAsync: deleteAction, isPending: isDeleting } = useDeleteAction()
  const { mutateAsync: executeAction, isPending: isExecuting } = useExecuteAction(action.id)

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: "Delete Action",
      description: "Are you sure you want to delete this action? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      try {
        await deleteAction(action.id)
        toast.success("Success", {
          description: "Action deleted successfully",
        })
      } catch (error) {
        toast.error("Error", {
          description: "Failed to delete action",
        })
      }
    }
  }

  const handleDuplicate = async () => {
    try {
      setActionType('duplicate')
      let { id, ...duplicate} = action;
      await createAction(duplicate);
      
       toast.success('Success', {
        description: "Action duplicated successfully",
      }) 
      
      
    } catch (error) {
      toast.error("Error", {
        description: "Failed to duplicate action",
      })
    }
  }
  
  const handleEdit = () => {
    // navigate(`/app/actions/${action.id}/edit`)
    setActionType('edit')
    setOpen(true)
    
  }
  
  

  const handleExecute = async () => {
    try {
      await executeAction({ async: false })
      toast({
        title: "Success",
        description: "Action executed successfully",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute action",
        variant: "error",
      })
    }
  }

  return (
  <>
  <ActionFormDrawer 
     action={action}
     isOpen={open}
     handleOpen={setOpen}
  />
      {/* <ExecuteActionDrawer
             action={action}
             isOpen={openExec}
             handleOpen={setOpenExec}
             / > */}
      
      <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>

          {/* <DropdownMenu.Item disabled={isExecuting} onClick={() => setOpenExec(true)}>
            <MediaPlay className="text-ui-fg-subtle mr-2" />
            Execute
          </DropdownMenu.Item> */}
        
        {/* ✅ Correct separator usage */}
        <DropdownMenu.Separator />
 
        <DropdownMenu.Item onClick={handleEdit}>
          <PencilSquare className="text-ui-fg-subtle mr-2" />
          Edit
          
        </DropdownMenu.Item>
        
        <DropdownMenu.Item onClick={handleDuplicate} disabled={isCreating}>
          <Plane className="text-ui-fg-subtle mr-2" />
          Duplicate
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