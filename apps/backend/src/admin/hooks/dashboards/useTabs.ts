import { useState, useEffect, useCallback, useMemo } from "react"
import { DashboardTab, Widget, findFirstAvailablePosition } from "../../components/dashboard/types"
import { transformApiDataToTabs, generateId } from "../../components/dashboard/utils"
import { DASHBOARD_STORAGE_KEY } from "../../components/dashboard/constants"
import { PendingChange } from "./usePendingChanges"
import { toast } from "@medusajs/ui"

interface UseTabsProps {
  dashboardData: any
  refetchTabs: () => Promise<any>
  createTab: (data: any) => Promise<any>
  deleteTab: (data: any) => Promise<any>
  addPendingChange: (type: PendingChange['type'], tabId: string, data: any, widgetId?: string) => void
}

export const useTabs = ({
  dashboardData,
  refetchTabs,
  createTab,
  deleteTab,
  addPendingChange,
}: UseTabsProps) => {
  const [tabs, setTabs] = useState<DashboardTab[]>([])
  const [savedTabs, setSavedTabs] = useState<DashboardTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage as fallback
  useEffect(() => {
    if (!isInitialized) {
      try {
        const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
        if (saved) {
          const parsedTabs = JSON.parse(saved)
          setTabs(parsedTabs)
          setSavedTabs(parsedTabs)
          
          if (parsedTabs.length > 0 && !activeTabId) {
            setActiveTabId(parsedTabs[0].id)
          }
        }
      } catch (error) {
        console.error("Failed to load from localStorage:", error)
      }
    }
  }, [isInitialized, activeTabId])

  // Process API data when it arrives
  useEffect(() => {
    if (dashboardData?.data) {
      const transformedTabs = transformApiDataToTabs(dashboardData)
      
      setTabs(transformedTabs)
      setSavedTabs(transformedTabs)
      
      // Set active tab
      if (transformedTabs.length > 0) {
        setActiveTabId(prev => {
          if (prev && transformedTabs.some(t => t.id === prev)) {
            return prev
          }
          return transformedTabs[0].id
        })
      }
      
      setIsInitialized(true)
      
      // Save to localStorage as backup
      try {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(transformedTabs))
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
      }
    }
  }, [dashboardData])

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId)
  }, [tabs, activeTabId])

  const handleCreateTab = useCallback(async (tabData: any) => {
    if (!tabData.title?.trim()) {
      toast.error("Please enter a tab title")
      return false
    }

    try {
      // Prepare widgets with positions
      const newWidgets = tabData.widgets?.map((widget: any, index: number) => {
        const position = findFirstAvailablePosition(
          newWidgets || [],
          tabData.layout?.columns || 12,
          4,
          2
        )
        
        return {
          ...widget,
          id: widget.id || generateId('widget'),
          type: widget.type,
          title: widget.title,
          size: widget.size || "medium",
          position,
          config: widget.config || {},
        }
      }) || []

      // Create tab in API
      await createTab({
        parameters: {
          label: tabData.title,
          description: tabData.description,
          configuration: {
            layout: tabData.layout || {
              columns: 12,
              rowHeight: 100,
              gap: 16,
            },
            widgets: newWidgets,
          },
        },
      })

      // Refetch to get updated list
      await refetchTabs()
      
      toast.success("Tab created successfully")
      return true
    } catch (error) {
      toast.error("Failed to create tab")
      console.error("Create tab error:", error)
      return false
    }
  }, [createTab, refetchTabs])

  const handleUpdateTab = useCallback((editingTab: DashboardTab | null, updateData: any) => {
    if (!editingTab || !updateData.title?.trim()) {
      toast.error("Please enter a tab title")
      return false
    }

    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== editingTab.id) return tab
      
      // Update widgets with new positions if provided
      const updatedWidgets = updateData.widgets?.map((widget: any) => {
        const existingWidget = tab.widgets.find(w => w.id === widget.id)
        return {
          ...widget,
          position: existingWidget?.position || widget.position || { x: 0, y: 0, w: 4, h: 2 },
        }
      }) || tab.widgets

      return {
        ...tab,
        title: updateData.title,
        description: updateData.description,
        widgets: updatedWidgets,
      }
    }))

    // Add pending change
    addPendingChange(
      'update',
      editingTab.id,
      {
        title: updateData.title,
        description: updateData.description,
        widgets: updateData.widgets,
      }
    )

    toast.success("Tab updated")
    return true
  }, [addPendingChange])

  const handleDeleteTab = useCallback(async (tabId: string) => {
    try {
      await deleteTab({ parameters: { id: tabId } })
      await refetchTabs()

      setTabs(prev => {
        const newTabs = prev.filter(t => t.id !== tabId)
        
        if (activeTabId === tabId && newTabs.length > 0) {
          setActiveTabId(newTabs[0].id)
        }
        
        return newTabs
      })

      addPendingChange('delete', tabId, { tabId })
      toast.success("Tab deleted")
      return true
    } catch (error) {
      toast.error("Failed to delete tab")
      console.error("Delete tab error:", error)
      return false
    }
  }, [deleteTab, refetchTabs, activeTabId, addPendingChange])

  const reorderTabs = useCallback((startIndex: number, endIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev]
      const [removed] = newTabs.splice(startIndex, 1)
      newTabs.splice(endIndex, 0, removed)
      
      // Add pending change for reorder
      addPendingChange('update', 'layout', { reordered: newTabs.map(t => t.id) })
      
      return newTabs
    })
  }, [addPendingChange])

  return {
    tabs,
    setTabs,
    savedTabs,
    setSavedTabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    isInitialized,
    handleCreateTab,
    handleUpdateTab,
    handleDeleteTab,
    reorderTabs,
  }
}