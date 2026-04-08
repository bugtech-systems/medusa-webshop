"use client"

import { useState, KeyboardEvent, useEffect, useRef } from "react"
import { ArrowUp, Paperclip, Settings } from "lucide-react"
import { useExecuteAction, useExecution } from "../../../hooks/api/actions"
import {
  Input,
  Button,
  Label,
  Text,
  Select,
  IconButton,
  Drawer,
  Tabs,
  Badge,
  Textarea,
} from "@medusajs/ui";
import { ChatBubble, DocumentText, SettingsIcon, Sparkles } from "../../../components";

interface Props {
  conversationId?: string
  onSend?: (content: string, model?: string) => void
}

const defaultParameters: any = {
  temperature: 0.7,
  // num_predict: 2000,
  top_p: 1.0,
  top_k: 40,
  // min_p: 0.0,
  repeat_penalty: 1.0,
  num_ctx: 2048,
}

const serviceModels = [
  {
    id: "laundry",
    name: "✦ Laundry",
    model: "alayon-laundry-assistant",
    content: "Help me with laundry services"
  },
  {
    id: "lpg",
    name: "✦ Gas (LPG)",
    model: "alayon-gas-assistant",
    content: "Help me with LPG gas delivery"
  },
  {
    id: "mineral",
    name: "✦ Mineral Water",
    model: "alayon-water-assistant",
    content: "Help me order mineral water"
  }
]


// Custom Range Slider Component
const RangeSlider = ({ 
  value, 
  onValueChange, 
  min, 
  max, 
  step 
}: { 
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)])
  }

  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-2 bg-ui-bg-subtle rounded-lg appearance-none cursor-pointer accent-ui-bg-interactive"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-ui-fg-subtle">{min}</span>
        <span className="text-xs text-ui-fg-subtle">{max}</span>
      </div>
    </div>
  )
}

// JSON Editor Component
const JSONEditor = ({ 
  data, 
  onChange 
}: { 
  data: any, 
  onChange?: (data: any) => void 
}) => {
  const [jsonString, setJsonString] = useState(JSON.stringify(data, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setJsonString(JSON.stringify(data, null, 2))
  }, [data])

  const handleChange = (value: string) => {
    setJsonString(value)
    try {
      const parsed = JSON.parse(value)
      setError(null)
      onChange?.(parsed)
    } catch (e) {
      setError('Invalid JSON')
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        className="font-mono text-sm min-h-[300px] max-h-[400px]"
        placeholder="Enter JSON configuration..."
      />
      {error && (
        <p className="text-ui-fg-error text-sm">{error}</p>
      )}
    </div>
  )
}

export default function ChatInput({ isPending, onSend, config, setConfig, setParameters, setContext }: any) {
    const { data: baseModelsData, refetch: fetchBaseModels } = useExecution('get-local-ollama-models') as any;
    const { data: actionRelations, mutateAsync: fetchActionRelations } = useExecuteAction('get-relation-workflows')
  const [activeTab, setActiveTab] = useState<'config' | 'context' | 'parameters'>('config')
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [content, setContent] = useState("")
  const [actions, setActions] = useState<any>([])
  const [service, setService] = useState<string | null>(null)
    const parametersContainerRef = useRef<HTMLDivElement>(null)
  const parameters = config.paarameters || defaultParameters;
  const context = config.context;


  const handleSend = async () => {
    if (!content.trim()) return

    try {
      if (onSend) onSend(content.trim(), config.model)

      // Clear input locally
      setContent("")
      setService(null)

     

      // if (res?.context?.conversation_id && !conversationId) {
      //   window.location.href = `/app/arm/relations/${res.context.conversation_id}`
      // }
    } catch (error) {
      console.error("Chat send failed:", error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleService = (model: typeof serviceModels[0]) => {
    if (model.id !== service) {
      setContent(model.content)
      setService(model.id)
    } else {
      setContent("")
      setService(null)
    }
  }

  const handleSessionId = (e) => {
      setConfig({...config, session_id: e.target.value})
  }

  const handleActionRelations = async () => {
     let {data: actionsData } =  await fetchActionRelations({parameters: { id: {"$notnull": true} }}) as any;
          setActions(actionsData)
      }


      
const handleSession = async (id) => {
let conf = localStorage.getItem("config") as any;

    const res = await fetch(`/actions/session/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    })

    const json = await res.json()

    console.log(json, 'SESSSION JSON')
      setConfig({...config, ...(conf ? JSON.parse(conf) : {}), session_id: id});
}



  useEffect(() => {
    let session_id = localStorage.getItem("session_id") as any;

      handleSession(session_id)
      fetchBaseModels();
      handleActionRelations()
  }, [fetchActionRelations, fetchBaseModels])





  
    const handleUpdateContext = (updates: Partial<any>) => {
    const newContext = { ...context, ...updates }
    setContext(newContext)
  }

  const handleUpdateParameters = (updates: Partial<any>) => {
    const newParameters = { ...parameters, ...updates }
    setParameters(newParameters)
  }

  

  return (
    <>
    
    
    
    <div className="w-full rounded-2xl border bg-white shadow-md px-4 py-3">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message PSA AI Assistant"
        disabled={isPending}
        className="w-full bg-transparent outline-none text-sm placeholder:text-neutral-400 disabled:opacity-50"
      />

      {/* Quick service/model selector (optional) */}
      {/* <div className="flex gap-2 mt-3 flex-wrap">
        {serviceModels.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleService(m)}
            className={`px-3 py-1 rounded-full text-xs border flex items-center gap-1 ${
              service === m.id
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-neutral-50 text-neutral-800 border-neutral-200"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div> */}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-neutral-100"
            disabled={isPending}
          >
            <Paperclip size={16} />
          </button>
                    <button
            type="button"
            className="p-2 rounded-full hover:bg-neutral-100"
            onClick={() => setDrawerOpen(true)}
            disabled={isPending}
          >
            <Settings size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !content.trim()}
          className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Drawer.Content>
            <Drawer.Header>
              <h2 className="text-lg font-semibold">Chat Session Config</h2>
            </Drawer.Header>

                   <Tabs
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'config' | 'context' | 'parameters')}
        >
          <div className="border-b border-ui-border-base px-6">
            <Tabs.List>
              <Tabs.Trigger value="config">
                <Sparkles />
                Config
              </Tabs.Trigger>
              <Tabs.Trigger value="context">
                <DocumentText />
                Context
              </Tabs.Trigger>
              <Tabs.Trigger value="parameters">
                <SettingsIcon />
                Parameters
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <div className="p-6">
                        <Tabs.Content value="config">

                         <div>
                <Label htmlFor="session-id">Session ID</Label>
                <Input
                  id="session-id"
                  placeholder="Enter session ID"
                  value={config.session_id || ""}
                  onChange={(e) => handleSessionId(e)}
                />
              </div>

              <div>
                <Label htmlFor="ai-model">AI Model</Label>
                <Select
                  value={config.model}
                  onValueChange={(value) => {
                    setConfig({...config, model: value});

                  }}
                >
                     <Select.Trigger>
                                    <Select.Value placeholder="Select status" />
                                  </Select.Trigger>
                          <Select.Content>
                                  
                  {baseModelsData?.models ? baseModelsData?.models?.map((m: any, i) => (
                    <Select.Item key={i} value={String(m.name).split(":")[0]}>
                      {m.name}
                    </Select.Item>
                  )) : <></>}
                  </Select.Content>
                </Select>
              </div> 
               <div>
                <Label htmlFor="action">Action Relation</Label>
                <Select
                  value={config.action}
                  onValueChange={(value) => {
                    setConfig({...config, action: value});

                  }}
                >
                     <Select.Trigger>
                                    <Select.Value placeholder="Select action relation" />
                                  </Select.Trigger>
                          <Select.Content>
                                  
                  {actions ? actions?.map((m: any, i) => (
                    <Select.Item key={i} value={m.id}>
                      {m.label}
                    </Select.Item>
                  )) : <></>}
                  </Select.Content>
                </Select>
              </div> 
                 <div>
                <Label htmlFor="session-id">Chat URL</Label>
                <Input
                  id="session-id"
                  placeholder="Enter Chat Url"
                  value={config.chat_url || ""}
                  onChange={(e) => setConfig({...config, chat_url: e.target.value})}
                />
              </div>
                          </Tabs.Content>

            {/* Context Tab */}
            <Tabs.Content value="context">
              <div className="flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
      

                  <div className="bg-ui-bg-subtle rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">Full Context (JSON)</h3>
                      <Badge color="blue" size="small">
                        Editable
                      </Badge>
                    </div>
                    <JSONEditor
                      data={context}
                      onChange={(newData) => {
                        setContext(newData)
                      }}
                    />
                  </div>
                </div>
              </div>
            </Tabs.Content>

            {/* Parameters Tab - Fixed Overflow */}
            <Tabs.Content value="parameters">
              <div className="flex flex-col h-[600px]">
                <div 
                  ref={parametersContainerRef}
                  className="flex-1 overflow-y-auto pr-2 space-y-6"
                >
                  <div className="bg-ui-bg-subtle rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2 sticky top-0 bg-ui-bg-subtle py-2">
                      <SettingsIcon />
                      Model Parameters
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Model Selection */}


                      {/* Temperature */}
                      <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between">
                          <Label>Temperature</Label>
                          <Badge size="small" color="grey">
                            {Number(parameters.temperature).toFixed(2)}
                          </Badge>
                        </div>
                        <RangeSlider
                          value={[parameters.temperature]}
                          onValueChange={(value) => handleUpdateParameters({ temperature: value[0] })}
                          min={0}
                          max={2}
                          step={0.01}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Controls randomness: lower values are more deterministic, higher values more creative.
                        </p>
                      </div>

                      {/* Top P */}
                      <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between">
                          <Label>Top P</Label>
                          <Badge size="small" color="grey">
                            {parameters.top_p.toFixed(2)}
                          </Badge>
                        </div>
                        <RangeSlider
                          value={[parameters.top_p]}
                          onValueChange={(value) => handleUpdateParameters({ top_p: value[0] })}
                          min={0}
                          max={1}
                          step={0.01}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Nucleus sampling: considers tokens with top_p probability mass.
                        </p>
                      </div>

                      {/* Top K */}
                      <div className="space-y-2 pb-2">
                        <Label>Top K</Label>
                        <Input
                          type="number"
                          value={parameters.top_k}
                          onChange={(e) => handleUpdateParameters({ top_k: parseInt(e.target.value) || 40 })}
                          min={1}
                          max={100}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Limits token selection to top K most likely tokens.
                        </p>
                      </div>

                      {/* Min P */}
                      <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between">
                          <Label>Min P</Label>
                          <Badge size="small" color="grey">
                            {Number(parameters.min_p).toFixed(2)}
                          </Badge>
                        </div>
                        <RangeSlider
                          value={[parameters.min_p]}
                          onValueChange={(value) => handleUpdateParameters({ min_p: value[0] })}
                          min={0}
                          max={1}
                          step={0.01}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Minimum probability for token consideration.
                        </p>
                      </div>

                   
                      {/* Num Predict / Max Tokens */}
                      <div className="space-y-2 pb-2">
                        <Label>Max Tokens (num_predict)</Label>
                        <Input
                          type="number"
                          value={parameters.num_predict}
                          onChange={(e) => handleUpdateParameters({ num_predict: parseInt(e.target.value) || 2000 })}
                          min={1}
                          max={32000}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Maximum number of tokens to generate.
                        </p>
                      </div>

                      {/* Context Window */}
                      <div className="space-y-2 pb-2">
                        <Label>Context Window (num_ctx)</Label>
                        <Input
                          type="number"
                          value={parameters.num_ctx}
                          onChange={(e) => handleUpdateParameters({ num_ctx: parseInt(e.target.value) || 2048 })}
                          min={512}
                          max={128000}
                        />
                        <p className="text-xs text-ui-fg-subtle">
                          Size of the context window in tokens.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pb-4">
                    <Button
                      variant="secondary"
                      onClick={() => handleUpdateParameters(defaultParameters)}
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab('config')}
                    >
                      Start Testing
                    </Button>
                  </div>
                </div>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>


           

            <Drawer.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
    </>
  )
}