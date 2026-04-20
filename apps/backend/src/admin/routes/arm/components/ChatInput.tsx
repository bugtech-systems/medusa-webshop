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
  Switch,
} from "@medusajs/ui";
import { ChatBubble, DocumentText, SettingsIcon, Sparkles } from "../../../components";
import { ChatSessionConfigDrawer } from "./chat-config-drawer";

interface Props {
  conversationId?: string
  onSend?: (content: string, model?: string) => void
}



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

export default function ChatInput({ isPending, onSend, config, setConfig, showSystem, setShowSystem }: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [content, setContent] = useState("")
  const { data: modelsData, refetch: fetchBaseModels } = useExecution('get-db-models') as any;


  const handleSend = async () => {
    if (!content.trim()) return

    try {
      if (onSend) onSend(content.trim(), config)

      // Clear input locally
      setContent("")



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



  const handleSave = (data) => {
    console.log(data, 'SAAAVEED')
    setDrawerOpen(false)
  }

  useEffect(() => {
    fetchBaseModels();
  }, [])


  let serviceModels = modelsData?.data || [];

  let model = serviceModels.find((m) => m.id === config.model_id)

  console.log(modelsData, model, serviceModels, config, "CONFF ")


  return (
    <>



      <div className="w-full rounded-2xl border bg-white shadow-md px-4 py-3">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Alayon AI Assistant"
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
            <div
              className="d-flex pt-1 rounded-full hover:bg-neutral-100"

            >
              <Switch
                checked={showSystem}
                onCheckedChange={(checked) => setShowSystem(checked)}
              />
            </div>
            <div className="d-flex flex-col ml-3 pt-1 rounded-full hover:bg-neutral-100">
              <Text size="large" className="text-neutral-500">Model:  {model?.name || "Select a model"}</Text>
            </div>
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
      <ChatSessionConfigDrawer config={config} setConfig={setConfig} open={drawerOpen} onOpenChange={setDrawerOpen} onSave={handleSave} />

    </>
  )
}