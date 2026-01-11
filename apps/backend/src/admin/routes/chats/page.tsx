"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import {
  Avatar,
  Button,
  Input,
  // ScrollArea,
  Badge,
  Text,
  IconButton,
  FocusModal,
} from "@medusajs/ui"
import {
  ArrowLeftMini,
  ChatBubbleLeftRight,
  EllipsisHorizontal,
  MagnifyingGlassMini,
  PlusMini,
} from "@medusajs/icons"

import { NewChat } from "./components/new-chat"
import type { ChatUser, Convo } from "./data/chat-types"
import { conversations } from "./data/convo.json"
// import { ScrollArea } from "@/components/ui/scroll-area"

const Chats = () => {
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState("")
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [mobileUser, setMobileUser] = useState<ChatUser | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)

  const users = useMemo(
    () => conversations.map(({ messages, ...u }) => u),
    []
  )

  const filteredChats = useMemo(
    () =>
      conversations.filter((c) =>
        c.fullName.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const groupedMessages = useMemo(() => {
    if (!selectedUser) return null

    return selectedUser.messages.reduce<Record<string, Convo[]>>(
      (acc, msg) => {
        const key = format(new Date(msg.timestamp), "d MMM yyyy")
        acc[key] ??= []
        acc[key].push(msg)
        return acc
      },
      {}
    )
  }, [selectedUser])

  return (
    <>
      <section className="flex h-full gap-6">
        {/* ================= LEFT SIDEBAR ================= */}
        <div className="flex w-72 flex-col border-r border-ui-border-base">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Text weight="plus">Inbox</Text>
              <ChatBubbleLeftRight />
            </div>
            <IconButton onClick={() => setNewChatOpen(true)}>
              <PlusMini />
            </IconButton>
          </div>

          <div className="px-4 pb-2">
            <Input
              placeholder="Search chat…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // prefix={<MagnifyingGlassMini />}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4">
            {filteredChats.map((chat) => {
              const last = chat.messages[0]
              return (
                <button
                  key={chat.id}
                  onClick={() => {
                    setSelectedUser(chat)
                    setMobileUser(chat)
                  }}
                  className={`flex w-full gap-3 rounded-md px-3 py-2 text-left hover:bg-ui-bg-subtle ${
                    selectedUser?.id === chat.id && "bg-ui-bg-subtle"
                  }`}
                >
                  <Avatar src={chat.profile} fallback={chat.username} />
                  <div className="flex flex-col overflow-hidden">
                    <Text size="small" weight="plus">
                      {chat.fullName}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted truncate">
                      {last.sender === "You"
                        ? `You: ${last.message}`
                        : last.message}
                    </Text>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ================= CHAT PANEL ================= */}
        {selectedUser ? (
          <div className="flex flex-1 flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <IconButton
                  className="sm:hidden"
                  onClick={() => setMobileUser(null)}
                >
                  <ArrowLeftMini />
                </IconButton>
                <Avatar
                  src={selectedUser.profile}
                  fallback={selectedUser.username}
                />
                <div>
                  <Text weight="plus">{selectedUser.fullName}</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {selectedUser.title}
                  </Text>
                </div>
              </div>

              <IconButton>
                <EllipsisHorizontal />
              </IconButton>
            </div>

            {/* Messages */}
<div className="flex-1 overflow-y-auto px-4">
              {groupedMessages &&
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date} className="space-y-3">
                    <Text
                      size="xsmall"
                      className="text-center text-ui-fg-muted"
                    >
                      {date}
                    </Text>
                    {msgs.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          m.sender === "You"
                            ? "ml-auto bg-ui-bg-interactive text-ui-fg-on-color"
                            : "bg-ui-bg-subtle"
                        }`}
                      >
                        {m.message}
                        <div className="mt-1 text-right text-[10px] opacity-70">
                          {format(new Date(m.timestamp), "h:mm a")}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            {/* Composer */}
            <form
              className="flex gap-2 border-t p-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!message.trim()) return

                const msg = {
                  sender: "You",
                  message,
                  timestamp: new Date().toISOString(),
                }

                const updated = {
                  ...selectedUser,
                  messages: [msg, ...selectedUser.messages],
                }

                setSelectedUser(updated)
                setMobileUser(updated)
                setMessage("")
              }}
            >
              <Input
                placeholder="Type a message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button type="submit">
                <PaperClip />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <ChatBubbleLeftRight className="h-8 w-8" />
            <Text weight="plus">Your messages</Text>
            <Text size="small" className="text-ui-fg-muted">
              Select a conversation or start a new one
            </Text>
            <Button onClick={() => setNewChatOpen(true)}>
              Start new chat
            </Button>
          </div>
        )}
      </section>

      {/* ================= NEW CHAT MODAL ================= */}
      <NewChat
        users={users as any}
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
      />
    </>
  )
}


export const config = defineRouteConfig({
  label: "Chats",
})


export default Chats
