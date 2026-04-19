"use client"

import { useState, useRef, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import ChatInput from "./components/ChatInput"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SidebarProvider } from "../../lib/context/sidebar-context"
import { AiAssistent, ArrowPath, PencilSquare, ThumbDown, ThumbUp, Trash } from "@medusajs/icons"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"
import { useExecuteAction, useExecution } from "../../hooks/api/actions"
import { Check } from "lucide-react"
import { Button, IconButton, Textarea, Tooltip, Badge, Prompt, Switch } from "@medusajs/ui"
import { ChatConversation } from "./components/chat-conversation"
import { DEFAULT_ENV } from "../../utils/commonData"

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: Date
  isEditing?: boolean
  feedback?: 'like' | 'dislike' | null
}

interface MessagePair {
  id: string
  userMessage: Message
  assistantMessage?: Message
  systemMessage?: Message
}

interface AIParameters {
  temperature: number
  num_predict?: number
  top_p?: number
  top_k?: number
  min_p?: number
  repeat_penalty?: number
  num_ctx?: number
}

interface AIContext {
  systemPrompt: string
  model: string
  [key: string]: any
}

export const DEFAULT_CONFIG: any = {
  session_id: "",
  model_id: "alayon",
  relation_id: "start-node",
  chat_url: "/ai-chat",
  feedback_url: "/rag-feedback"
};


const tryParseJsonMessage = (content: any) => {
  if (typeof content !== "string") return content;

  const trimmed = content.trim();

  // Quick reject (performance + safety)
  if (
    !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
    !(trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // If it's an object and has message field → return message
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.message === "string") {
        return parsed;
      }
      return parsed; // fallback: return full object
    }

    return content;
  } catch {
    return content;
  }
};



export default function Home() {
  const { mutateAsync: getChats, isPending } = useExecuteAction("get-conversation-messages")
  const { mutateAsync: deletePair } =
    useExecuteAction('delete-message-pair') as any
  const [messagePairs, setMessagePairs] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [config, setConfig] = useState<any>({});
  const [showDeletePrompt, setShowDeletePrompt] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })





  const handleMessages = async (id) => {
    let { data } = await getChats({ parameters: { id } }) as any;
    // setMessages(data);
    // let {data} =  await fetchMessages({parameters: {id: model.id}});
    let newPairs = groupMessagesToPairs(data)
    setMessagePairs(newPairs)
  }

  const handleSendMessage = async (text, conf) => {
    if (!text.trim() || isSending) return
    const session_id = localStorage.getItem('session_id');


    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date(),
    }

    const pairId = `pair-${Date.now()}`
    const newPair: MessagePair = {
      id: pairId,
      userMessage,
    }

    setMessagePairs(prev => [...prev, newPair])
    setInputMessage('')
    setIsSending(true)


    try {
      console.log(config, conf, 'cccd')

      const res = await fetch(`${DEFAULT_ENV.n8n_prod_url + config.chat_url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({ parameters: { ...config, message: text, session_id } })
      })

      const json = await res.json()

      const assistantText = json.data.message   // 👈 the field you want


      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantText,
        created_at: new Date(),
      }

      setMessagePairs(prev =>
        prev.map(pair =>
          pair.id === pairId
            ? { ...pair, assistantMessage }
            : pair
        )
      )



    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
      scrollBottom()
      // handleMessages(sessionId)
    }
  }




  const handleDeletePair = async (pairId: string) => {
    await deletePair({ parameters: { id: pairId } });

    setMessagePairs(prev => prev.filter(pair => pair.id !== pairId))
    setShowDeletePrompt(null)
  }


  const handleConfig = (prop) => {
    setConfig({ ...config, ...prop });
    localStorage.setItem("config", JSON.stringify({ ...config, ...prop }))
  }

  const handleRegenerateMessage = async (pairId: string) => {
    let session_id = localStorage.getItem("session_id") as any;

    const pair = messagePairs.find(p => p.id === pairId)
    console.log(pair, pairId, 'PAAIR')
    if (!pair?.userMessage || isRegenerating) return

    setIsRegenerating(pairId)

    try {

      let system = messagePairs.find(a => a.id == pairId);

      console.log(system, messagePairs, 'SYSTEM')


      const res = await fetch(config.chat_url + '-regenrate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({ id: pairId })
      })

      const json = await res.json()
      const assistantText = json   // 👈 the field you want


      console.log(assistantText, "ASSISTS")
      setMessagePairs(prev =>
        prev.map(p =>
          p.id === pairId
            ? { ...p, assistantMessage: { ...p.assistantMessage, content: assistantText } as any }
            : p
        )
      )

    } catch (error) {
      console.error('Error regenerating message:', error)
    } finally {
      setIsRegenerating(null)
    }
  }

  const handleFeedback = async (id: string, feedback) => {
    let session_id = localStorage.getItem("session_id") as any;

    try {


      console.log(config, "CONFF")
      const res = await fetch(config.feedback_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({ id, feedback })
      })

      const json = await res.json()
      console.log(json, 'FEEDBACK RESPONSE')


    } catch (error) {
      console.error('Error regenerating message:', error)
    }
  }




  useEffect(() => {
    let session_id = localStorage.getItem("session_id") as any;

    if (session_id && session_id != 'undefined') {
      handleMessages(session_id)
      // handleSession(session_id)
    } else {
      localStorage.removeItem('session_id')
    }

  }, [])



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagePairs])





  const groupMessagesToPairs = (messages: Message[]): MessagePair[] => {
    const sortedMessages = [...messages].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const pairs: MessagePair[] = [];
    let userMessageQueue: any[] = [];
    for (let i = 0; i < sortedMessages.length; i++) {
      const message = sortedMessages[i] as any;

      if (message.role === "user") {
        userMessageQueue.push({
          ...message,
          content: tryParseJsonMessage(message.content),
        });
      }

      else if (message.role === "assistant" && userMessageQueue.length > 0) {
        const userMessage = userMessageQueue.shift();
        const pairId = userMessage.session_id || `pair-${Date.now()}-${i}`;

        const systemMsg = sortedMessages.find(
          (a: any) =>
            a.session_id === userMessage.session_id &&
            a.role === "system"
        );




        pairs.push({
          id: pairId,

          systemMessage: systemMsg
            ? {
              ...systemMsg,
              content: tryParseJsonMessage(systemMsg.content),
            }
            : undefined,

          userMessage: {
            ...userMessage,
            feedback: userMessage?.metadata?.feedback,
            created_at: new Date(userMessage.created_at),
          },

          assistantMessage: {
            ...message,
            content: tryParseJsonMessage(message.content),
            feedback: message?.metadata?.feedback,
            created_at: new Date(message.created_at),
          },
        });
      }
    }

    pairs.sort((a, b) => {
      return (
        new Date(a.userMessage.created_at).getTime() -
        new Date(b.userMessage.created_at).getTime()
      );
    });

    return pairs;
  };





  return (
    <SidebarProvider>
      <main className="relative overflow-hidden min-h-screen flex flex-col items-center justify-start bg-gray-50">
        {/* Title */}


        {/* Chat Window */}

        <ChatConversation
          showSystem={showSystem}
          onFeedback={handleFeedback}
          onRegenerate={handleRegenerateMessage}
          messagePairs={messagePairs}
          setMessagePairs={setMessagePairs}
        />
        {/* Chat Input */}
        <div className="w-full max-w-4xl mt-4">
          <ChatInput onSend={handleSendMessage} isPending={isPending} showSystem={showSystem} setShowSystem={setShowSystem} config={config} setConfig={handleConfig} />
        </div>
      </main>
      {/* Delete Confirmation Prompt */}
      {showDeletePrompt && (
        <Prompt
          open={true}
          onOpenChange={() => setShowDeletePrompt(null)}
        >
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Delete conversation</Prompt.Title>
              <Prompt.Description>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel>Cancel</Prompt.Cancel>
              <Prompt.Action
                onClick={() => handleDeletePair(showDeletePrompt)}
              >
                Delete
              </Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>
      )}
    </SidebarProvider>
  )
}

export const config = defineRouteConfig({
  label: "ARM",
  icon: AiAssistent,
})