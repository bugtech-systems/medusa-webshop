import { useState, useCallback, useRef } from "react"
import { Widget, WidgetPosition, isValidPosition } from "../../components/dashboard/types"
import { throttle } from "../../components/dashboard/utils"
import { DRAG_THROTTLE_MS } from "../../components/dashboard/constants"
import { PendingChange } from "./usePendingChanges"

interface ResizeState {
  widget: Widget
  direction: string
  axis: 'x' | 'y' | 'both'
  startX: number
  startY: number
  startPos: WidgetPosition
  ghostPosition: WidgetPosition
  isValidDrop?: boolean
}

interface UseResizeProps {
  isEditing: boolean
  activeTab: any
  activeTabId: string
  gridColumns: number
  gridMetrics: { colWidth: number }
  gap: number
  rowHeight: number
  addPendingChange: (type: PendingChange['type'], tabId: string, data: any, widgetId?: string) => void
  setTabs: React.Dispatch<React.SetStateAction<any[]>>
}

export const useResize = ({
  isEditing,
  activeTab,
  activeTabId,
  gridColumns,
  gridMetrics,
  gap,
  rowHeight,
  addPendingChange,
  setTabs,
}: UseResizeProps) => {
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

  const handleResizeMove = useCallback(
    throttle((e: MouseEvent) => {
      if (!resizingWidget || !activeTab || !isEditing) return

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizingWidget.startX
        const deltaY = e.clientY - resizingWidget.startY

        const { colWidth } = gridMetrics
        const deltaCols = Math.round(deltaX / (colWidth + gap))
        const deltaRows = Math.round(deltaY / (rowHeight + gap))

        const newPosition = { ...resizingWidget.startPos }

        // Handle horizontal resizing
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

        // Handle vertical resizing
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

        // Constrain to grid bounds
        newPosition.x = Math.max(0, Math.min(gridColumns - newPosition.w, newPosition.x))
        newPosition.y = Math.max(0, newPosition.y)

        // Check if new position is valid (no collisions)
        const isValid = isValidPosition(
          activeTab.widgets,
          resizingWidget.widget.id,
          newPosition,
          gridColumns
        )

        if (isValid) {
          // Update local state
          setTabs(prev => prev.map(tab => {
            if (tab.id !== activeTabId) return tab
            return {
              ...tab,
              widgets: tab.widgets.map((w: Widget) => 
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
    }, DRAG_THROTTLE_MS),
    [resizingWidget, activeTab, gridMetrics, gap, rowHeight, gridColumns, activeTabId, setTabs]
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
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
  }, [resizingWidget, activeTabId, addPendingChange])

  return {
    resizingWidget,
    setResizingWidget,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  }
}