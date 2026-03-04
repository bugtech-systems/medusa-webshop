import { useState, useCallback } from "react"
import { PENDING_CHANGES_KEY } from "../../components/dashboard/constants"

export interface PendingChange {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'resize'
  tabId: string
  widgetId?: string
  data: any
  timestamp: number
}

export const usePendingChanges = () => {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem(PENDING_CHANGES_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error("Failed to load pending changes:", error)
      return []
    }
  })

  const addPendingChange = useCallback((
    type: PendingChange['type'],
    tabId: string,
    data: any,
    widgetId?: string
  ) => {
    const newChange: PendingChange = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      tabId,
      widgetId,
      data,
      timestamp: Date.now(),
    }
    
    setPendingChanges(prev => {
      const updated = [...prev, newChange]
      // Save to localStorage
      try {
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error("Failed to save pending changes:", error)
      }
      return updated
    })
    
    return newChange
  }, [])

  const removePendingChange = useCallback((changeId: string) => {
    setPendingChanges(prev => {
      const updated = prev.filter(change => change.id !== changeId)
      try {
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error("Failed to save pending changes:", error)
      }
      return updated
    })
  }, [])

  const clearPendingChanges = useCallback(() => {
    setPendingChanges([])
    try {
      localStorage.removeItem(PENDING_CHANGES_KEY)
    } catch (error) {
      console.error("Failed to clear pending changes:", error)
    }
  }, [])

  const getPendingChangesForTab = useCallback((tabId: string) => {
    return pendingChanges.filter(change => change.tabId === tabId)
  }, [pendingChanges])

  const getPendingChangesForWidget = useCallback((widgetId: string) => {
    return pendingChanges.filter(change => change.widgetId === widgetId)
  }, [pendingChanges])

  const hasPendingChanges = useCallback((tabId?: string, widgetId?: string) => {
    if (tabId && widgetId) {
      return pendingChanges.some(change => change.tabId === tabId && change.widgetId === widgetId)
    }
    if (tabId) {
      return pendingChanges.some(change => change.tabId === tabId)
    }
    return pendingChanges.length > 0
  }, [pendingChanges])

  return {
    pendingChanges,
    addPendingChange,
    removePendingChange,
    clearPendingChanges,
    getPendingChangesForTab,
    getPendingChangesForWidget,
    hasPendingChanges,
  }
}