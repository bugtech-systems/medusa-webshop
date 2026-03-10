"use client"

import { useState, KeyboardEvent } from "react"
import { ArrowUp, Paperclip } from "lucide-react"

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

export default function ChatInput({ isPending, onSend }: any) {
  const [content, setContent] = useState("")
  const [service, setService] = useState<string | null>(null)


  const handleSend = async () => {
    if (!content.trim()) return

    try {
      const model = service ? serviceModels.find((a) => a.id === service)?.model : "alayon-ai"
      if (onSend) onSend(content.trim(), model)

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

  return (
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
  )
}