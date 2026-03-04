import React from "react"
import { Button, Badge } from "@medusajs/ui"
import { PencilSquare, CloudArrowUp, XMark, Plus } from "@medusajs/icons"
import { DashboardTab } from "../types"

interface DashboardHeaderProps {
  tabs: DashboardTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  isEditing: boolean
  onEditToggle: () => void
  onSave: () => void
  onDiscard: () => void
  isSaving: boolean
  pendingChangesCount: number
  onCreateTab: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  isEditing,
  onEditToggle,
  onSave,
  onDiscard,
  isSaving,
  pendingChangesCount,
  onCreateTab,
}) => {
  return (
    <div className="border-b border-ui-border-base bg-ui-bg-base sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTabId === tab.id
                    ? 'border-ui-fg-base text-ui-fg-base'
                    : 'border-transparent hover:border-ui-border-base text-ui-fg-subtle'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="secondary" onClick={onEditToggle}>
                <PencilSquare className="w-4 h-4" />
                Edit Dashboard
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onDiscard} disabled={isSaving}>
                  <XMark className="w-4 h-4" /> Discard
                </Button>
                <Button
                  variant="primary"
                  onClick={onSave}
                  isLoading={isSaving}
                  disabled={pendingChangesCount === 0}
                >
                  <CloudArrowUp className="w-4 h-4" />
                  Save {pendingChangesCount > 0 ? `(${pendingChangesCount})` : ''}
                </Button>
                <Button variant="secondary" onClick={onCreateTab} size="small">
                  <Plus className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}