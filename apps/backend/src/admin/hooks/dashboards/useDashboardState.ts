import { useState, useEffect, useCallback } from "react"
import { DashboardTab, PendingChange, PendingChangeType } from "../../../types/dashboards"
import { loadDashboardFromStorage, saveDashboardToStorage, loadPendingChanges, savePendingChanges, clearPendingChanges } from "../../utils/dashboards/storage"
import { useExecution } from "../../hooks/api/actions"
import { toast } from "@medusajs/ui"

export const useDashboardState = () => {
  const { data: dashboardData, refetch: getDashboardTabs, isPending: isDashboardLoading } = 
    useExecution('get-dashboard-tabs')

  const [tabs, setTabs] = useState<DashboardTab[]>([])
  const [savedTabs, setSavedTabs] = useState<DashboardTab[]>([])
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTabId, setActiveTabId] = useState<string>("")

  // Initialize tabs from API or localStorage
  useEffect(() => {
    const loadInitialTabs = async () => {
      if (dashboardData?.success && dashboardData?.data?.length) {
        setTabs(dashboardData.data)
        setSavedTabs(dashboardData.data)
        setActiveTabId(dashboardData.data[0]?.id || "")
      } else {
        const stored = loadDashboardFromStorage()
        if (stored) {
          setTabs(stored)
          setSavedTabs(stored)
          setActiveTabId(stored[0]?.id || "")
        }
      }
    }
    
    loadInitialTabs()
  }, [dashboardData])

  // Load pending changes
  useEffect(() => {
    const changes = loadPendingChanges()
    if (changes.length > 0) {
      setPendingChanges(changes)
    }
  }, [])

  // Save to localStorage whenever tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      saveDashboardToStorage(tabs)
    }
  }, [tabs])

  // Save pending changes to localStorage
  useEffect(() => {
    if (pendingChanges.length > 0) {
      savePendingChanges(pendingChanges)
    }
  }, [pendingChanges])

  const fetchTabs = useCallback(async () => {
    await getDashboardTabs()
  }, [getDashboardTabs])

  const addPendingChange = useCallback((
    type: PendingChangeType,
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
    setPendingChanges(prev => [...prev, newChange])
  }, [])

  const updateTabs = useCallback((
    updater: (tabs: DashboardTab[]) => DashboardTab[]
  ) => {
    setTabs(updater)
  }, [])

  const saveChanges = useCallback(async () => {
    if (pendingChanges.length === 0) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setPendingChanges([])
      setSavedTabs(tabs)
      setIsEditing(false)
      clearPendingChanges()
      
      toast.success(`Saved ${pendingChanges.length} change${pendingChanges.length > 1 ? 's' : ''} successfully`)
    } catch (error) {
      toast.error("Failed to save changes")
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }, [pendingChanges, tabs])

  const discardChanges = useCallback(() => {
    setTabs(savedTabs)
    setPendingChanges([])
    setIsEditing(false)
    clearPendingChanges()
    toast.info("All changes discarded")
  }, [savedTabs])

  return {
    tabs,
    savedTabs,
    pendingChanges,
    isEditing,
    isSaving,
    isDashboardLoading,
    activeTabId,
    setActiveTabId,
    setIsEditing,
    addPendingChange,
    updateTabs,
    saveChanges,
    discardChanges,
    fetchTabs,
  }
}