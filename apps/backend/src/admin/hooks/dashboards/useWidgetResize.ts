import { useState, useCallback, useRef, useEffect } from "react"
import { Widget, ResizeState, GridMetrics, WidgetPosition } from "../../../types/dashboards"
import { isValidPosition } from "../../utils/dashboards/gridHelpers"

interface UseWidgetResizeProps {
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

// Throttle function for smooth performance
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

export const useWidgetResize = ({
  isEditing,
  activeTab,
  activeTabId,
  gridColumns,
  rowHeight,
  gap,
  gridMetrics,
  updateTabs,
  addPendingChange,
}: UseWidgetResizeProps) => {
  const [resizingWidget, setResizingWidget] = useState<ResizeState | null>(null)
  const rafRef = useRef<number>()

  const handleResizeStart = useCallback((
    e: React.MouseEvent, 
    widget: Widget, 
    direction: string, 
    axis: 'x' | 'y' | 'both' = 'both'
  ) => {
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
  }, [isEditing])

  const calculateNewPosition = useCallback((
    startPos: WidgetPosition,
    deltaX: number,
    deltaY: number,
    direction: string,
    axis: 'x' | 'y' | 'both'
  ): WidgetPosition => {
    const { colWidth } = gridMetrics
    const deltaCols = Math.round(deltaX / (colWidth + gap))
    const deltaRows = Math.round(deltaY / (rowHeight + gap))

    const newPosition = { ...startPos }

    if (axis === 'x' || axis === 'both') {
      if (direction.includes('e')) {
        newPosition.w = Math.max(1, Math.min(
          gridColumns - newPosition.x,
          startPos.w + deltaCols
        ))
      }
      if (direction.includes('w')) {
        const newW = Math.max(1, startPos.w - deltaCols)
        if (newW !== startPos.w) {
          newPosition.x = startPos.x + (startPos.w - newW)
          newPosition.w = newW
        }
      }
    }

    if (axis === 'y' || axis === 'both') {
      if (direction.includes('s')) {
        newPosition.h = Math.max(1, startPos.h + deltaRows)
      }
      if (direction.includes('n')) {
        const newH = Math.max(1, startPos.h - deltaRows)
        if (newH !== startPos.h) {
          newPosition.y = startPos.y + (startPos.h - newH)
          newPosition.h = newH
        }
      }
    }

    // Clamp to grid boundaries
    newPosition.x = Math.max(0, Math.min(gridColumns - newPosition.w, newPosition.x))
    newPosition.y = Math.max(0, newPosition.y)

    return newPosition
  }, [gridMetrics, gridColumns, rowHeight, gap])

  const handleResizeMove = useCallback(
    throttle((e: MouseEvent) => {
      if (!resizingWidget || !activeTab || !isEditing) return

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizingWidget.startX
        const deltaY = e.clientY - resizingWidget.startY

        const newPosition = calculateNewPosition(
          resizingWidget.startPos,
          deltaX,
          deltaY,
          resizingWidget.direction,
          resizingWidget.axis
        )

        const isValid = isValidPosition(
          activeTab.widgets,
          resizingWidget.widget.id,
          newPosition,
          gridColumns
        )

        if (isValid) {
          // Update local state immediately for smooth visual feedback
          updateTabs(prev => prev.map(tab => {
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
      })
    }, 16), // ~60fps
    [resizingWidget, activeTab, gridColumns, calculateNewPosition, activeTabId, updateTabs]
  )

  const handleResizeEnd = useCallback(() => {
    if (resizingWidget && resizingWidget.isValidDrop) {
      // Only add pending change if position actually changed
      const hasChanged = 
        resizingWidget.startPos.x !== resizingWidget.ghostPosition.x ||
        resizingWidget.startPos.y !== resizingWidget.ghostPosition.y ||
        resizingWidget.startPos.w !== resizingWidget.ghostPosition.w ||
        resizingWidget.startPos.h !== resizingWidget.ghostPosition.h

      if (hasChanged) {
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
    }
    
    setResizingWidget(null)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
  }, [resizingWidget, activeTabId, addPendingChange])

  // Event listeners
  useEffect(() => {
    if (resizingWidget && isEditing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeEnd)
      return () => {
        window.removeEventListener("mousemove", handleResizeMove)
        window.removeEventListener("mouseup", handleResizeEnd)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }
  }, [resizingWidget, isEditing, handleResizeMove, handleResizeEnd])

  return {
    resizingWidget,
    handleResizeStart,
  }
}