import { useState, useCallback, useRef, useEffect } from "react"
import { Widget, DragState, GridMetrics, WidgetPosition } from "../../../types/dashboards"
import { pixelsToGrid, checkCollision, isValidPosition, calculateSwapPositions } from "../../utils/dashboards/gridHelpers"

interface UseDragAndDropProps {
  isEditing: boolean
  activeTab: any
  activeTabId: string
  gridColumns: number
  rowHeight: number
  gap: number
  gridMetrics: GridMetrics
  updateTabs: (updater: any) => void
  addPendingChange: (type: string, tabId: string, data: any, widgetId?: string) => void
}

export const useDragAndDrop = ({
  isEditing,
  activeTab,
  activeTabId,
  gridColumns,
  rowHeight,
  gap,
  gridMetrics,
  updateTabs,
  addPendingChange,
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
  }, [isEditing])

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingWidget || !activeTab || !gridRef.current || !isEditing) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const gridRect = gridRef.current!.getBoundingClientRect()
      
      const newLeft = e.clientX - gridRect.left - draggingWidget.offsetX
      const newTop = e.clientY - gridRect.top - draggingWidget.offsetY
      
      const { gridX, gridY } = pixelsToGrid(newLeft, newTop, gridMetrics.colWidth, rowHeight, gap)
      
      const maxX = gridColumns - draggingWidget.widget.position.w
      const newGridX = Math.max(0, Math.min(maxX, gridX))
      const newGridY = Math.max(0, gridY)

      const ghostPosition = {
        x: newGridX,
        y: newGridY,
        w: draggingWidget.widget.position.w,
        h: draggingWidget.widget.position.h
      }

      const otherWidgets = activeTab.widgets.filter(w => w.id !== draggingWidget.widget.id)
      const overlappingWidget = otherWidgets.find(w => 
        checkCollision(ghostPosition, w.position)
      )

      const isValid = isValidPosition(
        activeTab.widgets,
        draggingWidget.widget.id,
        ghostPosition,
        gridColumns
      )

      let swapPreview = new Map<string, WidgetPosition>()
      let affectedWidgets: Widget[] = []

      if (overlappingWidget && isValid) {
        const { newPositions, isValid: canSwap, affectedWidgets: affected } = calculateSwapPositions(
          activeTab.widgets,
          draggingWidget.widget,
          overlappingWidget,
          gridColumns
        )
        
        if (canSwap) {
          swapPreview = newPositions
          affectedWidgets = affected

          updateTabs(prev => prev.map(tab => {
            if (tab.id !== activeTabId) return tab
            return {
              ...tab,
              widgets: tab.widgets.map(w => {
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
  }, [draggingWidget, activeTab, gridColumns, gridMetrics, rowHeight, gap, activeTabId, updateTabs])

  const handleDragEnd = useCallback(() => {
    if (!draggingWidget || !activeTab || !isEditing) {
      setDraggingWidget(null)
      return
    }

    if (draggingWidget.swapPreview.size > 0) {
      draggingWidget.swapPreview.forEach((position, widgetId) => {
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
                w: widget.position.w,
                h: widget.position.h
              }
            },
            widgetId
          )
        }
      })
    } else if (draggingWidget.isValidDrop) {
      const widget = activeTab.widgets.find(w => w.id === draggingWidget.widget.id)
      if (widget) {
        updateTabs(prev => prev.map(tab => {
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
      updateTabs(prev => prev.map(tab => {
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
  }, [draggingWidget, activeTab, isEditing, activeTabId, addPendingChange, updateTabs])

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

  const gridRef = useRef<HTMLDivElement>(null)

  return {
    draggingWidget,
    gridRef,
    handleDragStart,
  }
}