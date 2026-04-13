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
import { Button, IconButton, Textarea, Tooltip, Badge, Prompt } from "@medusajs/ui"

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

export default function Home() {
  const { mutateAsync: chatAi, isPending } = useExecuteAction("chat-ai-conversation");
  const { mutateAsync: getChats, isPending: isLoading } = useExecuteAction("get-conversation-messages")
  const { mutateAsync: updateFeedback, isLoading: loadingFeedback } =
    useExecuteAction('update-message-feedback') as any
  const { mutateAsync: deletePair } =
    useExecuteAction('delete-message-pair') as any
  const { mutateAsync: updateMessage } =
    useExecuteAction('update-message-content') as any
  const [messagePairs, setMessagePairs] = useState<any[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [config, setConfig] = useState<any>({ model: 'action-selector', relation_id: 'start-node', chat_url: '' });
  const [context, setContext] = useState<AIContext | any>({})
  const [parameters, setParameters] = useState<AIParameters | any>({})
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showDeletePrompt, setShowDeletePrompt] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const parametersContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })





  const handleMessages = async (id) => {
    let { data } = await getChats({ parameters: { id } }) as any;
    setMessages(data);
    // let {data} =  await fetchMessages({parameters: {id: model.id}});
    let newPairs = groupMessagesToPairs(data)
    setMessagePairs(newPairs)
  }

  const handleSendMessage = async (text, model) => {
    console.log(text, model, 'haha')
    if (!text.trim() || isSending) return
    const session_id = localStorage.getItem('session_id');


    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
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

      const res = await fetch(config.chat_url || '/actions/chat-action/execute', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "session_id": session_id as any
        },
        body: JSON.stringify({ parameters: { ...config, message: text, model, session_id } })
      })

      const json = await res.json()

      const assistantText = json.data.message   // 👈 the field you want


      console.log(json, 'ASSISTANT RESP')


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
      scrollBottom()
      // handleMessages(sessionId)
    }
  }

  const handleRegenerateMessage = async (pairId: string) => {
    const pair = messagePairs.find(p => p.id === pairId)
    if (!pair?.userMessage || isRegenerating) return

    setIsRegenerating(pairId)

    try {

      // Mock regeneration
      setTimeout(() => {
        const mockResponse: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Regenerated response to: "${pair.userMessage.content}"`,
          timestamp: new Date(),
          feedback: null,
        }
        setMessagePairs(prev =>
          prev.map(p =>
            p.id === pairId
              ? { ...p, assistantMessage: mockResponse }
              : p
          )
        )
        setIsRegenerating(null)
      }, 1000)
    } catch (error) {
      console.error('Error regenerating message:', error)
    } finally {
      // setIsRegenerating(false)
    }
  }

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    let pair = messagePairs.find(a => a.assistantMessage?.id == messageId) as any;

    if (pair?.id) {
      let { feedback: oldFeedback } = pair.assistantMessage;
      await updateFeedback({ parameters: { id: pair.id, feedback: feedback == oldFeedback ? '' : feedback } })
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
    // onMessageFeedback?.(messageId, feedback)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    if (e.key === 'Escape') {
      // onOpenChange(false)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessage({ ...message, isEditing: true })
  }

  const handleSaveEdit = async () => {
    if (editingMessage) {
      await updateMessage({ parameters: { id: editingMessage.id, content: editingMessage.content } })
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
    await deletePair({ parameters: { id: pairId } });

    setMessagePairs(prev => prev.filter(pair => pair.id !== pairId))
    setShowDeletePrompt(null)
  }

  const handleClearConversation = () => {
    setMessagePairs([])
  }

  const handleUpdateContext = (updates: Partial<AIContext>) => {
    const newContext = { ...context, ...updates }
    setContext(newContext)
    // onUpdateContext?.(newContext)
  }

  const handleUpdateParameters = (updates: Partial<AIParameters>) => {
    const newParameters = { ...parameters, ...updates }
    setParameters(newParameters)
    // onUpdateParameters?.(newParameters)
  }

  const handleConfig = (prop) => {
    console.log(prop, 'PROP')
    setConfig({ ...config, ...prop });
    localStorage.setItem("config", JSON.stringify({ ...config, ...prop }))
  }

  const handleContext = (prop) => {
    setConfig({ ...config, context: prop });
  }


  const handleParameters = (prop) => {
    setConfig({ ...config, parameters: prop });
  }

  const handleSession = async () => {

    const res = await fetch(`/actions/session`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      }
    })

    const json = await res.json()


    console.log(json.session_id, 'sessio')
    if (json?.session_id) {
      localStorage.setItem("session_id", json.session_id);
      setConfig({ ...config, session_id: json.session_id });
    }
  }



  useEffect(() => {
    let session_id = localStorage.getItem("session_id") as any;

    console.log(session_id != 'undefined', 'udnee')
    if (session_id && session_id != 'undefined') {
      handleMessages(session_id)
    } else {
      localStorage.removeItem('session_id')
      handleSession();
    }

  }, [])



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagePairs])



  // useEffect(() => {
  // let newMessages = [] as any
  // newMessages = groupMessagesToPairs(messages);
  // setMessagePairs(newMessages)
  // }, [messages])



  const groupMessagesToPairs = (messages: Message[]): MessagePair[] => {
    const pairs: MessagePair[] = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i] as any;

      if (message.role === 'user') {
        const pairId = `${message.session_id}` || `pair-${Date.now()}-${i}`;
        const assistantMsg = messages.find(a >= (a.session_id == pairId && a.role == 'assistant'));
        const systemMsg = messages.find(a >= (a.session_id == pairId && a.role == 'system'));

        const assistantMessage = assistantMsg
          ? assistantMsg
          : undefined as any;

        const systemMessage = systemMsg
          ? systemMsgs
          : undefined as any;

        pairs.push({
          id: pairId,
          systemMessage: systemMessage,
          userMessage: { ...message, feedback: message?.metadata?.feedback, timestamp: new Date(message?.created_at) },
          assistantMessage: { ...assistantMessage, feedback: assistantMessage?.metadata?.feedback, timestamp: new Date(assistantMessage?.created_at) },
        })

        // Skip the assistant message if it was paired
        if (assistantMessage) {
          i++
        }
      }
    }

    return pairs
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
    <SidebarProvider>
      <main className="relative min-h-screen flex flex-col items-center justify-start bg-gray-50">
        {/* Title */}


        {/* Chat Window */}
        <div className="w-full max-w-2xl flex flex-col gap-3 p-4 bg-white rounded-lg shadow-lg h-[60vh] overflow-y-auto">
          {messagePairs.length ? (
            <>
              {/* <AnimatePresence initial={false}>
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



          </AnimatePresence> */}
              <div className="flex flex-col ">
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
                              value={editingMessage?.content}
                              onChange={(e) =>
                                setEditingMessage({
                                  ...editingMessage as any,
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
                                value={editingMessage?.content}
                                onChange={(e) =>
                                  setEditingMessage({
                                    ...editingMessage as any,
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
                </div>


              </div>
            </>


          ) :

            <div className="flex items-center justify-center gap-2 text-xl font-semibold h-full">
              How can I help you?
            </div>
          }

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="w-full max-w-2xl mt-4">
          <ChatInput onSend={handleSendMessage} isPending={isPending} config={config} setConfig={handleConfig} setParameters={handleParameters} setContext={handleContext} />
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