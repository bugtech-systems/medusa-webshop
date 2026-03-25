"use client"

import { useState, useRef, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import ChatInput from "./components/ChatInput"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SidebarProvider } from "../../lib/context/sidebar-context"
import { AiAssistent } from "@medusajs/icons"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"
import { useExecuteAction, useExecution } from "../../hooks/api/actions"

type Message = {
  role: "user" | "assistant"
  content: string
}

export default function Home() {
  const { mutateAsync: chatAi, isPending } = useExecuteAction("chat-ai-conversation");
  const { mutateAsync: getChats, isPending: isLoading } = useExecuteAction("get-conversation-messages")

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" })

  // Send message and stream AI response
const sendMessage = async (text: string, model: any) => {
  if (!text.trim()) return
  const session_id = localStorage.getItem('session_id');
  const userMessage: Message = { role: "user", content: text }

  setMessages((prev) => [
    ...prev,
    userMessage,
    { role: "assistant", content: "" }
  ])

  setLoading(true)

  try {

    const res = await fetch("/actions/chat-action-selector-prompt/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parameters: { message: text, model, session_id } })
    })

    const json = await res.json()

    const assistantText = json.data.message   // 👈 the field you want
    
    if(!session_id && json.data.session_id){
      localStorage.setItem('session_id', json.data.session_id)
      setSessionId(json.data.session_id)
    }
    
    setMessages((prev) => {
      const copy = [...prev]
      copy[copy.length - 1] = {
        role: "assistant",
        content: assistantText
      }
      return copy
    })

  } catch (err) {
    console.error(err)

    setMessages((prev) => {
      const copy = [...prev]
      copy[copy.length - 1] = {
        role: "assistant",
        content: "⚠️ Something went wrong..."
      }
      return copy
    })

  } finally {
    setLoading(false)
    scrollBottom()
  }
}

const handleMessages = async (id) => {
let {data} = await getChats({parameters: {id}});
setMessages(data);
}

useEffect(() => {
let session_id = localStorage.getItem("session_id") as any;
if(session_id){
  setSessionId(session_id);
  handleMessages(session_id);
}
}, [])

  return (
    <SidebarProvider>
      <main className="relative min-h-screen flex flex-col items-center justify-start bg-gray-50">
        {/* Title */}


        {/* Chat Window */}
        <div className="w-full max-w-2xl flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg h-[60vh] overflow-y-auto">
          {messages.length ? (
           <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  "px-4 py-2 rounded-lg max-w-[80%]",
                  m.role === "user"
                    ? "self-end bg-blue-600 text-white"
                    : "self-start bg-gray-100 text-gray-900 relative"
                )}
              >
                {m.content}
                {m.role === "assistant" && loading && i === messages.length - 1 && (
                  <span className="animate-pulse ml-1">▋</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          ) : 
          
      <div className="flex items-center justify-center gap-2 text-xl font-semibold h-full">
          How can I help you?
        </div>
          }
      
          <div ref={bottomRef} />
        </div>

        {/* Chat Input */}
        <div className="w-full max-w-2xl mt-4">
          <ChatInput onSend={sendMessage} isPending={isPending} sessionId={sessionId} setSessionId={setSessionId}/>
        </div>
      </main>
    </SidebarProvider>
  )
}

export const config = defineRouteConfig({
  label: "ARM",
  icon: AiAssistent,
})