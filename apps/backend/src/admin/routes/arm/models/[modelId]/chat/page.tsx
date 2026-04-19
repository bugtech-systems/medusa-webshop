"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router-dom" // or from "@tanstack/react-router" depending on your setup
import ChatInput from "../../../components/ChatModelInput"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SidebarProvider } from "../../../../../lib/context/sidebar-context"
import { AiAssistent, ArrowPath, PencilSquare, ThumbDown, ThumbUp, Trash } from "@medusajs/icons"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"
import { useExecuteAction, useExecution, useN8nWebhook } from "../../../../../hooks/api/actions"
import { Check } from "lucide-react"
import { Button, IconButton, Textarea, Tooltip, Badge, Prompt } from "@medusajs/ui"
import { ChatConversation } from "../../../components/chat-conversation"
import { DEFAULT_ENV } from "../../../../../utils/commonData"

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
  feedback_url: "/model-feedback"
};

const tryParseJsonMessage = (content: any) => {
  if (typeof content !== "string") return content;

  const trimmed = content.trim();

  if (
    !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
    !(trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (parsed && typeof parsed === "object") {
      if (typeof parsed.message === "string") {
        return parsed;
      }
      return parsed;
    }

    return content;
  } catch {
    return content;
  }
};

export default function Home() {
  const params = useParams<{ modelId: string }>() // Get id from URL path
  const modelId = params.modelId

  const { mutateAsync: getChats, isPending } = useN8nWebhook("/get-conversation-messages") as any;
  const { mutateAsync: deletePair } = useExecuteAction('delete-message-pair') as any
  const { mutateAsync: getModelConfig, isPending: isLoadingModel } = useExecuteAction('get-model-config') // New action to fetch model config

  const [messagePairs, setMessagePairs] = useState<any[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [config, setConfig] = useState<any>({})
  const [modelConfig, setModelConfig] = useState<any>(null)
  const [showDeletePrompt, setShowDeletePrompt] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  // Fetch model configuration by ID from URL
  const fetchModelConfig = async (id: string) => {
    try {
      const { data } = await getModelConfig({ parameters: { id } }) as any

      // Merge model config with default config
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...data,
        ...data?.metadata,
        model_id: id,
        model_name: data.model_name,
        base_model: data.base_model,
        system_prompt: data.system,
        config: data.config,
        provider: data.provider
      }

      setModelConfig(data)
      setConfig(mergedConfig)

      // Store in localStorage for persistence
      localStorage.setItem("model_config", JSON.stringify(mergedConfig))

      return mergedConfig
    } catch (error) {
      console.error('Error fetching model config:', error)
      // Fallback to default config if fetch fails
      const fallbackConfig = { ...DEFAULT_CONFIG, model_id: id }
      setConfig(fallbackConfig)
      return fallbackConfig
    }
  }

  const handleMessages = async (sessionId?: any) => {
    try {
      const data = await getChats({ id: sessionId }) as any
      const newPairs = groupMessagesToPairs(data)
      setMessagePairs(newPairs)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (text: string, conf: any) => {
    if (!text.trim() || isSending) return

    let session_id = localStorage.getItem('session_id')

    // Create session if doesn't exist
    if (!session_id || session_id === 'undefined') {
      session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('session_id', session_id)
    }

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
      const res = await fetch(config.chat_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({
          parameters: {
            ...config,
            message: text,
            session_id,
            model_id: modelId // Include model ID in request
          }
        })
      })

      const json = await res.json()
      const assistantText = json.data?.message || json.message || json

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: typeof assistantText === 'object' ? JSON.stringify(assistantText) : assistantText,
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
    }
  }

  const handleDeletePair = async (pairId: string) => {
    await deletePair({ parameters: { id: pairId } })
    setMessagePairs(prev => prev.filter(pair => pair.id !== pairId))
    setShowDeletePrompt(null)
  }

  const handleConfig = (prop: any) => {
    const newConfig = { ...config, ...prop }
    setConfig(newConfig)
    localStorage.setItem("model_config", JSON.stringify(newConfig))
  }

  const handleRegenerateMessage = async (pairId: string) => {
    let session_id = localStorage.getItem("session_id") as any
    const pair = messagePairs.find(p => p.id === pairId)

    if (!pair?.userMessage || isRegenerating) return

    setIsRegenerating(pairId)

    try {
      const res = await fetch(`${config.chat_url}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({
          id: pairId,
          model_id: modelId
        })
      })

      const json = await res.json()
      const assistantText = json.data?.message || json.message || json

      setMessagePairs(prev =>
        prev.map(p =>
          p.id === pairId
            ? {
              ...p,
              assistantMessage: {
                ...p.assistantMessage,
                content: typeof assistantText === 'object' ? JSON.stringify(assistantText) : assistantText,
                created_at: new Date()
              } as any
            }
            : p
        )
      )
    } catch (error) {
      console.error('Error regenerating message:', error)
    } finally {
      setIsRegenerating(null)
    }
  }

  const handleFeedback = async (id: string, feedback: 'like' | 'dislike') => {
    try {
      const res = await fetch(`${DEFAULT_ENV.n8n_prod_url + config.feedback_url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          feedback,
          model_id: modelId
        })
      })

      const json = await res.json()
      console.log(json, 'FEEDBACK RESPONSE')

      // Update local state to reflect feedback
      setMessagePairs(prev =>
        prev.map(pair => {
          if (pair.assistantMessage?.id === id) {
            return {
              ...pair,
              assistantMessage: {
                ...pair.assistantMessage,
                feedback
              }
            }
          }
          if (pair.userMessage?.id === id) {
            return {
              ...pair,
              userMessage: {
                ...pair.userMessage,
                feedback
              }
            }
          }
          return pair
        })
      )
    } catch (error) {
      console.error('Error sending feedback:', error)
    }
  }

  useEffect(() => {
    // Load model config when component mounts or modelId changes
    if (modelId) {
      fetchModelConfig(modelId)
    }

    // Initialize session
    let session_id = localStorage.getItem("session_id")
    if (!session_id || session_id === 'undefined') {
      session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('session_id', session_id)
    } else {
      // Load existing messages for this session
      handleMessages(modelId)
    }

    // Load saved config from localStorage
    const savedConfig = localStorage.getItem("model_config")
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      if (parsedConfig.model_id === modelId) {
        setConfig(parsedConfig)
      }
    }
  }, [modelId]) // Re-run when modelId changes

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagePairs])

  const groupMessagesToPairs = (messages: Message[]): MessagePair[] => {
    const sortedMessages = [...messages].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const pairs: MessagePair[] = []
    let userMessageQueue: any[] = []

    for (let i = 0; i < sortedMessages.length; i++) {
      const message = sortedMessages[i] as any

      if (message.role === "user") {
        userMessageQueue.push({
          ...message,
          content: tryParseJsonMessage(message.content),
          metadata: { feedback: message?.like }
        })
      } else if (message.role === "assistant" && userMessageQueue.length > 0) {
        const userMessage = userMessageQueue.shift()
        const pairId = userMessage.session_id || `pair - ${Date.now()} - ${i}`

        const systemMsg = sortedMessages.find(
          (a: any) =>
            a.session_id === userMessage.session_id &&
            a.role === "system"
        )

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
            feedback: userMessage?.feedback,
            created_at: new Date(userMessage.created_at),
          },
          assistantMessage: {
            ...message,
            content: tryParseJsonMessage(message.content),
            feedback: message?.feedback,
            created_at: new Date(message.created_at),
          },
        })
      }
    }

    pairs.sort((a, b) => {
      return (
        new Date(a.userMessage.created_at).getTime() -
        new Date(b.userMessage.created_at).getTime()
      )
    })

    return pairs
  }

  // Loading state
  if (isLoadingModel) {
    return (
      <SidebarProvider>
        <main className="relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-ui-fg-subtle">Loading model configuration...</p>
          </div>
        </main>
      </SidebarProvider>
    )
  }

  // Error state if model not found
  if (!modelConfig && !isLoadingModel) {
    return (
      <SidebarProvider>
        <main className="relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Model Not Found</h2>
            <p className="text-ui-fg-subtle mb-4">
              The AI model with ID "{modelId}" could not be found.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </main>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <main className="relative overflow-hidden min-h-screen flex flex-col items-center justify-start bg-gray-50">
        {/* Model Info Bar */}
        {modelConfig && (
          <div className="w-full bg-white border-b border-gray-200 px-6 py-3 mb-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{modelConfig.name}</h2>
                <p className="text-sm text-ui-fg-subtle">
                  Version: {modelConfig.version} | Provider: {modelConfig.provider}
                </p>
              </div>
              <Badge color={modelConfig.status === 'active' ? 'green' : 'grey'}>
                {modelConfig.status || 'active'}
              </Badge>
            </div>
          </div>
        )}

        {/* Chat Window */}
        <ChatConversation
          onFeedback={handleFeedback}
          onRegenerate={handleRegenerateMessage}
          messagePairs={messagePairs}
          setMessagePairs={setMessagePairs}
        />

        {/* Chat Input */}
        <div className="w-full max-w-4xl mt-4">
          <ChatInput
            onSend={handleSendMessage}
            isPending={isPending}
            config={modelConfig}
            setConfig={handleConfig}
          />
        </div>
      </main>

      {/* Delete Confirmation Prompt */}
      {showDeletePrompt && (
        <Prompt open={true} onOpenChange={() => setShowDeletePrompt(null)}>
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Delete conversation</Prompt.Title>
              <Prompt.Description>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel>Cancel</Prompt.Cancel>
              <Prompt.Action onClick={() => handleDeletePair(showDeletePrompt)}>
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