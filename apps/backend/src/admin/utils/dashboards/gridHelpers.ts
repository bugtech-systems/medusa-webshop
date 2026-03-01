import { Widget, WidgetPosition } from "../../../types/dashboards"

export const checkCollision = (pos1: WidgetPosition, pos2: WidgetPosition): boolean => {
  return !(
    pos1.x + pos1.w <= pos2.x ||
    pos1.x >= pos2.x + pos2.w ||
    pos1.y + pos1.h <= pos2.y ||
    pos1.y >= pos2.y + pos2.h
  )
}

export const isValidPosition = (
  widgets: Widget[],
  currentWidgetId: string,
  newPosition: WidgetPosition,
  gridColumns: number
): boolean => {
  if (newPosition.x < 0 || newPosition.y < 0 || 
      newPosition.x + newPosition.w > gridColumns) {
    return false
  }

  return !widgets.some(widget => {
    if (widget.id === currentWidgetId) return false
    return checkCollision(newPosition, widget.position)
  })
}

export const findFirstAvailablePosition = (
  widgets: Widget[],
  gridColumns: number,
  width: number,
  height: number,
  startRow: number = 0
): WidgetPosition => {
  const positions = new Set<string>()
  widgets.forEach(w => {
    for (let y = w.position.y; y < w.position.y + w.position.h; y++) {
      for (let x = w.position.x; x < w.position.x + w.position.w; x++) {
        positions.add(`${x},${y}`)
      }
    }
  })

  for (let y = startRow; y < 100; y++) {
    for (let x = 0; x <= gridColumns - width; x++) {
      let available = true
      for (let wy = 0; wy < height; wy++) {
        for (let wx = 0; wx < width; wx++) {
          if (positions.has(`${x + wx},${y + wy}`)) {
            available = false
            break
          }
        }
        if (!available) break
      }
      if (available) {
        return { x, y, w: width, h: height }
      }
    }
  }
  return { x: 0, y: startRow, w: width, h: height }
}

export const calculateSwapPositions = (
  widgets: Widget[],
  draggedWidget: Widget,
  targetWidget: Widget,
  gridColumns: number
): { newPositions: Map<string, WidgetPosition>, isValid: boolean, affectedWidgets: Widget[] } => {
  const newPositions = new Map<string, WidgetPosition>()
  const affectedWidgets: Widget[] = []
  
  const tempPos1 = { ...targetWidget.position, w: draggedWidget.position.w, h: draggedWidget.position.h }
  const tempPos2 = { ...draggedWidget.position, w: targetWidget.position.w, h: targetWidget.position.h }
  
  const tempWidgets = widgets.map(w => {
    if (w.id === draggedWidget.id) {
      return { ...w, position: tempPos1 }
    }
    if (w.id === targetWidget.id) {
      return { ...w, position: tempPos2 }
    }
    return w
  })
  
  const isValid1 = isValidPosition(tempWidgets, draggedWidget.id, tempPos1, gridColumns)
  const isValid2 = isValidPosition(tempWidgets, targetWidget.id, tempPos2, gridColumns)
  
  if (isValid1 && isValid2) {
    newPositions.set(draggedWidget.id, { ...tempPos1 })
    newPositions.set(targetWidget.id, { ...tempPos2 })
    affectedWidgets.push(draggedWidget, targetWidget)
    return { newPositions, isValid: true, affectedWidgets }
  }
  
  return { newPositions, isValid: false, affectedWidgets: [] }
}

export const getDropIndicatorStyle = (isValid: boolean): string => {
  return isValid 
    ? 'bg-ui-bg-base/50 border-2 border-dashed border-ui-border-interactive' 
    : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'
}

export const pixelsToGrid = (
  x: number, 
  y: number, 
  colWidth: number, 
  rowHeight: number, 
  gap: number
): { gridX: number; gridY: number } => {
  const gridX = Math.round(x / (colWidth + gap))
  const gridY = Math.round(y / (rowHeight + gap))
  return { gridX, gridY }
}


// Add this to utils/gridHelpers.ts

export const getWidgetStyle = (
  widget: Widget,
  gridMetrics: { colWidth: number; rowHeight: number; gap: number },
  isGhost: boolean = false
) => {
  const { colWidth, rowHeight, gap } = gridMetrics
  const pos = widget.position
  
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
}

export const getGridMetrics = (
  containerWidth: number,
  gridColumns: number,
  gap: number,
  rowHeight: number
) => {
  const totalGapWidth = gap * (gridColumns - 1)
  const colWidth = (containerWidth - totalGapWidth) / gridColumns
  return { colWidth, rowHeight, gap }
}