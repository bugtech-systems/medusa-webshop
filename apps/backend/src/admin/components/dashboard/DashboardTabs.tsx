import React, { useState } from "react"
import { Tabs, Button, Input, IconButton, Drawer } from "@medusajs/ui"
import { Pencil, Trash, Plus, EllipsisVertical } from "@medusajs/icons"
import { DashboardTab } from "./DashboardContainer"

interface DashboardTabsProps {
  tabs: DashboardTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabAdd: () => void
  onTabUpdate: (tabId: string, title: string) => void
  onTabDelete: (tabId: string) => void
  isEditing: boolean
}

export const DashboardTabs = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabAdd,
  onTabUpdate,
  onTabDelete,
  isEditing,
}: DashboardTabsProps) => {
  const [editingTab, setEditingTab] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const handleEditStart = (tab: DashboardTab) => {
    setEditingTab(tab.id)
    setEditValue(tab.title)
  }

  const handleEditSave = (tabId: string) => {
    if (editValue.trim()) {
      onTabUpdate(tabId, editValue.trim())
    }
    setEditingTab(null)
  }

  const handleDeleteClick = (tabId: string) => {
    setShowDeleteConfirm(tabId)
  }

  const handleDeleteConfirm = (tabId: string) => {
    onTabDelete(tabId)
    setShowDeleteConfirm(null)
  }

  return (
    <>
      <div className="flex items-center justify-between border-b">
        <Tabs value={activeTabId} onValueChange={onTabChange} className="flex-1">
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id}>
                {editingTab === tab.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleEditSave(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(tab.id)
                      if (e.key === "Escape") setEditingTab(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-32"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{tab.title}</span>
                    {isEditing && (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditStart(tab)
                          }}
                        >
                          <Pencil />
                        </IconButton>
                        <IconButton
                          size="small"
                          variant="transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(tab.id)
                          }}
                        >
                          <Trash />
                        </IconButton>
                      </div>
                    )}
                  </div>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>

        {isEditing && (
          <Button variant="secondary" size="small" onClick={onTabAdd}>
            <Plus />
            Add Tab
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Drawer open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Delete Tab</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <p>Are you sure you want to delete this tab? This action cannot be undone.</p>
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => showDeleteConfirm && handleDeleteConfirm(showDeleteConfirm)}
            >
              Delete
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  )
}   