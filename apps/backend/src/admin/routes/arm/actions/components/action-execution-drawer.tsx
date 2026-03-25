import React, { useEffect, useState, useCallback, useRef } from "react"
import {
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  Textarea,
  Switch,
  toast,
  Badge,
  Tabs,
  Container,
  IconButton,
  Tooltip,
  clx,
  CodeBlock,
  FocusModal,
  Alert,
  Text,
} from "@medusajs/ui"
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
} from "react-hook-form"
import {
  PlaySolid,
  ChevronDown,
  ChevronUpMini,
  ReplaySolid,
  Clock,
  XCircle,
  CheckCircle,
  InformationCircle,
  CogSixTooth
} from "@medusajs/icons"
import { ArrowUp, ArrowDown, FilePlus, Code } from 'lucide-react';
import {
  useExecuteAction,
  useActionExecutionLogs,
  useActionExecutionHistory,
} from "../../../../hooks/api/actions"

/* ============================================================
   Types
============================================================ */

interface ActionParameter {
  name: string
  label?: string
  type: "string" | "number" | "boolean" | "json" | "text" | "array" | "object"
  required?: boolean
  placeholder?: string
  defaultValue?: any
  description?: string
  options?: { label: string; value: string }[]
}

interface ExecuteActionDrawerProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  action: {
    id: string
    name: string
    description?: string
    parameters?: ActionParameter[]
  }
  children: React.ReactNode
}

interface ExecutionResult {
  status?: "success" | "error" | "pending"
  status_code?: number
  data?: any
  error?: any
  execution_time?: number
  headers?: Record<string, string>
}

interface AdvancedParameters {
  headers: Record<string, string>
  context: Record<string, any>
  timeout: number
}

/* ============================================================
   Parameter Renderer
============================================================ */

const ParameterField = ({ param }: { param: ActionParameter }) => {
  const { register, control, watch, setValue } = useFormContext()
  const value = watch(param.name)


  const renderField = () => {
    switch (param.type) {
      case "boolean":
        return (
          <Controller
            name={param.name}
            control={control}
            defaultValue={param.defaultValue ?? false}
            render={({ field }) => (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Label className="flex items-center gap-2">
                    {param.label ?? param.name}
                    {param.required && (
                      <Badge size="2xsmall" color="red">
                        Required
                      </Badge>
                    )}
                  </Label>
                  {param.description && (
                    <span className="text-xs text-ui-fg-subtle">
                      {param.description}
                    </span>
                  )}
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        )

      case "json":
      case "text":
        return (
          <div className="w-full flex flex-col gap-2">
            <Label className="flex items-center gap-2">
              {param.label ?? param.name}
              {param.required && (
                <Badge size="2xsmall" color="red">
                  Required
                </Badge>
              )}
            </Label>
            {param.description && (
              <span className="text-xs text-ui-fg-subtle mb-1">
                {param.description}
              </span>
            )}
            <Textarea
              rows={4}
              placeholder={param.placeholder ?? (param.type === "json" ? "{}" : "")}
              {...register(param.name, {
                required: param.required,
                validate: param.type === "json" ? (value) => {
                  if (!value || value.trim() === "") return true
                  try {
                    JSON.parse(value)
                    return true
                  } catch {
                    return "Invalid JSON format"
                  }
                } : undefined,
                
              })}
              className="font-mono text-sm min-h-[80px]"
              defaultValue={param.defaultValue}

            />
            {param.type === "json" && (
              <div className="flex justify-end">
                <Button
                  size="small"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    try {
                      const current = value || "{}"
                      const parsed = JSON.parse(current)
                      setValue(param.name, JSON.stringify(parsed, null, 2))
                    } catch {
                      toast.error("Invalid JSON")
                    }
                  }}
                >
                  <Code size={16} /> Format JSON
                </Button>
              </div>
            )}
          </div>
        )

      case "number":
        return (
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2">
              {param.label ?? param.name}
              {param.required && (
                <Badge size="2xsmall" color="red">
                  Required
                </Badge>
              )}
            </Label>
            {param.description && (
              <span className="text-xs text-ui-fg-subtle">
                {param.description}
              </span>
            )}
            <Input
              type="number"
              placeholder={param.placeholder}
              {...register(param.name, {
                required: param.required,
                valueAsNumber: true,
              })}
              defaultValue={Number(param.defaultValue)}
            />
          </div>
        )

      case "array":
        return (
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2">
              {param.label ?? param.name}
              {param.required && (
                <Badge size="2xsmall" color="red">
                  Required
                </Badge>
              )}
            </Label>
            {param.description && (
              <span className="text-xs text-ui-fg-subtle">
                {param.description}
              </span>
            )}
            <Textarea
              rows={3}
              placeholder={param.placeholder ?? "Enter values separated by commas or new lines"}
              {...register(param.name, {
                required: param.required,
                value: (value) => {
                  if (!value) return []
                  return value.split(/[\n,]/).map((item: string) => item.trim()).filter(Boolean)
                },
              })}
              className="min-h-[80px]"
              
            />
          </div>
        )

      default: // string, object, etc.
        if (param.options && param.options.length > 0) {
          return (
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-2">
                {param.label ?? param.name}
                {param.required && (
                  <Badge size="2xsmall" color="red">
                    Required
                  </Badge>
                )}
              </Label>
              {param.description && (
                <span className="text-xs text-ui-fg-subtle">
                  {param.description}
                </span>
              )}
              <Controller
                name={param.name}
                control={control}
                defaultValue={param.defaultValue ?? ""}
                render={({ field }) => (
                  <select
                    className={clx(
                      "flex min-h-10 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm",
                      "transition-fg outline-none",
                      "focus-visible:shadow-borders-interactive-with-active",
                      "hover:bg-ui-bg-base-hover",
                      "disabled:text-ui-fg-disabled disabled:bg-ui-bg-disabled",
                      "aria-[invalid=true]:!shadow-borders-error"
                    )}
                    {...field}
                  >
                    <option value="">Select an option</option>
                    {param.options!.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          )
        }

        return (
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-2">
              {param.label ?? param.name}
              {param.required && (
                <Badge size="2xsmall" color="red">
                  Required
                </Badge>
              )}
            </Label>
            {param.description && (
              <span className="text-xs text-ui-fg-subtle">
                {param.description}
              </span>
            )}
            <Input
              type="text"
              placeholder={param.placeholder}
              {...register(param.name, { required: param.required })}
              defaultValue={param.defaultValue}
            />
          </div>
        )
    }
  }

  return <div className="space-y-2 w-full">{renderField()}</div>
}

/* ============================================================
   JSON Viewer Component
============================================================ */

const JsonViewer = ({ data, title, collapsible = true }: { 
  data: any, 
  title?: string,
  collapsible?: boolean 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  const formatJson = (obj: any): string => {
    if (!obj) return "null"
    if (typeof obj === "string") return `"${obj}"`
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj)
    if (Array.isArray(obj)) return `[${obj.length} items]`
    if (obj && typeof obj === "object") return `{${Object.keys(obj).length} keys}`
    return String(obj)
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-ui-bg-subtle">
      {(title || collapsible) && (
        <div className="flex items-center justify-between p-3 border-b bg-ui-bg-base">
          {title && (
            <Heading level="h4" className="text-sm font-medium">
              {title}
            </Heading>
          )}
          <div className="flex items-center gap-2">
            <Tooltip content={copied ? "Copied!" : "Copy JSON"}>
              <IconButton
                size="small"
                variant="transparent"
                onClick={copyToClipboard}
              >
                <FilePlus className="h-4 w-4" />
              </IconButton>
            </Tooltip>
            {collapsible && (
              <Tooltip content={isCollapsed ? "Expand" : "Collapse"}>
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUpMini className="h-4 w-4" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      )}
      {!isCollapsed && (
        <div className="p-3 max-h-[400px] overflow-auto">
          <CodeBlock
            snippets={[{
              label: "json",
              language: "json",
              code: JSON.stringify(data, null, 2),
            }]}
          >
            <CodeBlock.Body />
          </CodeBlock>
        </div>
      )}
      {isCollapsed && data && (
        <div className="p-3 bg-ui-bg-base border-t">
          <Text size="small" className="text-ui-fg-subtle font-mono">
            {formatJson(data)}
          </Text>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Drawer
============================================================ */

export const ExecuteActionDrawer = ({
  action,
  children,
  isOpen,
  onOpenChange,
}: ExecuteActionDrawerProps) => {
  const [open, setOpen] = useState(isOpen ?? false)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [lastParams, setLastParams] = useState<any>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [activeTab, setActiveTab] = useState("execute")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const resultTabRef = useRef<HTMLDivElement>(null)

  // Initialize form with default values for action parameters
  const defaultValues = React.useMemo(() => {
    const values: Record<string, any> = {}
    
    // Set default values for action parameters
    action.parameters?.forEach((param) => {
      if (param.default !== undefined) {
        values[param.name] = param.default
      } else if (param.type === "boolean") {
        values[param.name] = false
      } else if (param.type === "array") {
        values[param.name] = []
      } else if (param.type === "json") {
        values[param.name] = ""
      }
    })
    
    return values
  }, [action.parameters])

  const form = useForm<Record<string, any> & AdvancedParameters>({
    defaultValues,
  })

  /* ============================================================
     Hooks
  ============================================================ */

  const { mutateAsync: executeAction, isPending } = useExecuteAction(action.id) as any;
  const { data: history = [], refetch: refetchHistory } = useActionExecutionHistory(action.id)
  // const { data: logEvents } = useActionExecutionLogs(executionId)

  /* ============================================================
     Live Logs
  ============================================================ */

  // useEffect(() => {
  //   if (logEvents?.length) {
  //     setLogs((prev) => [...prev, ...logEvents])
  //   }
  // }, [logEvents])

  /* ============================================================
     Handle Open State
  ============================================================ */

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen)
    }
  }, [isOpen])

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(open)
    }
  }, [open, onOpenChange])

  /* ============================================================
     Scroll to Result Tab After Execution
  ============================================================ */

  useEffect(() => {
    if (activeTab === "result" && resultTabRef.current) {
      resultTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeTab])

  /* ============================================================
     Execution
  ============================================================ */

  const runAction = useCallback(async (values: Record<string, any>) => {
    setIsExecuting(true)
    try {
      setLogs([])
      setExecutionResult(null)

      const parsed = { ...values };
      const sessionId = localStorage.getItem('session_id');
      let params = action.parameters ?? [] as any;
      // // Parse JSON fields
      // params?.forEach((p) => {
      //   if(p.defaultValue && !parsed[p.name].trim()){
      //           parsed[p.name] = p.defaultValue;           
      //   }

      //   if ((p.type === "json" || p.type === 'array') && typeof parsed[p.name] === "string" && parsed[p.name].trim()) {
      //     try {
      //       parsed[p.name] = JSON.parse(parsed[p.name])
      //     } catch (e) {
      //       throw new Error(`Invalid JSON in ${p.name}: ${e}`)
      //     }
      //   }
      // })
      
      


      
      setLastParams(parsed)
      let newLogs = [];


      const res = await executeAction({
        parameters: parsed,
        sessionId,
        headers: values.headers,
        context: values.context,
        timeout: values.timeout,
      }) as any
      setExecutionId(res.executionId)
      
      
      setExecutionResult({
        status: res.status || res.data.status,
        status_code: res.status_code,
        data: res.data,
        error: res.error,
        execution_time: res.execution_time,
        headers: res.headers,
      })

      if(res?.sessionId){
          localStorage.setItem('session_id', res.sessionId);
      }

      if(res?.outputs){
          newLogs = Object.entries(res.outputs).map(([key, value]) => {
            return {data: value, action: key}
          }) as any
          setLogs(newLogs)
      }
      
      
      refetchHistory()
      
      // Auto-navigate to result tab
      setActiveTab("result")
      toast.success("Execution completed successfully")
    } catch (e: any) {
      console.error("Execution error:", e)
      setExecutionResult({
        status: "error",
        status_code: e?.status_code,
        error: e?.message || e,
      })
      
      // Auto-navigate to result tab even on error
      setActiveTab("result")
      toast.error(e?.message ?? "Execution failed")
    } finally {
      setIsExecuting(false)
    }
  }, [action.id, action.parameters, executeAction, refetchHistory])

  /* ============================================================
     Replay & Close
  ============================================================ */

  const replay = useCallback((params: any, context = {}, headers = {}) => {
    form.reset({
      ...params,
      headers: headers,
      context: context,
      timeout: 30000,
    })
    // Navigate back to execute tab when replaying
    setActiveTab("execute")
    // Then run the action which will auto-navigate to result
    // setTimeout(() => {
    //   runAction(params)
    // }, 100)
  }, [form, runAction])

  const closeDrawer = useCallback((value: boolean) => {
    setOpen(value)
    if (!value) {
      form.reset(defaultValues)
      setLogs([])
      setExecutionResult({})
      setExecutionId(null)
      setActiveTab("execute")
      setShowAdvanced(false)
    }
  }, [form, defaultValues])

  /* ============================================================
     Handle Enter Key
  ============================================================ */

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault()
      form.handleSubmit(runAction)()
    }
  }, [form, runAction])

  /* ============================================================
     Handle Child Click
  ============================================================ */

  const handleChildClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(true)
  }, [])

  /* ============================================================
     Render
  ============================================================ */






  return (
    <>
      <div onClick={handleChildClick} className="inline-block">
        {children}
      </div>

      <Drawer open={open} onOpenChange={closeDrawer}>
        <Drawer.Content 
          className="max-w-4xl mx-auto h-[calc(100vh-80px)]" 
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Drawer.Header className="sticky top-0 z-10 bg-ui-bg-base border-b">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <PlaySolid className="text-ui-fg-interactive" />
                <Drawer.Title className="text-lg font-semibold">
                  Execute Action: {action.name}
                </Drawer.Title>
              </div>
              {action.description && (
                <Drawer.Description className="text-ui-fg-subtle text-sm">
                  {action.description}
                </Drawer.Description>
              )}
            </div>
          </Drawer.Header>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Tabs.List className="border-b px-6 shrink-0">
              <Tabs.Trigger value="execute">Execute</Tabs.Trigger>
              <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
              <Tabs.Trigger value="result">Result</Tabs.Trigger>
              <Tabs.Trigger value="history">History</Tabs.Trigger>
            </Tabs.List>

            {/* ================= EXECUTE TAB ================= */}
<Tabs.Content value="execute" className="flex-1 overflow-hidden p-0">
  <FormProvider {...form}>
    <form onSubmit={form.handleSubmit(runAction)} className="h-full flex flex-col">
      <Drawer.Body className="flex-1 overflow-y-auto p-6">
        {/* Basic Parameters */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
              Parameters
            </Heading>
            <Badge color="blue" size="small">
              {action.parameters?.length || 0} parameters
            </Badge>
          </div>
          
          {action.parameters && action.parameters.length > 0 ? (
            <div className="flex flex-col gap-6">
              {action.parameters.map((p) => (
                <ParameterField key={p.name} param={p} />
              ))}
            </div>
          ) : (
            <Alert variant="info" className="mb-4">
              This action has no parameters defined.
            </Alert>
          )}
        </div>

        {/* Advanced Parameters (Collapsible) */}
        <div className="border-t pt-6 mt-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-3 hover:bg-ui-bg-subtle rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <CogSixTooth className="text-ui-fg-muted" />
              <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
                Advanced Parameters
              </Heading>
            </div>
            {showAdvanced ? (
              <ChevronUpMini className="text-ui-fg-muted" />
            ) : (
              <ChevronDown className="text-ui-fg-muted" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-6 animate-in fade-in">
              {/* Headers with JSON validation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Custom Headers</Label>
                  <Badge color="green" size="small">
                    JSON Object
                  </Badge>
                </div>
                <Controller
                  name="headers"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Textarea
                        rows={4}
                        placeholder={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer token",
  "X-Custom-Header": "value"
}`}
                        value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value || ''}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          if (!rawValue.trim()) {
                            field.onChange({});
                            return;
                          }
                          // Keep raw string value in field, validation will handle parsing
                          field.onChange(rawValue);
                        }}
                        onBlur={() => {
                          try {
                            const value = field.value;
                            if (typeof value === 'string' && value.trim()) {
                              const parsed = JSON.parse(value);
                              field.onChange(parsed);
                            }
                          } catch (e) {
                            // Keep as string to show error
                          }
                        }}
                        className={`font-mono text-sm min-h-[120px] ${
                          fieldState.error ? 'border-ui-border-error' : ''
                        }`}
                      />
                      {fieldState.error && (
                        <Text size="small" className="text-ui-fg-error">
                          {fieldState.error.message}
                        </Text>
                      )}
                      <Text size="small" className="text-ui-fg-subtle">
                        Enter headers as a valid JSON object. Use the "Try Example" button below for common formats.
                      </Text>
                      
                      {/* Example templates */}
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => field.onChange({
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                          })}
                        >
                          REST API Headers
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => field.onChange({
                            "Authorization": "Bearer ${token}",
                            "X-API-Key": "your-api-key"
                          })}
                        >
                          Auth Headers
                        </Button>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Context with JSON validation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Execution Context</Label>
                  <Badge color="green" size="small">
                    JSON Object
                  </Badge>
                </div>
                <Controller
                  name="context"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Textarea
                        rows={4}
                        placeholder={`{
  "environment": "production",
  "user": {
    "id": "usr_123",
    "role": "admin"
  },
  "metadata": {}
}`}
                        value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value || ''}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          if (!rawValue.trim()) {
                            field.onChange({});
                            return;
                          }
                          field.onChange(rawValue);
                        }}
                        onBlur={() => {
                          try {
                            const value = field.value;
                            if (typeof value === 'string' && value.trim()) {
                              const parsed = JSON.parse(value);
                              field.onChange(parsed);
                            }
                          } catch (e) {
                            // Keep as string to show error
                          }
                        }}
                        className={`font-mono text-sm min-h-[120px] ${
                          fieldState.error ? 'border-ui-border-error' : ''
                        }`}
                      />
                      {fieldState.error && (
                        <Text size="small" className="text-ui-fg-error">
                          {fieldState.error.message}
                        </Text>
                      )}
                      <Text size="small" className="text-ui-fg-subtle">
                        Context data available during action execution. Must be a valid JSON object.
                      </Text>
                    </div>
                  )}
                />
              </div>

              {/* Timeout with validation */}
              {/* <div className="space-y-4">
                <Label>Timeout (milliseconds)</Label>
                <Controller
                  name="timeout"
                  control={form.control}
                  defaultValue={30000}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="1000"
                        max="300000"
                        step="1000"
                        value={field.value || 30000}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30000)}
                        className={fieldState.error ? 'border-ui-border-error' : ''}
                      />
                      {fieldState.error && (
                        <Text size="small" className="text-ui-fg-error">
                          {fieldState.error.message}
                        </Text>
                      )}
                      <Text size="small" className="text-ui-fg-subtle">
                        Maximum execution time in milliseconds (1000-300000). Default: 30 seconds.
                      </Text>
                    </div>
                  )}
                />
              </div> */}
            </div>
          )}
        </div>
      </Drawer.Body>

      <Drawer.Footer className="shrink-0 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-ui-fg-subtle">
            Press <kbd className="px-2 py-1 bg-ui-bg-base border rounded text-xs">⌘/Ctrl + Enter</kbd> to execute
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                form.reset();
                closeDrawer(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={isPending || isExecuting}
              disabled={isPending || isExecuting}
              className="gap-2"
            >
              {isPending || isExecuting ? (
                <>
                  <ReplaySolid className="animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <PlaySolid />
                  Execute Action
                </>
              )}
            </Button>
          </div>
        </div>
      </Drawer.Footer>
    </form>
  </FormProvider>
</Tabs.Content>
            {/* ================= LOGS TAB ================= */}
            <Tabs.Content value="logs" className="flex-1 overflow-hidden p-0">
              <Drawer.Body className="flex-1 flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
                    Execution Logs
                  </Heading>
                  <div className="flex items-center gap-2">
                    {logs.length > 0 && (
                      <Badge size="small" color="grey">
                        {logs.length} entries
                      </Badge>
                    )}
                    {executionId && (
                      <Badge size="small" color="blue">
                        ID: {executionId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="bg-ui-bg-subtle rounded-lg overflow-hidden border flex-1 flex flex-col">
                  <div className="p-4 bg-ui-bg-base border-b">
                    <div className="flex items-center justify-between">
                      <Label>Live Log Stream</Label>
                      {isPending || isExecuting ? (
                        <Badge size="small" color="orange" className="animate-pulse">
                          <ReplaySolid className="h-3 w-3 animate-spin mr-1" />
                          Streaming...
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto bg-ui-bg-base p-4 max-h-[400px]">
                    {logs.length > 0 ? (
                      <div className="space-y-2 font-mono text-sm">
                        {logs.map((log, i) => (
                          <div
                            key={i}
                            className={clx(
                              "p-3 rounded border",
                              log.level === "error" && "bg-red-50 border-red-200",
                              log.level === "warn" && "bg-orange-50 border-orange-200",
                              log.level === "info" && "bg-blue-50 border-blue-200"
                            )}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                           
                                <span className="text-xs text-ui-fg-subtle">
                                  {log.action}
                                </span>
                              </div>
                            </div>
                            <div className="text-ui-fg-base whitespace-pre-wrap break-words">
                              {log.message}
                            </div>
                            {log.data && (
                              <details className="mt-2">
                                <summary className="text-xs text-ui-fg-muted cursor-pointer hover:text-ui-fg-base">
                                  Show data
                                </summary>
                                <pre className="mt-1 p-2 bg-ui-bg-subtle rounded text-xs overflow-auto">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-ui-fg-subtle">
                        <Code className="h-12 w-12 mb-4 opacity-20" />
                        <Text>No logs available</Text>
                        <Text size="small">Execute the action to see logs here</Text>
                      </div>
                    )}
                  </div>
                </div>
              </Drawer.Body>

              <Drawer.Footer className="shrink-0 border-t">
                <div className="flex items-center justify-between w-full">
                  <Text size="small" className="text-ui-fg-subtle">
                    {executionResult?.status && `Last execution: ${executionResult.status.toUpperCase()}`}
                  </Text>
                  {lastParams && (
                    <Button
                      onClick={() => replay(lastParams)}
                      className="gap-2"
                    >
                      <ReplaySolid />
                      Retry Execution
                    </Button>
                  )}
                </div>
              </Drawer.Footer>
            </Tabs.Content>

            {/* ================= RESULT TAB ================= */}
            <Tabs.Content value="result" className="flex-1 overflow-hidden p-0">
              <div ref={resultTabRef} className="h-full flex flex-col">
                <Drawer.Body className="flex-1 overflow-y-auto p-6">
                  {!executionResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-ui-fg-subtle">
                      <PlaySolid className="h-12 w-12 mb-4 opacity-20" />
                      <Text>No execution result yet</Text>
                      <Text size="small">Execute the action to see results here</Text>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Status Header */}
                      <div className="border rounded-lg p-4 bg-ui-bg-base">
                        <div className="flex items-center justify-between mb-3">
                          <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
                            Execution Summary
                          </Heading>
                          <div className="flex items-center gap-2">
                            <Badge
                              color={
                                executionResult.status === "success"
                                  ? "green"
                                  : executionResult.status === "error"
                                  ? "red"
                                  : "orange"
                              }
                              className="gap-2"
                            >
                              {executionResult.status === "success" ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : executionResult.status === "error" ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <InformationCircle className="h-3 w-3" />
                              )}
                              {executionResult.status?.toUpperCase()}
                            </Badge>
                            {executionResult.status_code && (
                              <Badge color="blue">
                                HTTP {executionResult.status_code}
                              </Badge>
                            )}
                            {executionResult.execution_time && (
                              <Badge color="grey" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {executionResult.execution_time}ms
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Error Message */}
                        {executionResult.error && (
                          <Alert variant="error" className="mb-4">
                            <InformationCircle />
                            <Alert.Title>Execution Error</Alert.Title>
                            <Alert.Description className="font-mono text-sm">
                              {typeof executionResult.error === "string" 
                                ? executionResult.error
                                : JSON.stringify(executionResult.error, null, 2)}
                            </Alert.Description>
                          </Alert>
                        )}
                      </div>

                      {/* Response Data */}
                      {executionResult?.data && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
                              Response Data
                            </Heading>
                          </div>
                          <JsonViewer 
                            data={executionResult?.data || executionResult || {}} 
                            title="Response"
                            collapsible={true}
                          />
                        </div>
                      )}

                      {/* Headers */}
                      {executionResult?.headers && Object.keys(executionResult?.headers).length > 0 && (
                        <div className="space-y-4">
                          <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
                            Response Headers
                          </Heading>
                          <JsonViewer 
                            data={executionResult?.headers} 
                            title="Headers"
                            collapsible={true}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Drawer.Body>

                <Drawer.Footer className="shrink-0 border-t">
                  {lastParams && (
                    <div className="flex items-center justify-between w-full">
                      <Text size="small" className="text-ui-fg-subtle">
                        Executed at: {executionResult && new Date().toLocaleTimeString()}
                      </Text>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => replay(lastParams)}
                          className="gap-2"
                        >
                          <ReplaySolid />
                          Retry Execution
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setActiveTab("execute")}
                        >
                          Edit Parameters
                        </Button>
                      </div>
                    </div>
                  )}
                </Drawer.Footer>
              </div>
            </Tabs.Content>

          {/* ================= HISTORY TAB ================= */}
<Tabs.Content value="history" className="flex-1 overflow-hidden p-0">
  <Drawer.Body className="flex-1 overflow-y-auto p-6 max-h-[700px]">
    <div className="flex items-center justify-between mb-4">
      <Heading level="h3" className="text-ui-fg-base text-sm font-semibold">
        Execution History
      </Heading>
      <Badge size="small" color="grey">
        {history.length} executions
      </Badge>
    </div>

    {history.length > 0 ? (
      <div className="space-y-3">
        {history.slice(0, 20).map((execution) => (
          <div
            key={execution.id}
            className="border rounded-lg p-4 hover:bg-ui-bg-subtle transition-all cursor-pointer group"
  
          >
            {/* Header with Status and Timestamps */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge
                  color={
                    execution.status === "completed" || execution.status === "success"
                      ? "green"
                      : execution.status === "error" || execution.status === "failed"
                      ? "red"
                      : execution.status === "running" || execution.status === "pending"
                      ? "orange"
                      : "grey"
                  }
                  className="capitalize"
                >
                  {execution.status}
                </Badge>
                <div className="flex items-center gap-2 text-xs text-ui-fg-subtle">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(execution.started_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {execution.duration_ms && (
                  <Badge size="small" variant="solid" color="grey">
                    {execution.duration_ms}ms
                  </Badge>
                )}
                <IconButton 
                  size="small" 
                  variant="transparent"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
              // When clicking history item, show those params in execute tab
              replay(execution?.input_data)
            }}
                >
                  <PlaySolid className="h-3 w-3" />
                </IconButton>
              </div>
            </div>

            {/* Input/Output Summary */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Input Summary */}
              <div className="text-xs">
                <div className="flex items-center gap-1 text-ui-fg-subtle mb-1">
                  <ArrowUp className="h-3 w-3" />
                  <span>Input</span>
                </div>
                <div className="font-mono bg-ui-bg-base p-2 rounded border overflow-hidden">
                  <div className="truncate text-ui-fg-muted">
                    {(execution.input_data && Object.entries(execution.input_data).length) ? (
                      Object.entries(execution.input_data)
                        .map(([key, value]) => (
                          <span key={key}>
                            <span className="text-ui-fg-base">{key}:</span>{' '}
                            {typeof value === 'string' 
                              ? value.length > 30 
                                ? value.substring(0, 30) + '...' 
                                : value
                              : JSON.stringify(value).substring(0, 30) + '...'
                            }{' '}
                          </span>
                        ))
                        .reduce((prev, curr) => [prev, ' | ', curr])
                    ) : (
                      <span className="text-ui-fg-muted">No input data</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Output Summary */}
              <div className="text-xs">
                <div className="flex items-center gap-1 text-ui-fg-subtle mb-1">
                  <ArrowDown className="h-3 w-3" />
                  <span>Output</span>
                </div>
                <div className="font-mono bg-ui-bg-base p-2 rounded border overflow-hidden">
                  <div className="truncate text-ui-fg-muted">
                    {execution.output_data ? (
                      execution.output_data.success !== undefined ? (
                        <span>
                          <Badge 
                            size="small" 
                            color={execution.output_data.success ? "green" : "red"}
                            className="mr-2"
                          >
                            {execution.output_data.success ? 'Success' : 'Failed'}
                          </Badge>
                          {execution.output_data.status_code && (
                            <span>Status: {execution.output_data.status_code}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-ui-fg-muted">Output available</span>
                      )
                    ) : (
                      <span className="text-ui-fg-muted">No output data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Details */}
            <div className="flex flex-wrap gap-2 text-xs border-t pt-3">
              {/* Execution ID */}
              <div className="flex items-center gap-1">
                <Badge size="small" color="grey" variant="dot" />
                <span className="text-ui-fg-subtle">ID:</span>
                <span className="font-mono text-ui-fg-base">
                  {execution.id.substring(0, 8)}...
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-1">
                <Badge size="small" color="grey" variant="dot" />
                <span className="text-ui-fg-subtle">Duration:</span>
                <span className="font-mono text-ui-fg-base">
                  {execution.duration_ms 
                    ? execution.duration_ms < 1000 
                      ? `${execution.duration_ms}ms`
                      : `${(execution.duration_ms / 1000).toFixed(2)}s`
                    : 'N/A'
                  }
                </span>
              </div>

              {/* Completed Actions (if available) */}
              {execution.output_data?.completedActions && (
                <div className="flex items-center gap-1">
                  <Badge size="small" color="grey" variant="dot" />
                  <span className="text-ui-fg-subtle">Actions:</span>
                  <span className="font-mono text-ui-fg-base">
                    {execution.output_data.completedActions}
                  </span>
                </div>
              )}

              {/* Template Info (if available) */}
              {execution.metadata?.templateName && (
                <div className="flex items-center gap-1">
                  <Badge size="small" color="grey" variant="dot" />
                  <span className="text-ui-fg-subtle">Template:</span>
                  <span className="text-ui-fg-base">
                    {execution.metadata.templateName}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message (if any) */}
            {execution.error_message && (
              <div className="mt-3 text-xs bg-ui-bg-base p-2 rounded border border-ui-border-error">
                <div className="flex items-start gap-2">
                  <Badge size="small" color="red" className="mt-0.5">
                    Error
                  </Badge>
                  <span className="text-ui-fg-error font-mono">
                    {execution.error_message}
                  </span>
                </div>
              </div>
            )}

            {/* Expandable Details Section (optional - can be toggled) */}
            <details className="mt-3 text-xs">
              <summary className="text-ui-fg-subtle cursor-pointer hover:text-ui-fg-base">
                View full details
              </summary>
              <div className="mt-2 space-y-3">
                {/* Full Input Data */}
                {execution.input_data && (
                  <div>
                    <div className="text-ui-fg-subtle mb-1">Input Data:</div>
                    <pre className="font-mono text-xs bg-ui-bg-base p-2 rounded border overflow-x-auto">
                      {JSON.stringify(execution.input_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Full Output Data */}
                {execution.output_data && (
                  <div>
                    <div className="text-ui-fg-subtle mb-1">Output Data:</div>
                    <pre className="font-mono text-xs bg-ui-bg-base p-2 rounded border overflow-x-auto">
                      {JSON.stringify(execution.output_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                {execution.metadata && (
                  <div>
                    <div className="text-ui-fg-subtle mb-1">Metadata:</div>
                    <pre className="font-mono text-xs bg-ui-bg-base p-2 rounded border overflow-x-auto">
                      {JSON.stringify(execution.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        ))}
      </div>
    ) : (
      <div className="h-full flex flex-col items-center justify-center text-ui-fg-subtle py-12">
        <Clock className="h-12 w-12 mb-4 opacity-20" />
        <Text>No execution history</Text>
        <Text size="small">Execute the action to see history here</Text>
      </div>
    )}
  </Drawer.Body>
</Tabs.Content>
          </Tabs>
        </Drawer.Content>
      </Drawer>
    </>
  )
}