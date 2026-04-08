import React, { useState, useRef, useEffect } from 'react'
import {
  Drawer,
  Button,
  Textarea,
  Input,
  Label,
  Select,
  Badge,
  IconButton,
  Tooltip,
  Prompt,
  Tabs,
  Switch,
  Container,
} from '@medusajs/ui'
import { 
  XMark,
  Trash,
  Check,
  PencilSquare,
  EllipsisHorizontal,
} from '@medusajs/icons'
import { useExecuteAction } from '../../../../hooks/api/actions'

// Custom Icons
const ArrowUpCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 11.25-3-3m0 0-3 3m3-3v7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

const Sparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
  </svg>
)

const ChatBubble = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
  </svg>
)

const DocumentText = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
)

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 18H7.5" />
  </svg>
)

const ThumbUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.38-.078.86-.523.86h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
  </svg>
)

const ThumbDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.5-5.25h9.75" />
  </svg>
)

const ArrowPath = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
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

interface AIModelTestDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  models?: Array<{ value: string; label: string }>
  onSendMessage?: (message: string, context: AIContext, parameters: AIParameters) => Promise<string>
  onRegenerateMessage?: (message: string, context: AIContext, parameters: AIParameters) => Promise<string>
  onUpdateContext?: (context: AIContext) => void
  onUpdateParameters?: (parameters: AIParameters) => void
  onMessageFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void
  initialContext?: Partial<AIContext>
  initialParameters?: Partial<AIParameters>
  model?: any
}

const defaultParameters: AIParameters = {
  temperature: 0.7,
  // num_predict: 2000,
  top_p: 1.0,
  top_k: 40,
  // min_p: 0.0,
  repeat_penalty: 1.0,
  num_ctx: 2048,
}

const defaultContext: AIContext = {
  systemPrompt: "You are a helpful assistant.",
  model: "gpt-4",
}

const defaultModels = [
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-2", label: "Claude 2" },
  { value: "llama-2", label: "Llama 2" },
  { value: "mistral", label: "Mistral" },
  { value: "custom", label: "Custom Model" },
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

export const AIModelTestDrawer = ({
  open,
  onOpenChange,
  model,
  onSendMessage,
  onRegenerateMessage,
  onUpdateContext,
  onUpdateParameters,
  onMessageFeedback,
  initialContext = {},
  initialParameters = {},
}: AIModelTestDrawerProps) => {
    const { data: messagesData, mutateAsync: fetchMessages, isLoading: messagesLoading } = 
      useExecuteAction('get-messages-by-model-id') as any
    const {  mutateAsync: updateFeedback, isLoading: loadingFeedback } = 
      useExecuteAction('update-message-feedback') as any
      const {  mutateAsync: deletePair } = 
      useExecuteAction('delete-message-pair') as any
      const {  mutateAsync: deleteMessagesByModel } = 
      useExecuteAction('delete-messages-by-model') as any

  const [activeTab, setActiveTab] = useState<'conversation' | 'context' | 'parameters'>('conversation')
  const [messagePairs, setMessagePairs] = useState<MessagePair[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [context, setContext] = useState<AIContext>({
    ...defaultContext,
    ...initialContext,
  })
  const [parameters, setParameters] = useState<AIParameters>({
    ...defaultParameters,
    ...initialParameters,
  })
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showDeletePrompt, setShowDeletePrompt] = useState<string | null>(null)
  let session_id = localStorage.getItem("session_id");
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const parametersContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {

    if(open){
        handleMessages()
    }

  }, [open])


  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData])

  // Focus textarea on drawer open
  useEffect(() => {
    if (open && activeTab === 'conversation') {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [open, activeTab])

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingMessage) {
      setTimeout(() => {
        editTextareaRef.current?.focus()
      }, 100)
    }
  }, [editingMessage])

const groupMessagesToPairs = (messages: Message[]): MessagePair[] => {
  const pairs: MessagePair[] = []
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i] as any;
    
    if (message.role === 'user') {
      const pairId = `${message.session_id}` || `pair-${Date.now()}-${i}`
      const assistantMessage = messages[i + 1]?.role === 'assistant' 
        ? messages[i + 1] 
        : undefined as any;
      
      const systemMessage = messages[i - 1]?.role === 'system' 
        ? messages[i - 1] 
        : undefined as any;
      
      pairs.push({
        id: pairId,
        systemMessage: systemMessage,
        userMessage: {...message, feedback: message.metadata?.feedback, timestamp: new Date(message.created_at)},
        assistantMessage: {...assistantMessage, feedback: assistantMessage.metadata?.feedback, timestamp: new Date(assistantMessage.created_at)},
      })
      
      // Skip the assistant message if it was paired
      if (assistantMessage) {
        i++
      }
    }
  }
  
  return pairs
}

  const handleMessages = async () => {
      let {data} =  await fetchMessages({parameters: {id: model.id}});
let newPairs = groupMessagesToPairs(data)
        console.log(newPairs, 'NEW PAIRS')
        setMessagePairs(newPairs)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
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
         const res = await fetch("/actions/chat-ai-model/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
         "session_id": session_id as any
      },
      body: JSON.stringify({ parameters: { message: inputMessage, model: model.model_name, session_id, parameters: parameters } })
    })

    const json = await res.json()
console.log(json, 'JSON RESPP')
    const assistantText = json.data.message   // 👈 the field you want
    
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantText,
          timestamp: new Date(),
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
    }
  }

  const handleRegenerateMessage = async (pairId: string) => {
    const pair = messagePairs.find(p => p.id === pairId)
    if (!pair?.userMessage || isRegenerating) return

    setIsRegenerating(pairId)

    try {

      let system = messagePairs.find(a => a.id == pairId);

         const res = await fetch("/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "session_id": session_id as any
      },
      body: JSON.stringify({ config: parameters, message: pair.userMessage.content, model: model.model_name, system: system?.systemMessage?.content, session_id })
    })

    const json = await res.json()
console.log(context, parameters, json, 'REGEN JSON RESPP')
            const assistantText = json   // 👈 the field you want

        setMessagePairs(prev =>
          prev.map(p =>
            p.id === pairId
              ? { ...p, assistantMessage: {...p.assistantMessage, content: assistantText } as any }
              : p
          )
        )
    } catch (error) {
      console.error('Error regenerating message:', error)
    } finally {
      setIsRegenerating(null)
    }
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    let pair = messagePairs.find(a => a.assistantMessage?.id == messageId) as any;
    
    if(pair?.id){
        let {feedback: oldFeedback} = pair.assistantMessage;
        await updateFeedback({parameters: {id: pair.id, feedback: feedback == oldFeedback ? '' : feedback }})
    }

    setMessagePairs(prev =>
      prev.map(pair => {
        if (pair.assistantMessage?.id === messageId) {
          const updatedAssistant = {
            ...pair.assistantMessage,
            feedback: pair.assistantMessage.feedback === feedback ? null : feedback,
          }
          return { ...pair, assistantMessage: updatedAssistant }
        }
        return pair
      })
    )
    onMessageFeedback?.(messageId, feedback)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessage({ ...message, isEditing: true })
  }

  const handleSaveEdit = () => {
    if (editingMessage) {
      setMessagePairs(prev =>
        prev.map(pair => {
          if (pair.userMessage.id === editingMessage.id) {
            return { ...pair, userMessage: { ...editingMessage, isEditing: false } }
          }
          if (pair.assistantMessage?.id === editingMessage.id) {
            return { ...pair, assistantMessage: { ...editingMessage, isEditing: false } }
          }
          return pair
        })
      )
      setEditingMessage(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
  }

  const handleDeletePair = async (pairId: string) => {


    if(pairId.includes('mess')){

    await deletePair({parameters: {id: pairId}});
    setMessagePairs(prev => prev.filter(pair => pair.id !== pairId))
    } else {
    handleClearConversation(pairId)
    }
    setShowDeletePrompt(null)

  }

  const handleClearConversation = async (id) => {
    await deleteMessagesByModel({parameters: {id}})
    setMessagePairs([])
  }

  const handleUpdateContext = (updates: Partial<AIContext>) => {
    const newContext = { ...context, ...updates }
    setContext(newContext)
    onUpdateContext?.(newContext)
  }

  const handleUpdateParameters = (updates: Partial<AIParameters>) => {
    const newParameters = { ...parameters, ...updates }
    setParameters(newParameters)
    onUpdateParameters?.(newParameters)
  }

  const getMessageColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-ui-bg-base border-ui-border-base'
      case 'assistant':
        return 'bg-ui-bg-subtle border-ui-border-strong'
      case 'system':
        return 'bg-ui-tag-neutral-bg border-ui-tag-neutral-border'
      default:
        return 'bg-ui-bg-base border-ui-border-base'
    }
  }

  const getMessageLabel = (role: string) => {
    switch (role) {
      case 'user':
        return 'You'
      case 'assistant':
        return 'AI Assistant'
      case 'system':
        return 'System'
      default:
        return role
    }
  }



  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="!max-w-4xl">
        <Drawer.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles />
              <Drawer.Title>Chat {model.model_name} AI MODEL</Drawer.Title>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Clear conversation">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowDeletePrompt(model.id)}
                >
                  <Trash />
                </Button>
              </Tooltip>
              <Drawer.Close asChild>
                <Button variant="secondary" size="small">
                  <XMark />
                </Button>
              </Drawer.Close>
            </div>
          </div>
        </Drawer.Header>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'conversation' | 'context' | 'parameters')}
        >
          <div className="border-b border-ui-border-base px-6">
            <Tabs.List>
              <Tabs.Trigger value="conversation">
                <ChatBubble />
                Conversation
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
            {/* Conversation Tab */}
            <Tabs.Content value="conversation">
              <div className="flex flex-col h-[600px]">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  {messagePairs.map((pair) => (
                    <div key={pair.id} className="space-y-4">
                      {/* User Message */}
                                     {showSystem && <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge size="small" color="grey">
                                  {getMessageLabel('system')}
                                </Badge>
                                {/* <span className="text-xs text-ui-fg-subtle">
                                  {pair.systemMessage?.timestamp.toLocaleTimeString()}
                                </span> */}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* <Tooltip content="Edit message">
                                  <IconButton
                                    size="small"
                                    variant="transparent"
                                    onClick={() => handleEditMessage(pair.systemMessage)}
                                  >
                                    <PencilSquare />
                                  </IconButton>
                                </Tooltip> */}
                                {/* <Tooltip content="Delete conversation">
                                  <IconButton
                                    size="small"
                                    variant="transparent"
                                    onClick={() => setShowDeletePrompt(pair.id)}
                                  >
                                    <Trash />
                                  </IconButton>
                                </Tooltip> */}
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap text-ui-fg-base">
                              {pair.systemMessage?.content}
                            </div>
                          </>}
                      <div
                        className={`rounded-lg p-4 border ${getMessageColor(
                          'user'
                        )} relative group`}
                      >
       
                        {editingMessage?.id === pair.userMessage.id ? (
                          <div className="space-y-2">
                            <Textarea
                              ref={editTextareaRef}
                              value={editingMessage.content}
                              onChange={(e) =>
                                setEditingMessage({
                                  ...editingMessage,
                                  content: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                  e.preventDefault()
                                  handleSaveEdit()
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEdit()
                                }
                              }}
                              className="min-h-[100px]"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="small"
                                onClick={handleSaveEdit}
                              >
                                <Check />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge size="small" color="grey">
                                  {getMessageLabel('user')}
                                </Badge>
                                <span className="text-xs text-ui-fg-subtle">
                                  {pair.userMessage.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip content="Edit message">
                                  <IconButton
                                    size="small"
                                    variant="transparent"
                                    onClick={() => handleEditMessage(pair.userMessage)}
                                  >
                                    <PencilSquare />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip content="Delete conversation">
                                  <IconButton
                                    size="small"
                                    variant="transparent"
                                    onClick={() => setShowDeletePrompt(pair.id)}
                                  >
                                    <Trash />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap text-ui-fg-base">
                              {pair.userMessage.content}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Assistant Message */}
                      {pair.assistantMessage && (
                        <div
                          className={`rounded-lg p-4 border ${getMessageColor(
                            'assistant'
                          )} relative group`}
                        >
                          {editingMessage?.id === pair.assistantMessage.id ? (
                            <div className="space-y-2">
                              <Textarea
                                ref={editTextareaRef}
                                value={editingMessage.content}
                                onChange={(e) =>
                                  setEditingMessage({
                                    ...editingMessage,
                                    content: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.shiftKey) {
                                    e.preventDefault()
                                    handleSaveEdit()
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelEdit()
                                  }
                                }}
                                className="min-h-[100px]"
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="primary"
                                  size="small"
                                  onClick={handleSaveEdit}
                                >
                                  <Check />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge size="small" color="blue">
                                    {getMessageLabel('assistant')}
                                  </Badge>
                                  <span className="text-xs text-ui-fg-subtle">
                                    {pair.assistantMessage.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* Feedback Buttons */}
                                  <div className="flex items-center gap-1 mr-2">
                                    <Tooltip content="Like">
                                      <IconButton
                                        size="small"
                                        variant={pair.assistantMessage.feedback === 'like' ? 'primary' : 'transparent'}
                                        onClick={() => handleFeedback(pair.assistantMessage!.id, 'like')}
                                      >
                                        <ThumbUp />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip content="Dislike">
                                      <IconButton
                                        size="small"
                                        variant={pair.assistantMessage.feedback === 'dislike' ? 'primary' : 'transparent'}
                                        onClick={() => handleFeedback(pair.assistantMessage!.id, 'dislike')}
                                      >
                                        <ThumbDown />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                  
                                  {/* Regenerate Button */}
                                  <Tooltip content="Regenerate response">
                                    <IconButton
                                      size="small"
                                      variant="transparent"
                                      onClick={() => handleRegenerateMessage(pair.id)}
                                      isLoading={isRegenerating === pair.id}
                                    >
                                      <ArrowPath />
                                    </IconButton>
                                  </Tooltip>

                                  {/* Edit Button */}
                                  <Tooltip content="Edit message">
                                    <IconButton
                                      size="small"
                                      variant="transparent"
                                      onClick={() => handleEditMessage(pair.assistantMessage!)}
                                    >
                                      <PencilSquare />
                                    </IconButton>
                                  </Tooltip>
                                </div>
                              </div>
                              <div className="whitespace-pre-wrap text-ui-fg-base">
                                {pair.assistantMessage.content}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  
                  {messagePairs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <ChatBubble />
                      <p className="mt-4 text-ui-fg-subtle">No messages yet. Start a conversation!</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="mt-4 pt-4 border-t border-ui-border-base flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Type your message... (Shift+Enter for new line, Enter to send)"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[80px]"
                      />
                    </div>

                  </div>
                  <p className="text-xs text-ui-fg-subtle mt-2">
                    Press Enter to send, Shift+Enter for new line. Press Esc to close drawer.
                  </p>
                </div>
                <div className='gap-5'>
                                    <Button
                      variant="primary"
                      onClick={handleSendMessage}
                      isLoading={isSending}
                      disabled={!inputMessage.trim() || isSending}
                    >
                      <ArrowUpCircle />
                      Send
                    </Button>
                             <Switch
                             checked={showSystem}
                      onCheckedChange={(e: any) => setShowSystem(e)}
                    >
                      System  
                    </Switch>
                    </div>
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
                        onUpdateContext?.(newData)
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
                      onClick={() => setActiveTab('conversation')}
                    >
                      Start Testing
                    </Button>
                  </div>
                </div>
              </div>
            </Tabs.Content>
          </div>
        </Tabs>
      </Drawer.Content>

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
    </Drawer>
  )
}