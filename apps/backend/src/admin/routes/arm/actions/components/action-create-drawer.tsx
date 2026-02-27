import { useState } from "react"
import {
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Textarea,
  Toaster,
  toast
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useCreateAction } from "../../../../hooks/api/actions"

interface ActionFormData {
  name: string
  description: string
  type: string
  status: "draft" | "active"
}

interface ActionCreateDrawerProps {
  children: React.ReactNode
}

export const ActionCreateDrawer = ({ children }: ActionCreateDrawerProps) => {
  const [open, setOpen] = useState(false)
  const { mutateAsync: createAction, isPending } = useCreateAction()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActionFormData>({
    defaultValues: {
      status: "draft",
      type: "http_request",
    },
  })

  const onSubmit = async (data: ActionFormData) => {
    try {
      await createAction(data)
      toast({
        title: "Success",
        description: "Action created successfully",
        variant: "success",
      })
      setOpen(false)
      reset()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create action",
        variant: "error",
      })
    }
  }

  const actionTypes = [
    { label: "HTTP Request", value: "http_request" },
    { label: "Webhook", value: "webhook" },
    { label: "Email", value: "email" },
    { label: "Notification", value: "notification" },
    { label: "Custom Function", value: "custom_function" },
  ]

  const statuses = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
  ]

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Create New Action</Drawer.Title>
          </Drawer.Header>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Drawer.Body className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register("name", { required: "Name is required" })}
                  placeholder="e.g., Send Welcome Email"
                />
                {errors.name && (
                  <Text className="text-ui-fg-error" size="small">
                    {errors.name.message}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of what this action does..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select {...register("type", { required: true })}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select type" />
                    </Select.Trigger>
                    <Select.Content>
                      {actionTypes.map((type) => (
                        <Select.Item key={type.value} value={type.value}>
                          {type.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select {...register("status")}>
                    <Select.Trigger>
                      <Select.Value placeholder="Select status" />
                    </Select.Trigger>
                    <Select.Content>
                      {statuses.map((status) => (
                        <Select.Item key={status.value} value={status.value}>
                          {status.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>
            </Drawer.Body>

            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </Drawer.Close>
              <Button type="submit" isLoading={isPending}>
                Create Action
              </Button>
            </Drawer.Footer>
          </form>
        </Drawer.Content>
      </Drawer>
    </>
  )
}