import { useEffect, useState } from "react"
import {
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Textarea,
  Switch,
  toast,
  Hint,
  Badge,
  clx,
} from "@medusajs/ui"
import {
  useForm,
  Controller,
  FormProvider,
  useFormContext,
  useWatch,
} from "react-hook-form"
import { useAiModels, useCreateAiModel, useUpdateAiModel } from "../../../../hooks/api/ai-models"
import { useExecuteAction } from "../../../../hooks/api/actions"

/* ============================================================
   Types
============================================================ */

type AiModelProvider = "openai" | "anthropic" | "cohere" | "huggingface" | "custom"
type AiModelType = "chat" | "completion" | "embedding" | "image" | "audio"
type AiModelStatus = "draft" | "active" | "inactive" | "training"

interface AiModelFormData {
  name: string
  description?: string
  provider: AiModelProvider
  base_model_id?: string
  model_type: AiModelType
  status: AiModelStatus
  config: {
    api_key?: string
    endpoint?: string
    max_tokens?: number
    temperature?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stop_sequences?: string[]
    [key: string]: any
  }
  metadata?: Record<string, any>
}

interface AiModelFormDrawerProps {
  model?: any
  children: React.ReactNode
  isOpen?: boolean
  handleOpen?: (open: boolean) => void
}

/* ============================================================
   Available Base Models Dropdown
============================================================ */

interface BaseModelSelectorProps {
  provider?: AiModelProvider
  isLoading?: boolean
  baseModels?: Array<{
    id: string
    name: string
    provider: string
    model_type: string
    context_length?: number
  }>
}

const BaseModelSelector = ({ provider, isLoading, baseModels }: BaseModelSelectorProps) => {
  const { control } = useFormContext<AiModelFormData>()
  const [filteredModels, setFilteredModels] = useState(baseModels || [])

  useEffect(() => {
    if (provider && baseModels) {
      setFilteredModels(
        baseModels.filter(model => 
          model.provider === provider || 
          (provider === "custom" && model.provider === "custom")
        )
      )
    } else {
      setFilteredModels(baseModels || [])
    }
  }, [provider, baseModels])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Label>Base Model</Label>
        <Select disabled>
          <Select.Trigger>
            <Select.Value placeholder="Loading models..." />
          </Select.Trigger>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Base Model</Label>
        <Hint className="text-xs text-ui-fg-muted">
          {provider ? `${provider.toUpperCase()} models` : "Select provider first"}
        </Hint>
      </div>
      <Controller
        name="base_model_id"
        control={control}
        render={({ field }) => (
          <Select 
            value={field.value} 
            onValueChange={field.onChange}
            disabled={!provider}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select a base model" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Recommended Models</Select.Label>
                {filteredModels
                  .filter(model => model.provider === provider)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((model) => (
                    <Select.Item key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-ui-fg-muted">
                          {model.model_type} • {model.context_length ? `${model.context_length.toLocaleString()} tokens` : "Custom"}
                        </span>
                      </div>
                    </Select.Item>
                  ))}
              </Select.Group>
              
              {provider !== "custom" && (
                <Select.Group>
                  <Select.Label>Custom/Other</Select.Label>
                  <Select.Item value="custom">
                    <div className="flex flex-col">
                      <span>Custom Model</span>
                      <span className="text-xs text-ui-fg-muted">Use custom endpoint and parameters</span>
                    </div>
                  </Select.Item>
                </Select.Group>
              )}
                <Select.Group>
                  <Select.Label>Ollama</Select.Label>
                  <Select.Item value="llama3.2:1b">
                    <div className="flex flex-col">
                      <span>llama3.2:1b</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="llama2:7b">
                    <div className="flex flex-col">
                      <span>llama2:7b</span>
                    </div>
                  </Select.Item>
                   <Select.Item value="mistral">
                    <div className="flex flex-col">
                      <span>Mistral</span>
                    </div>
                  </Select.Item>
                </Select.Group>
            </Select.Content>
          </Select>
        )}
      />
      <Hint>
        The base model that will be used. Selecting "Custom Model" allows you to specify your own endpoint.
      </Hint>
    </div>
  )
}

/* ============================================================
   Provider-specific Configuration
============================================================ */

const ProviderConfigFields = () => {
  const { control, watch } = useFormContext<AiModelFormData>()
  const provider = watch("provider")
  const baseModelId = watch("base_model_id")
  const isCustomModel = baseModelId === "custom"

  if (provider === "custom" || isCustomModel) {
    return (
      <div className="space-y-4">
        <Heading level="h3" className="text-ui-fg-base">
          Custom Configuration
        </Heading>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>API Key</Label>
            <Controller
              name="config.api_key"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="sk-..."
                  autoComplete="off"
                />
              )}
            />
            <Hint>Your API key for the custom model</Hint>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Endpoint URL</Label>
            <Controller
              name="config.endpoint"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              )}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Heading level="h3" className="text-ui-fg-base">
        Model Parameters
      </Heading>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Temperature</Label>
            <span className="text-xs text-ui-fg-muted">
              {watch("config.temperature") ?? 0.7}
            </span>
          </div>
          <Controller
            name="config.temperature"
            control={control}
            defaultValue={0.7}
            render={({ field }) => (
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={field.value ?? 0.7}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />
          <Hint>Controls randomness: 0 = deterministic, 2 = creative</Hint>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Max Tokens</Label>
          <Controller
            name="config.max_tokens"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="1"
                max="32768"
                placeholder="2048"
              />
            )}
          />
          <Hint>Maximum number of tokens to generate</Hint>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Top P</Label>
          <Controller
            name="config.top_p"
            control={control}
            defaultValue={1}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="0"
                max="1"
                step="0.05"
                placeholder="1"
              />
            )}
          />
          <Hint>Nucleus sampling: 0.1 = top 10% tokens</Hint>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Frequency Penalty</Label>
          <Controller
            name="config.frequency_penalty"
            control={control}
            defaultValue={0}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min="-2"
                max="2"
                step="0.1"
                placeholder="0"
              />
            )}
          />
          <Hint>Positive values reduce repetition</Hint>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Controlled Select Component
============================================================ */

const ControlledSelect = ({
  name,
  options,
  placeholder,
  disabled,
  ...params
}: {
  name: string
  placeholder: string
  options: { label: string; value: string }[]
  disabled?: boolean
}) => {
  const { control } = useFormContext<AiModelFormData>()
  
  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => (
        <Select 
          value={field.value} 
          onValueChange={field.onChange}
          disabled={disabled}
        >
          <Select.Trigger>
            <Select.Value placeholder={placeholder} />
          </Select.Trigger>
          <Select.Content>
            {options.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      )}
    />
  )
}

/* ============================================================
   Main Drawer Component
============================================================ */

export const ModelFormDrawer = ({
  model: aiModel,
  children,
  isOpen,
  handleOpen,
}: AiModelFormDrawerProps) => {
  const [open, setOpen] = useState(false)
  const [autoGenerateHandle, setAutoGenerateHandle] = useState(true)
  const [baseModels, setBaseModels] = useState([]);
  const { data: baseModelsData, mutateAsync: executeAction, isPending: isExecuting } = useExecuteAction('get-local-ollama-models')

  // Fetch available base models
  // const { data: baseModelsData, isLoading: isLoadingBaseModels } = useAiModels({
  //   status: "active",
  //   limit: 100,
  // })
  
  const { mutateAsync: createAiModel, isPending: isCreating } = useCreateAiModel()
  const { mutateAsync: updateAiModel, isPending: isUpdating } = useUpdateAiModel(aiModel?.id)

  const form = useForm<AiModelFormData>({
    defaultValues: {
      name: aiModel?.name ?? "",
      description: aiModel?.description ?? "",
      model_name: aiModel?.model_name ?? "",
      base_model: aiModel?.base_model ?? "",

      provider: aiModel?.provider ?? "ollama",
      base_model_id: aiModel?.base_model_id ?? "",
      model_type: aiModel?.model_type ?? "chat",
      status: aiModel?.status ?? "draft",
      config: aiModel?.config ?? {
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      },
      metadata: aiModel?.metadata ?? {},
    },
  })

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    register,
    formState: { errors, isDirty },
  } = form

  const name = watch("name")
  const provider = watch("provider")
  const baseModelId = watch("base_model_id")
  const isCustomModel = baseModelId === "custom"

  // Auto-generate handle from name
  useEffect(() => {
    if (autoGenerateHandle && name) {
      const handle = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50)
      
      // Create a unique handle by appending provider if needed
      const uniqueHandle = handle
      setValue("handle", uniqueHandle)
      setValue("model_name", uniqueHandle)

    }
  }, [name, provider, autoGenerateHandle, aiModel, setValue])

  // Reset form when opening/closing
  useEffect(() => {
    setOpen(isOpen ?? false)
    if (!isOpen && aiModel) {
      reset({
        name: aiModel.name,
        model_name: aiModel.model_name,
        system: aiModel.system,
        description: aiModel.description,
        provider: aiModel.provider,
        base_model: aiModel.base_model,
        model_type: aiModel.model_type,
        status: aiModel.status,
        config: aiModel.config,
        metadata: aiModel.metadata,
      })
    }
  }, [isOpen, aiModel, reset])

  const onOpenChange = (val: boolean) => {
    setOpen(val)
    handleOpen?.(val)
  }

  const onSubmit = async (data: AiModelFormData) => {
  console.log(data, 'ddddd')
    try {


  console.log(data, aiModel, 'MODELL UPDATEn yn')

      if (aiModel) {
        await updateAiModel(data)
        toast.success("AI Model updated successfully")
      } else {
        await createAiModel(data)
        toast.success("AI Model created successfully")
      }
      
      reset()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save AI Model")
    }
  }



console.log(baseModelsData, 'MODELS')

  return (
    <>
      <div onClick={() => onOpenChange(true)}>{children}</div>

      <Drawer open={open} onOpenChange={onOpenChange}>
        <Drawer.Content className="h-[90vh] max-h-[90vh] flex flex-col">
          {/* Header */}
          <Drawer.Header className="shrink-0 border-b">
            <Drawer.Title>
              {aiModel ? "Edit AI Model" : "Create AI Model"}
            </Drawer.Title>
            <Drawer.Description>
              {aiModel 
                ? "Update your AI model configuration"
                : "Configure a new AI model for use in your application"
              }
            </Drawer.Description>
          </Drawer.Header>

          <FormProvider {...form}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Scrollable Body */}
              <Drawer.Body className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-8">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <Heading level="h2" className="text-ui-fg-base">
                      Basic Information
                    </Heading>
                    
                    <div className="flex flex-col gap-2">
                      <Label>
                        Name <Badge size="small" color="red">Required</Badge>
                      </Label>
                      <Input 
                        {...register("name", { 
                          required: "Name is required",
                          minLength: { value: 2, message: "Name must be at least 2 characters" }
                        })} 
                        placeholder="e.g., GPT-4 Customer Support"
                      />
                      {errors.name && (
                        <Hint variant="error">{errors.name.message}</Hint>
                      )}
                    </div>
                  {/* Handle */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Model Name</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ui-fg-muted">Auto-generate</span>
                          <Switch
                            checked={autoGenerateHandle}
                            onCheckedChange={setAutoGenerateHandle}
                          />
                        </div>
                    </div>
                    <Input
                      {...register("model_name", { required: true })}
                      disabled={autoGenerateHandle}
                      placeholder="alayon-ai"
                    />
                  </div>
                    <div className="flex flex-col gap-2">
                      <Label>Description</Label>
                      <Textarea
                        {...register("description")}
                        placeholder="Describe what this model is used for..."
                        rows={3}
                      />
                    </div>
                  
                  </div>

                </div>
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="shrink-0 border-t">
                <div className="flex items-center justify-between w-full">
                  {!aiModel && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={autoGenerateHandle}
                        onCheckedChange={setAutoGenerateHandle}
                        size="small"
                      />
                      <Label size="small" className="text-ui-fg-muted">
                        Auto-generate handle
                      </Label>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 ml-auto">
                    <Drawer.Close asChild>
                      <Button variant="secondary">Cancel</Button>
                    </Drawer.Close>
                    <Button 
                      type="submit" 
                      isLoading={isCreating || isUpdating}
                      // disabled={!!aiModel}
                      // onClick={onSubmit}
                    >
                      {aiModel ? "Update Model" : "Create Model"}
                    </Button>
                  </div>
                </div>
              </Drawer.Footer>
            </form>
          </FormProvider>
        </Drawer.Content>
      </Drawer>
    </>
  )
}