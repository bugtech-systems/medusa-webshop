import { useState, useCallback, useRef } from "react"
import { Widget, WidgetPosition, checkCollision, isValidPosition, calculateSwapPositions } from "../../components/dashboard/types"
import { throttle } from "../../components/dashboard/utils"
import { DRAG_THROTTLE_MS } from "../../components/dashboard/constants"
import { PendingChange } from "./usePendingChanges"

interface DragState {
  widget: Widget
  startX: number
  startY: number
  startPos: WidgetPosition
  offsetX: number
  offsetY: number
  ghostPosition: WidgetPosition
  isValidDrop?: boolean
  affectedWidgets?: Widget[]
  swapPreview?: Map<string, WidgetPosition>
}

interface UseDragAndDropProps {
  isEditing: boolean
  activeTab: any
  activeTabId: string
  gridColumns: number
  gridRef: React.RefObject<HTMLDivElement>
  pixelsToGrid: (x: number, y: number) => { gridX: number; gridY: number }
  addPendingChange: (type: PendingChange['type'], tabId: string, data: any, widgetId?: string) => void
  setTabs: React.Dispatch<React.SetStateAction<any[]>>
}

export const useDragAndDrop = ({
  isEditing,
  activeTab,
  activeTabId,
  gridColumns,
  gridRef,
  pixelsToGrid,
  addPendingChange,
  setTabs,
}: UseDragAndDropProps) => {
  const [draggingWidget, setDraggingWidget] = useState<DragState | null>(null)
  const rafRef = useRef<number>()

  const handleDragStart = useCallback((e: React.MouseEvent, widget: Widget) => {
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
  }, [isEditing, gridRef])

  const handleDragMove = useCallback(
    throttle((e: MouseEvent) => {
      if (!draggingWidget || !activeTab || !gridRef.current || !isEditing) return

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
        const otherWidgets = activeTab.widgets.filter((w: Widget) => w.id !== draggingWidget.widget.id)
        const overlappingWidget = otherWidgets.find((w: Widget) => 
          checkCollision(ghostPosition, w.position)
        )

        // Check if position is valid
        const isValid = isValidPosition(
          activeTab.widgets,
          draggingWidget.widget.id,
          ghostPosition,
          gridColumns
        )

        let swapPreview = new Map<string, WidgetPosition>()
        let affectedWidgets: Widget[] = []

        if (overlappingWidget && isValid) {
          // Calculate swap with full size consideration
          const { newPositions, isValid: canSwap, affectedWidgets: affected } = calculateSwapPositions(
            activeTab.widgets,
            draggingWidget.widget,
            overlappingWidget,
            gridColumns
          )
          
          if (canSwap) {
            swapPreview = newPositions
            affectedWidgets = affected

            // Apply swap preview immediately
            setTabs(prev => prev.map(tab => {
              if (tab.id !== activeTabId) return tab
              return {
                ...tab,
                widgets: tab.widgets.map((w: Widget) => {
                  const newPos = swapPreview.get(w.id)
                  if (newPos) {
                    return { 
                      ...w, 
                      position: { 
                        x: newPos.x, 
                        y: newPos.y,
                        w: w.position.w,
                        h: w.position.h
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
          affectedWidgets,
          swapPreview,
        } : null)
      })
    }, DRAG_THROTTLE_MS),
    [draggingWidget, activeTab, gridColumns, pixelsToGrid, activeTabId, setTabs]
  )

  const handleDragEnd = useCallback(() => {
    if (!draggingWidget || !activeTab || !isEditing) {
      setDraggingWidget(null)
      return
    }

    // Apply final positions if swap preview exists
    if (draggingWidget.swapPreview && draggingWidget.swapPreview.size > 0) {
      draggingWidget.swapPreview.forEach((position, widgetId) => {
        const widget = activeTab.widgets.find((w: Widget) => w.id === widgetId)
        if (widget) {
          addPendingChange(
            'move',
            activeTabId,
            { 
              widgetId, 
              position: {
                x: position.x,
                y: position.y,
                w: widget.position.w,
                h: widget.position.h
              }
            },
            widgetId
          )
        }
      })
    } else if (draggingWidget.isValidDrop) {
      // Single widget move
      const widget = activeTab.widgets.find((w: Widget) => w.id === draggingWidget.widget.id)
      if (widget) {
        // Update local state with final position
        setTabs(prev => prev.map(tab => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            widgets: tab.widgets.map((w: Widget) => 
              w.id === draggingWidget.widget.id
                ? { 
                    ...w, 
                    position: {
                      x: draggingWidget.ghostPosition.x,
                      y: draggingWidget.ghostPosition.y,
                      w: w.position.w,
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
          widgets: tab.widgets.map((w: Widget) => 
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
  }, [draggingWidget, activeTab, isEditing, activeTabId, addPendingChange, setTabs])

  return {
    draggingWidget,
    setDraggingWidget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  }
}