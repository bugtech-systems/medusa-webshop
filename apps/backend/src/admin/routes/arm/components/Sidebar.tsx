"use client"

import { PanelLeft, Plus, MoreHorizontal, Pencil, Pin, Share, Trash2 } from "lucide-react"
import { useSidebar } from "../../../lib/context/sidebar-context"
import clsx from "clsx"
import { useExecuteAction } from "../../../hooks/api/actions"
import { useEffect, useState } from "react"

export default function Sidebar() {
  const { open, toggle } = useSidebar()

  const [conversations, setConversations] = useState<any[]>([])
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const {
    mutateAsync: fetchConversations,
    isPending: isLoading,
  } = useExecuteAction("get-conversation-query")

  const handleConversations = async () => {
    const res = await fetchConversations({}) as any

    if (res?.success) {
      const { data } = res.data
      setConversations(data || [])
    }
  }

  useEffect(() => {
    if (open) handleConversations()
  }, [open])

  const grouped = {
    today: conversations.filter(c => c.group === "today"),
    yesterday: conversations.filter(c => c.group === "yesterday"),
    week: conversations.filter(c => c.group === "week"),
  }
  
  console.log(conversations, 'wew')

  return (
    <>
      {/* Floating Button */}
      <div
        className={clsx(
          "fixed top-16 right-6 z-40 flex items-center gap-2 transition-all duration-300",
          open
            ? "opacity-0 pointer-events-none translate-x-10"
            : "opacity-100 translate-x-0"
        )}
      >
        <div className="flex rounded-full border bg-white shadow-sm">
          <button
            onClick={toggle}
            className="p-2 hover:bg-neutral-100 rounded-full"
          >
            <PanelLeft size={18} />
          </button>

          <button className="p-2 hover:bg-neutral-100 rounded-full">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-40 w-72 bg-white border-l transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <PanelLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <img
              src="/static/alayon.jpg"
              className="w-7 h-7 rounded-full"
            />
            <span className="font-semibold text-blue-600">
              Alayon
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button className="w-full flex items-center justify-center gap-2 rounded-xl border bg-white hover:bg-neutral-50 py-2 text-sm font-medium shadow-sm"
          onClick={() => 
          {
          window.location.href = `/app/arm/relations`
          }
          }
          >
            <Plus size={16} />
            New chat
            <span className="text-xs text-neutral-400 ml-auto">
              Ctrl + J
            </span>
          </button>
        </div>

        {/* Conversations */}
        <div className="px-3 pb-6 space-y-4 text-sm">
        {conversations.map(convo => <MenuItem label={String(convo.id).substring(0, 30)} onClick={() => {
          window.location.href = `/app/arm/relations/${convo.id}`
        }}/>)}
          <ConversationGroup
            title="Today"
            items={grouped.today}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />

          <ConversationGroup
            title="Yesterday"
            items={grouped.yesterday}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />

          <ConversationGroup
            title="7 Days"
            items={grouped.week}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />

          {isLoading && (
            <div className="text-xs text-neutral-400 px-2">
              Loading conversations...
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function ConversationGroup({ title, items, activeMenu, setActiveMenu }: any) {
  if (!items?.length) return null

  return (
    <div>
      <div className="px-2 text-xs text-neutral-400 mb-1">
        {title}
      </div>

      <div className="space-y-1">
        {items.map((conv: any) => (
          <div
            key={conv.id}
            className="group flex items-center rounded-lg px-2 py-2 hover:bg-neutral-100 cursor-pointer"
          >
            <span className="truncate flex-1">
              {conv.title}
            </span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMenu(activeMenu === conv.id ? null : conv.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded-md transition"
              >
                <MoreHorizontal size={16} />
              </button>

              {activeMenu === conv.id && (
                <div className="absolute right-0 top-6 w-40 bg-white border rounded-xl shadow-lg p-1 text-sm">
                  <MenuItem icon={<Pencil size={14} />} label="Rename" />
                  <MenuItem icon={<Pin size={14} />} label="Pin" />
                  <MenuItem icon={<Share size={14} />} label="Share" />
                  <MenuItem
                    icon={<Trash2 size={14} />}
                    label="Delete"
                    danger
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuItem({ icon, label, danger, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-neutral-100 text-left",
        danger && "text-red-500 hover:bg-red-50"
      )}
    >
      {icon}
      {label}
    </button>
  )
}
