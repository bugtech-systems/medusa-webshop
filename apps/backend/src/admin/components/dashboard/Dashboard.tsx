"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Container,
  Heading,
  Text as UiText,
  Tabs,
  Button,
  Badge,
  Toaster,
  FocusModal,
  Input,
  Label,
  Select,
  Textarea,
  useToggleState,
  toast,
  Tooltip,
} from "@medusajs/ui"
import {
  Plus,
  SquaresPlus,
  Check,
  XMark,
  PencilSquare,
  CloudArrowUp,
  Clock,
  ArrowsPointingOut,
} from "@medusajs/icons"
import { DashboardTab, Widget, WidgetPosition, findFirstAvailablePosition, findAffectedWidgets, isValidPosition, calculateSwapPositions, getDropIndicatorStyle, checkCollision } from "./types"
import { DraggableWidget } from "./DraggableWidget"
import { widgetRegistry } from "./widgets"
import {
  useDashboard,
  useCreateDashboardTab,
  useUpdateDashboardTab,
  useDeleteDashboardTab,
  useCreateWidget,
  useUpdateWidget,
  useUpdateWidgetPosition,
  useDeleteWidget,
  useDuplicateWidget,
  useUpdateDashboardLayout,
  useWidgetTemplates
} from "../../hooks/api/dashboards"
import { useExecuteAction, useExecution } from "../../hooks/api/actions"
import { CreateTabModal } from "./modals/CreateTabModal"
import { EditTabModal } from "./modals/EditTabModal"
import { AddWidgetModal } from "./modals/AddWidgetModal"
import { EditWidgetModal } from "./modals/EditWidgetModal"

// Storage key for localStorage
const DASHBOARD_STORAGE_KEY = "dashboard-config"
const PENDING_CHANGES_KEY = "dashboard-pending"

interface DashboardProps {
  initialTabs?: DashboardTab[]
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Animation frame throttling for smooth rendering
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export const Dashboard: React.FC<DashboardProps> = ({}) => {
   const {data: dashboardData, refetch: getDashboardTabs, isPending: isDashboardLoading} = useExecution('get-dashboard-tabs'); 
   const { isPending: isCreateLoading, mutateAsync: createTab } = useExecuteAction('create-action-view');  
   const { mutateAsync: bulkUpdateDashboard } = useUpdateDashboardLayout();

  // Load from localStorage first, then fallback to initialTabs
  const loadInitialTabs = useCallback((): DashboardTab[] => {
    try {
      const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
      
      if(dashboardData?.data){
       let newTabs = dashboardData?.data ? dashboardData?.data.map(tab => ({...tab, ...tab.configuration, title: tab.label, description: tab.description})) : []
        
       console.log(dashboardData?.data, newTabs, 'NEWWW TABSS')
       return newTabs
      } else if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load dashboard from localStorage:", error)
    }
     
    


    return []
  }, [dashboardData])

  // Load pending changes from localStorage
  const loadPendingChanges = useCallback((): any => {
    try {
      const saved = localStorage.getItem(PENDING_CHANGES_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load pending changes:", error)
    }
    return []
  }, [])

  // React Query hooks
  // const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard({
  //   initialData: { tabs: loadInitialTabs() },
  // })


  // State for tracking changes
  const [tabs, setTabs] = useState<DashboardTab[]>(loadInitialTabs())
  const [savedTabs, setSavedTabs] = useState<DashboardTab[]>(loadInitialTabs())
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(loadPendingChanges())
  const [isEditing, setIsEditing] = useState(false)
  const [activeTabId, setActiveTabId] = useState<string>(
    (dashboardData?.data) ? (dashboardData?.data[0]?.id) : loadInitialTabs()[0]?.id || ""
  )


  const [isInitialRender, setIsInitialRender] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Drag state
  const [draggingWidget, setDraggingWidget] = useState<{
    widget: Widget
    startX: number
    startY: number
    startPos: WidgetPosition
    offsetX: number
    offsetY: number
    ghostPosition: WidgetPosition
  } | null>(null)
  
  // Resize state
  const [resizingWidget, setResizingWidget] = useState<{
    widget: Widget
    direction: string
    axis: 'x' | 'y' | 'both'
    startX: number
    startY: number
    startPos: WidgetPosition
    ghostPosition: WidgetPosition
  } | null>(null)

  // Grid container ref
  const gridRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>()

  // Modal states
  const createTabModal = useToggleState()
  const editTabModal = useToggleState()
  const editWidgetModal = useToggleState()
  const addWidgetModal = useToggleState()
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [editingTab, setEditingTab] = useState<DashboardTab | null>(null)
  const [newTabTitle, setNewTabTitle] = useState("")
  const [newTabDescription, setNewTabDescription] = useState("")
  const [selectedWidgetType, setSelectedWidgetType] = useState<string>("stat")

  const activeTab = tabs.find(t => t.id === activeTabId)
  console.log(activeTab, 'ACTIVE TAB')

  // Grid settings
  const gridColumns = activeTab?.layout.columns || 12
  const rowHeight = activeTab?.layout.rowHeight || 100
  const gap = activeTab?.layout.gap || 16


  console.log(tabs, 'TAABBS')


  // Save to localStorage whenever tabs or pending changes change
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(tabs))
    } catch (error) {
      console.error("Failed to save dashboard to localStorage:", error)
    }
  }, [tabs])

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges))
    } catch (error) {
      console.error("Failed to save pending changes to localStorage:", error)
    }
  }, [pendingChanges])


  // Mark initial render as complete after first render
  useEffect(() => {
    setIsInitialRender(false)
    hanldeInitialTabs()
  }, [])



  // Add event listeners
  useEffect(() => {
    if ((draggingWidget || resizingWidget) && isEditing) {
      window.addEventListener("mousemove", draggingWidget ? handleDragMove : handleResizeMove)
      window.addEventListener("mouseup", handleDragEnd)
      return () => {
        window.removeEventListener("mousemove", draggingWidget ? handleDragMove : handleResizeMove)
        window.removeEventListener("mouseup", handleDragEnd)
      }
    }
  }, [draggingWidget, resizingWidget, isEditing])


  // Save all pending changes in bulk
  const handleSave = async () => {
    if (pendingChanges.length === 0) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    
    try {
      // Group changes by type for efficient processing
      const bulkUpdate = {
        tabs,
        pendingChanges,
      }

      // await updateLayout(bulkUpdate)
      console.log(bulkUpdate, 'BULK UPDATEEs');

      let newTabs = tabs.map((tab: any) => ({id: tab.id, label: tab.title, description: tab.description, configuration: { ...tab.configuration, layout: tab.layout, widgets: tab.widgets }}))

      await bulkUpdateDashboard(newTabs);
      // Clear pending changes after successful save
      setPendingChanges([])
      setSavedTabs(tabs)
      setIsEditing(false)
      
      // Clear localStorage pending changes
      localStorage.removeItem(PENDING_CHANGES_KEY)
      
      toast.success(`Saved ${pendingChanges.length} change${pendingChanges.length > 1 ? 's' : ''} successfully`)
    } catch (error) {
      toast.error("Failed to save changes")
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Discard all pending changes
  const handleDiscard = () => {
    // Revert to last saved state
    setTabs(savedTabs)
    setPendingChanges([])
    setIsEditing(false)
    
    // Clear pending changes from localStorage
    localStorage.removeItem(PENDING_CHANGES_KEY)
    
    toast.info("All changes discarded")
  }


  const hanldeInitialTabs = async () => {
    let {data: res} = await getDashboardTabs();

    console.log(res, 'RRs')
    if(res.data){
    let newTabs = res?.data ? res?.data.map(tab => ({...tab, ...tab.configuration, title: tab.label, description: tab.description})) : []
    setTabs(newTabs)
    setActiveTabId(res?.data[0]?.id)
    }
  }

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(tabs))
    } catch (error) {
      console.error("Failed to save dashboard to localStorage:", error)
    }
  }, [tabs])

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges))
    } catch (error) {
      console.error("Failed to save pending changes to localStorage:", error)
    }
  }, [pendingChanges])



  // Add pending change
  const addPendingChange = useCallback((
    type: any['type'],
    tabId: string,
    data: any,
    widgetId?: string
  ) => {
    const newChange: any = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      tabId,
      widgetId,
      data,
      timestamp: Date.now(),
    }
    setPendingChanges(prev => [...prev, newChange])
  }, [])

  // Calculate grid metrics with high precision
  const getGridMetrics = useCallback(() => {
    if (!gridRef.current) return { colWidth: 0, totalWidth: 0, colWidthPx: 0 }
    
    const containerWidth = gridRef.current.clientWidth
    const totalGapWidth = gap * (gridColumns - 1)
    const colWidth = (containerWidth - totalGapWidth) / gridColumns
    
    return { 
      colWidth, 
      totalWidth: containerWidth,
      colWidthPx: colWidth 
    }
  }, [gridColumns, gap])

  const gridMetrics = useMemo(() => getGridMetrics(), [getGridMetrics, activeTab?.widgets])

  // Convert pixel to grid with sub-pixel precision
  const pixelsToGrid = useCallback((x: number, y: number) => {
    const { colWidth } = gridMetrics
    const gridX = Math.round(x / (colWidth + gap))
    const gridY = Math.round(y / (rowHeight + gap))
    return { gridX, gridY }
  }, [gridMetrics, rowHeight, gap])

  // Calculate widget style with smooth transitions
  const getWidgetStyle = useCallback((
    widget: Widget, 
    isGhost: boolean = false,
    customPosition?: WidgetPosition
  ) => {
    const { colWidth } = gridMetrics
    const pos = customPosition || widget.position
    
    const style = {
      position: "absolute" as const,
      left: pos.x * (colWidth + gap),
      top: pos.y * (rowHeight + gap),
      width: pos.w * colWidth + (pos.w - 1) * gap,
      height: pos.h * rowHeight + (pos.h - 1) * gap,
    }

    if (isGhost) {
      return {
        ...style,
        transition: 'all 0.1s ease-out',
        pointerEvents: 'none' as const,
        zIndex: 100,
      }
    }

    return {
      ...style,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }, [gridMetrics, rowHeight, gap])

// Enhanced drag start with affected widgets calculation
const handleDragStart = (e: React.MouseEvent, widget: Widget) => {
  if (!isEditing) return
  e.preventDefault()
  e.stopPropagation()
  
  const widgetElement = e.currentTarget.closest('.absolute')
  if (!widgetElement || !gridRef.current) return
  
  const widgetRect = widgetElement.getBoundingClientRect()
  const gridRect = gridRef.current.getBoundingClientRect()
  
  const offsetX = e.clientX - widgetRect.left
  const offsetY = e.clientY - widgetRect.top
  
  setDraggingWidget({
    widget,
    startX: e.clientX,
    startY: e.clientY,
    startPos: { ...widget.position },
    offsetX,
    offsetY,
    ghostPosition: { ...widget.position },
    isValidDrop: true,
    affectedWidgets: [],
    swapPreview: new Map(),
  })
}

// Throttled drag move with proper size swapping
const handleDragMove = useCallback(
  throttle((e: MouseEvent) => {
    if (!draggingWidget || !activeTab || !gridRef.current || !isEditing) return

    // Cancel previous animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const gridRect = gridRef.current!.getBoundingClientRect()
      
      const newLeft = e.clientX - gridRect.left - draggingWidget.offsetX
      const newTop = e.clientY - gridRect.top - draggingWidget.offsetY
      
      const { gridX, gridY } = pixelsToGrid(newLeft, newTop)
      
      const maxX = gridColumns - draggingWidget.widget.position.w
      const newGridX = Math.max(0, Math.min(maxX, gridX))
      const newGridY = Math.max(0, gridY)

      const ghostPosition = {
        x: newGridX,
        y: newGridY,
        w: draggingWidget.widget.position.w,
        h: draggingWidget.widget.position.h
      }

      // Find overlapping widgets
      const otherWidgets = activeTab!.widgets.filter(w => w.id !== draggingWidget.widget.id)
      const overlappingWidget = otherWidgets.find(w => 
        checkCollision(ghostPosition, w.position)
      )

      // Check if position is valid
      const isValid = isValidPosition(
        activeTab!.widgets,
        draggingWidget.widget.id,
        ghostPosition,
        gridColumns
      )

      let swapPreview = new Map<string, WidgetPosition>()
      let affectedWidgets: Widget[] = []

      if (overlappingWidget && isValid) {
        // Calculate swap with full size consideration
        const { newPositions, isValid: canSwap, affectedWidgets: affected } = calculateSwapPositions(
          activeTab!.widgets,
          draggingWidget.widget,
          overlappingWidget,
          gridColumns
        )
        
        if (canSwap) {
          swapPreview = newPositions
          affectedWidgets = affected

          // Apply swap preview immediately with full widget properties
          setTabs(prev => prev.map(tab => {
            if (tab.id !== activeTabId) return tab
            return {
              ...tab,
              widgets: tab.widgets.map(w => {
                const newPos = swapPreview.get(w.id)
                if (newPos) {
                  // When swapping, we keep the widget's own dimensions
                  // The position might change but dimensions stay with the widget
                  return { 
                    ...w, 
                    position: { 
                      x: newPos.x, 
                      y: newPos.y,
                      w: w.position.w, // Keep widget's own width
                      h: w.position.h  // Keep widget's own height
                    } 
                  }
                }
                return w
              })
            }
          }))
        }
      }

      setDraggingWidget(prev => prev ? {
        ...prev,
        ghostPosition,
        isValidDrop: isValid,
        affectedWidgets: affectedWidgets,
        swapPreview,
      } : null)
    })
  }, 16), // ~60fps
  [draggingWidget, activeTab, gridColumns, pixelsToGrid, activeTabId]
)

// Handle drag end with final position calculation
const handleDragEnd = useCallback(() => {
  if (!draggingWidget || !activeTab || !isEditing) {
    setDraggingWidget(null)
    return
  }

  // Apply final positions if swap preview exists
  if (draggingWidget.swapPreview.size > 0) {
    // Add pending changes for swapped widgets with their new positions
    draggingWidget.swapPreview.forEach((position, widgetId) => {
      // Find the widget to get its dimensions
      const widget = activeTab.widgets.find(w => w.id === widgetId)
      if (widget) {
        addPendingChange(
          'move',
          activeTabId,
          { 
            widgetId, 
            position: {
              x: position.x,
              y: position.y,
              w: widget.position.w, // Preserve widget's own dimensions
              h: widget.position.h
            }
          },
          widgetId
        )
      }
    })

    toast.success("Widgets repositioned")
  } else if (draggingWidget.isValidDrop) {
    // Single widget move
    const widget = activeTab.widgets.find(w => w.id === draggingWidget.widget.id)
    if (widget) {
      // Update local state with final position
      setTabs(prev => prev.map(tab => {
        if (tab.id !== activeTabId) return tab
        return {
          ...tab,
          widgets: tab.widgets.map(w => 
            w.id === draggingWidget.widget.id
              ? { 
                  ...w, 
                  position: {
                    x: draggingWidget.ghostPosition.x,
                    y: draggingWidget.ghostPosition.y,
                    w: w.position.w, // Keep widget's own dimensions
                    h: w.position.h
                  }
                }
              : w
          )
        }
      }))

      addPendingChange(
        'move',
        activeTabId,
        { 
          widgetId: draggingWidget.widget.id,
          position: {
            x: draggingWidget.ghostPosition.x,
            y: draggingWidget.ghostPosition.y,
            w: widget.position.w,
            h: widget.position.h
          }
        },
        draggingWidget.widget.id
      )
    }
  } else {
    // Revert to original position
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return {
        ...tab,
        widgets: tab.widgets.map(w => 
          w.id === draggingWidget.widget.id
            ? { ...w, position: draggingWidget.startPos }
            : w
        )
      }
    }))
  }

  setDraggingWidget(null)
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
  }
}, [draggingWidget, activeTab, isEditing, activeTabId, addPendingChange])

  // Event listeners
  useEffect(() => {
    if (draggingWidget && isEditing) {
      window.addEventListener("mousemove", handleDragMove)
      window.addEventListener("mouseup", handleDragEnd)
      return () => {
        window.removeEventListener("mousemove", handleDragMove)
        window.removeEventListener("mouseup", handleDragEnd)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }
  }, [draggingWidget, isEditing, handleDragMove, handleDragEnd])

  // Resize handlers with similar enhancements
  const handleResizeStart = (e: React.MouseEvent, widget: Widget, direction: string, axis: 'x' | 'y' | 'both' = 'both') => {
    if (!isEditing) return
    e.preventDefault()
    e.stopPropagation()
    setResizingWidget({
      widget,
      direction,
      axis,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { ...widget.position },
      ghostPosition: { ...widget.position },
      isValidDrop: true,
    })
  }

  const handleResizeMove = useCallback(
    throttle((e: MouseEvent) => {
      if (!resizingWidget || !activeTab || !gridRef.current || !isEditing) return

      const deltaX = e.clientX - resizingWidget.startX
      const deltaY = e.clientY - resizingWidget.startY

      const { colWidth } = gridMetrics
      const deltaCols = Math.round(deltaX / (colWidth + gap))
      const deltaRows = Math.round(deltaY / (rowHeight + gap))

      const newPosition = { ...resizingWidget.startPos }

      if (resizingWidget.axis === 'x' || resizingWidget.axis === 'both') {
        if (resizingWidget.direction.includes('e')) {
          newPosition.w = Math.max(1, Math.min(
            gridColumns - newPosition.x,
            resizingWidget.startPos.w + deltaCols
          ))
        }
        if (resizingWidget.direction.includes('w')) {
          const newW = Math.max(1, resizingWidget.startPos.w - deltaCols)
          if (newW !== resizingWidget.startPos.w) {
            newPosition.x = resizingWidget.startPos.x + (resizingWidget.startPos.w - newW)
            newPosition.w = newW
          }
        }
      }

      if (resizingWidget.axis === 'y' || resizingWidget.axis === 'both') {
        if (resizingWidget.direction.includes('s')) {
          newPosition.h = Math.max(1, resizingWidget.startPos.h + deltaRows)
        }
        if (resizingWidget.direction.includes('n')) {
          const newH = Math.max(1, resizingWidget.startPos.h - deltaRows)
          if (newH !== resizingWidget.startPos.h) {
            newPosition.y = resizingWidget.startPos.y + (resizingWidget.startPos.h - newH)
            newPosition.h = newH
          }
        }
      }

      newPosition.x = Math.max(0, Math.min(gridColumns - newPosition.w, newPosition.x))
      newPosition.y = Math.max(0, newPosition.y)

      const isValid = isValidPosition(
        activeTab.widgets,
        resizingWidget.widget.id,
        newPosition,
        gridColumns
      )

      if (isValid) {
        setTabs(prev => prev.map(tab => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            widgets: tab.widgets.map(w => 
              w.id === resizingWidget.widget.id
                ? { ...w, position: newPosition }
                : w
            )
          }
        }))

        setResizingWidget(prev => prev ? {
          ...prev,
          ghostPosition: newPosition,
          isValidDrop: true,
        } : null)
      } else {
        setResizingWidget(prev => prev ? {
          ...prev,
          isValidDrop: false,
        } : null)
      }
    }, 16),
    [resizingWidget, activeTab, gridMetrics, gap, rowHeight, gridColumns, activeTabId]
  )

  const handleResizeEnd = useCallback(() => {
    if (resizingWidget && resizingWidget.isValidDrop) {
      addPendingChange(
        'resize',
        activeTabId,
        { 
          widgetId: resizingWidget.widget.id,
          position: resizingWidget.ghostPosition 
        },
        resizingWidget.widget.id
      )
    }
    setResizingWidget(null)
  }, [resizingWidget, activeTabId, addPendingChange])

  useEffect(() => {
    if (resizingWidget && isEditing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeEnd)
      return () => {
        window.removeEventListener("mousemove", handleResizeMove)
        window.removeEventListener("mouseup", handleResizeEnd)
      }
    }
  }, [resizingWidget, isEditing, handleResizeMove, handleResizeEnd])



  // Render grid with enhanced visual feedback
  const renderGrid = () => {
    if (!activeTab) return null

    return (
      <div 
        ref={gridRef}
        className={`relative min-h-[600px] rounded-lg transition-colors duration-300 ${
          isEditing ? 'bg-ui-bg-subtle' : ''
        }`}
        style={{
          height: `${
            Math.max(...activeTab.widgets.map(w => w.position.y + w.position.h), 1) * (rowHeight + gap)
          }px`,
        }}
      >
        {/* Grid Background */}
        {isEditing && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="h-full w-full opacity-30"
              style={{
                backgroundImage: `linear-gradient(to right, #9CA3AF 1px, transparent 1px), linear-gradient(to bottom, #9CA3AF 1px, transparent 1px)`,
                backgroundSize: `${gridMetrics.colWidth + gap}px ${rowHeight + gap}px`,
              }}
            />
          </div>
        )}

        {/* Drop Zone Indicator */}
        {draggingWidget && isEditing && draggingWidget.affectedWidgets.length > 0 && (
          <div
            className={`absolute ${getDropIndicatorStyle(draggingWidget.isValidDrop)} rounded-lg transition-all duration-200`}
            style={getWidgetStyle(draggingWidget.affectedWidgets[0], true)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowsPointingOut className="w-6 h-6 text-ui-fg-interactive" />
            </div>
          </div>
        )}

      {/* Ghost Widget */}
      {draggingWidget && isEditing && (
        <div
          className={`absolute ${
            draggingWidget.isValidDrop 
              ? 'bg-ui-bg-base/50 border-2 border-dashed border-ui-border-interactive' 
              : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'
          } rounded-lg pointer-events-none backdrop-blur-sm transition-all duration-100`}
          style={getWidgetStyle({ 
            ...draggingWidget.widget, 
            position: draggingWidget.ghostPosition 
          }, true)}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <div className="text-xs bg-ui-bg-base px-2 py-1 rounded shadow-md">
              {draggingWidget.widget.position.w}×{draggingWidget.widget.position.h}
            </div>
          </div>
        </div>
      )}

        {/* Resize Ghost */}
        {resizingWidget && isEditing && (
          <div
            className={`absolute ${
              resizingWidget.isValidDrop
                ? 'bg-ui-bg-base/50 border-2 border-dashed border-ui-border-interactive'
                : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'
            } rounded-lg pointer-events-none backdrop-blur-sm`}
            style={getWidgetStyle({ ...resizingWidget.widget, position: resizingWidget.ghostPosition }, true)}
          />
        )}

        {/* Widgets */}
{activeTab.widgets.map(widget => {
  const hasPendingChange = pendingChanges.some(c => c.widgetId === widget.id)
  const isAffected = draggingWidget?.affectedWidgets.some(w => w.id === widget.id)
  const swapPosition = draggingWidget?.swapPreview.get(widget.id)

  // Use swap position if available, otherwise use widget's own position
  const displayPosition = swapPosition 
    ? { 
        x: swapPosition.x, 
        y: swapPosition.y,
        w: widget.position.w, // Always use widget's own dimensions
        h: widget.position.h
      }
    : widget.position

  return (
    <div
      key={widget.id}
      style={getWidgetStyle({ ...widget, position: displayPosition })}
      className={`absolute ${
        draggingWidget?.widget.id === widget.id ? 'opacity-0' : 'h-full'
      } ${isAffected ? 'ring-2 ring-ui-border-interactive ring-offset-2' : ''}`}
    >

      <DraggableWidget
        widget={widget}
        onUpdate={handleUpdateWidget}
        onDelete={handleDeleteWidget}
        onEdit={(widget) => {
          setEditingWidget(widget)
          editWidgetModal.open()
        }}
        onDuplicate={handleDuplicateWidget}
        onDragStart={handleDragStart}
        onResizeStart={handleResizeStart}
        isDragging={draggingWidget?.widget.id === widget.id}
        isResizing={resizingWidget?.widget.id === widget.id}
        dragOffset={draggingWidget?.widget.id === widget.id ? {
          x: draggingWidget.offsetX,
          y: draggingWidget.offsetY
        } : undefined}
        gridMetrics={gridMetrics}
        isEditing={isEditing}
      />
    </div>
  )
})}
      </div>
    )
  }

  // Create new tab
  const handleCreateTab = async (tab: any) => {
console.log(tab, 'TABB CREATE')

    if (!tab.title.trim()) {
      toast.error("Please enter a tab title")
      return
    }

   

    const newTab: any = {
      id: `tab-${Date.now()}`,
      title: tab.title,
      label: tab.title,
      description: tab.description,
      widgets: [],
      layout: {
        columns: 12,
        rowHeight: 100,
        gap: 16,
      },
    }

    //  let tabData = await createTab({parameters: {
    //      label: tab.title, 
    //      type: "tab",
    //      description: tab.description,
    //      configuration: {
    //        layout: {
    //     columns: 12,
    //     rowHeight: 100,
    //     gap: 16,
    //       },
    //       widgets: []
    //      }
    // }}) as any
    // if(tabData.success){


    // }


    // Update local state
    setTabs(prev => [...prev, newTab])
    
    // Add pending change
    addPendingChange('create', newTab.id, newTab)
    
    setNewTabTitle("")
    setNewTabDescription("")
    createTabModal.close()
    setActiveTabId(newTab.id)
    toast.success("Tab created")
  }

  // Add new widget
  const addNewWidget = (type: any) => {
    if (!activeTab) return
     



    const position = findFirstAvailablePosition(
      activeTab.widgets,
      gridColumns,
      4,
      2
    )

    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: type,
      title: `New ${type} widget`,
      size: "medium",
      position,
      config: getDefaultConfig(type),
    }
 
    


    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return {
        ...tab,
        widgets: [...tab.widgets, newWidget]
      }
    }))
    
    addWidgetModal.close()

    // Add pending change
    addPendingChange('create', activeTabId, newWidget, newWidget.id)

    toast.success("Widget added")
  }

  // Update widget
  const handleUpdateWidget = (widgetId: string, updates: Partial<Widget>) => {
    if (!activeTab) return

    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return {
        ...tab,
        widgets: tab.widgets.map(w => 
          w.id === widgetId ? { ...w, ...updates } : w
        )
      }
    }))

    // Add pending change
    addPendingChange('update', activeTabId, updates, widgetId)
  }

  // Delete widget
  const handleDeleteWidget = (widgetId: string) => {
    if (!activeTab) return

    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return {
        ...tab,
        widgets: tab.widgets.filter(w => w.id !== widgetId)
      }
    }))

    // Add pending change
    addPendingChange('delete', activeTabId, { widgetId }, widgetId)
    
    toast.success("Widget deleted")
  }

  // Edit tab
  const handleEditTab = (tab: DashboardTab) => {
    setEditingTab(tab)
    setNewTabTitle(tab.title)
    setNewTabDescription(tab.description || "")
    editTabModal.open()
  }

  // Update tab
  const handleUpdateTab = () => {
    if (!editingTab) return
    if (!newTabTitle.trim()) {
      toast.error("Please enter a tab title")
      return
    }

    const updates = {
      title: newTabTitle,
      description: newTabDescription,
    }

    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== editingTab.id) return tab
      return {
        ...tab,
        ...updates
      }
    }))

    // Add pending change
    addPendingChange('update', editingTab.id, updates)

    editTabModal.close()
    toast.success("Tab updated")
  }

  // Delete tab
  const handleDeleteTab = (tabId: string) => {
    // Update local state
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    
    // Add pending change
    addPendingChange('delete', tabId, { tabId })
    
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id)
    }
    
    toast.success("Tab deleted")
  }

  // Duplicate widget
  const handleDuplicateWidget = (widgetId: string) => {
    if (!activeTab) return

    const widgetToDuplicate = activeTab.widgets.find(w => w.id === widgetId)
    if (!widgetToDuplicate) return

    const position = findFirstAvailablePosition(
      activeTab.widgets,
      gridColumns,
      widgetToDuplicate.position.w,
      widgetToDuplicate.position.h
    )

    const newWidget: Widget = {
      ...widgetToDuplicate,
      id: `widget-${Date.now()}`,
      title: `${widgetToDuplicate.title} (Copy)`,
      position,
    }

    // Update local state
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      return {
        ...tab,
        widgets: [...tab.widgets, newWidget]
      }
    }))

    // Add pending change
    addPendingChange('create', activeTabId, newWidget, newWidget.id)
    
    toast.success("Widget duplicated")
  }

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case "stat":
        return { value: "0", description: "No data", trend: null, icon: null }
      case "chart":
        return { type: "line", data: [], options: { showLegend: true } }
      case "table":
        return { columns: [], data: [], pageSize: 5 }
      case "list":
        return { items: [], showIcons: true }
      case "progress":
        return { items: [] }
      default:
        return {}
    }
  }

  // Loading state
  if (isDashboardLoading) {
    return (
      <Container>
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-ui-bg-base-hover rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-ui-bg-base-hover rounded w-64 mx-auto"></div>
          </div>
        </div>
      </Container>
    )
  }

  // Empty state
  if (!activeTab) {
    return (
      <Container>
        <div className="text-center py-12">
          <Heading level="h1" className="mb-4">No Dashboard Configured</Heading>
          <UiText className="text-ui-fg-subtle mb-6">
            Create your first dashboard tab to get started
          </UiText>
          <Button variant="primary" onClick={createTabModal.open}>
            <Plus /> Create Tab
          </Button>
        </div>

        {/* Create Tab Modal */}
      {/* <CreateTabModal
        open={createTabModal.state}
        onOpenChange={createTabModal.toggle}
        onCreateTab={handleCreateTab}
      /> */}

      </Container>
    )
  }


  return (
    <div className="h-full">
      <Toaster />

      {/* Tabs Header */}
      <div className="border-b border-ui-border-base bg-ui-bg-base sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Tabs value={activeTabId} onValueChange={setActiveTabId}>
              <Tabs.List className="border-0">
                {tabs.map(tab => (
                  <Tabs.Trigger key={tab.id} value={tab.id} className="text-sm relative">
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
            
            {/* Edit/Save Controls */}
            <div className="flex gap-2">
              {!isEditing ? (
                <Button 
                  variant="secondary" 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1"
                >
                  <PencilSquare className="w-4 h-4" /> Edit Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={handleDiscard}
                    className="flex items-center gap-1"
                    disabled={isSaving}
                  >
                    <XMark className="w-4 h-4" /> Discard
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSave}
                    className="flex items-center gap-1"
                    isLoading={isSaving}
                    disabled={pendingChanges.length === 0}
                  >
                    <CloudArrowUp className="w-4 h-4" /> 
                    Save {pendingChanges.length > 0 ? `(${pendingChanges.length})` : ''}
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={createTabModal.open} size="small">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Title and Description */}
      <div className="bg-ui-bg-base border-b border-ui-border-base">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1" className="text-2xl font-semibold">
                  {activeTab?.title}
                </Heading>
                {pendingChanges.some(c => c.tabId === activeTabId) && (
                  <Tooltip content="This tab has unsaved changes">
                    <Badge color="blue" size="small">
                      <Clock className="w-3 h-3 mr-1" />
                      Unsaved
                    </Badge>
                  </Tooltip>
                )}
              </div>
              {activeTab?.description && (
                <UiText className="text-ui-fg-subtle mt-1">
                  {activeTab.description}
                </UiText>
              )}
            </div>
            
            {/* Edit Mode Actions */}
            {isEditing && activeTab && (
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={() => handleEditTab(activeTab)}
                >
                  <PencilSquare className="w-4 h-4" /> Edit Tab
                </Button>
                <Button 
                  variant="danger" 
                  size="small"
                  onClick={() => handleDeleteTab(activeTab.id)}
                  disabled={tabs.length === 1}
                >
                  Delete Tab
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Grid Container */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Edit Mode Controls Bar */}
        {isEditing && (
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge color="blue" size="small">Edit Mode</Badge>
              <UiText size="small" className="text-ui-fg-subtle">
                {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''}
              </UiText>
            </div>
            <Button 
              variant="secondary" 
              size="small"
              onClick={addWidgetModal.open}
            >
              <SquaresPlus className="w-4 h-4" /> Add Widget
            </Button>
          </div>
        )}

        {/* Grid */}
        {renderGrid()}
      </div>

        <CreateTabModal
        open={createTabModal.state}
        onOpenChange={createTabModal.toggle}
        onCreateTab={handleCreateTab}
      /> 

     <EditTabModal
        open={editTabModal.state}
        onOpenChange={editTabModal.toggle}
        tab={editingTab}
        onSave={handleUpdateTab}
      />

      <AddWidgetModal
        open={addWidgetModal.state}
        onOpenChange={addWidgetModal.toggle}
        onAddWidget={addNewWidget}
      />

        <EditWidgetModal
        open={editWidgetModal.state}
        onOpenChange={editWidgetModal.toggle}
        widget={editingWidget}
        onSave={(updatedWidget) => {
          handleUpdateWidget(updatedWidget.id, {
            title: updatedWidget.title,
            config: updatedWidget.config,
          })
        }}
      /> 

 {/* Create Tab Modal */}
        {/* <FocusModal open={createTabModal.state} onOpenChange={createTabModal.toggle}>
          <FocusModal.Content className="z-20">
            <FocusModal.Header>
              <Button variant="primary" onClick={handleCreateTab}>
                Create Tab
              </Button>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-col items-center">
              <div className="max-w-lg w-full p-8">
                <Heading level="h1" className="mb-2">Create New Tab</Heading>
                <UiText className="text-ui-fg-subtle mb-6">
                  Add a new tab to organize your dashboard widgets
                </UiText>
                <div className="space-y-4">
                  <div>
                    <Label>Tab Title</Label>
                    <Input
                      placeholder="Enter tab title"
                      value={newTabTitle}
                      onChange={(e) => setNewTabTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="Enter tab description"
                      value={newTabDescription}
                      onChange={(e) => setNewTabDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal> */}
      {/* Edit Tab Modal */}
      {/* <FocusModal open={editTabModal.state} onOpenChange={editTabModal.toggle}>
        <FocusModal.Content className="z-20">
          <FocusModal.Header>
            <Button variant="primary" onClick={handleUpdateTab}>
              Update Tab
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center">
            <div className="max-w-lg w-full p-8">
              <Heading level="h1" className="mb-2">Edit Tab</Heading>
              <UiText className="text-ui-fg-subtle mb-6">
                Update tab title and description
              </UiText>
              <div className="space-y-4">
                <div>
                  <Label>Tab Title</Label>
                  <Input
                    placeholder="Enter tab title"
                    value={newTabTitle}
                    onChange={(e) => setNewTabTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Enter tab description"
                    value={newTabDescription}
                    onChange={(e) => setNewTabDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal> */}

      {/* Add Widget Modal */}


      {/* Edit Widget Modal */}
  
    </div>
  )
}