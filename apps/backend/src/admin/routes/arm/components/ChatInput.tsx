"use client"

import { useState, KeyboardEvent } from "react"
import { useExecuteAction } from "../../../hooks/api/actions"
import { ArrowUp, Paperclip, Globe } from "lucide-react"

interface Props {
  conversationId?: string
  onSend?: any
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



export default function ChatInput({ conversationId, onSend }: Props) {
  const [content, setContent] = useState("")
  const [service, setService] = useState(null) // default model

  const { mutateAsync: chatAi, isPending } = useExecuteAction("chat-ai-conversation")

  const handleSend = async () => {
    if (!content.trim() || isPending) return

    try {
     let res = await chatAi({
        parameters: {
          content: content.trim(),
          model: service ? serviceModels.find(a => a.id == service)?.model : 'alayon-ai',
          conversation_id: conversationId,
        },
      }) as any;


      setContent("") // clear input on success
    if(res?.context && res?.context?.conversation_id && !conversationId){
    window.location.href = `/app/arm/relations/${res?.context?.conversation_id}`
     }
     onSend();
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

  const handleService = (e) => {
            if(e.id != service){
            setContent(e.content)
            setService(e.id)
            } else {
            setContent("")
            setService(null)
            }
            
          
  }


  return (
    <div className="w-full rounded-2xl border bg-white shadow-lg px-4 py-3">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Alayon"
        disabled={isPending}
        className="w-full bg-transparent outline-none text-sm placeholder:text-neutral-400 disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between">
        {/* Left actions (quick prompts / model switchers later) */}
        <div className="flex gap-2">
        {serviceModels.map(a => {
            return (
            <button
            type="button"
            onClick={() => handleService(a)}
            className={`${service == a.id ? 'bg-blue-500 text-white' : 'hover:bg-neutral-50'} flex items-center gap-1 rounded-full border px-3 py-1 text-xs`}
          >
            {a.name}
          </button>
            )
        })}

        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-neutral-100"
            disabled={isPending}
          >
            <Paperclip size={16} />
          </button>

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
    </div>
  )
}
