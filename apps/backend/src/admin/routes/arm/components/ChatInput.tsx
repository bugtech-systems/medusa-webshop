"use client"

import { useState, KeyboardEvent, useEffect } from "react"
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
} from "@medusajs/ui";

interface Props {
  conversationId?: string
  onSend?: (content: string, model?: string) => void
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

export default function ChatInput({ isPending, onSend, sessionId, setSessionId }: any) {
    const { data: baseModelsData, refetch: fetchBaseModels } = useExecution('get-local-ollama-models')
    const { data: actionRelations, mutateAsync: fetchActionRelations } = useExecuteAction('get-relation-workflows')
  
  const [selectedModel, setSelectedModel] = useState("action-selector");
  const [selectedAction, setSelectedAction] = useState("start-node");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [content, setContent] = useState("")
  const [service, setService] = useState<string | null>(null)
  

  

  const handleSend = async () => {
    if (!content.trim()) return

    try {
      if (onSend) onSend(content.trim(), selectedModel)

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
      localStorage.setItem("session_id", e.target.value)
      setSessionId(e.target.value)
  }

  const handleActionRelations = async (id) => {
        let {data: actions} = await fetchActionRelations({parameters: { id: {"$notnull": true} }})
    console.log(actions)
      }




  useEffect(() => {
     


      fetchBaseModels();
      handleActionRelations(selectedAction)

  }, [fetchActionRelations, fetchBaseModels])
      console.log(baseModelsData, actionRelations, 'BASE MODELS')
  
  

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

            <Drawer.Body className="flex flex-col gap-y-4 max-h-[70vh] overflow-auto">
              <div>
                <Label htmlFor="session-id">Session ID</Label>
                <Input
                  id="session-id"
                  placeholder="Enter session ID"
                  value={sessionId || ""}
                  onChange={(e) => handleSessionId(e)}
                />
              </div>

              <div>
                <Label htmlFor="ai-model">AI Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={(value) => setSelectedModel(value)}
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

           
            </Drawer.Body>

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