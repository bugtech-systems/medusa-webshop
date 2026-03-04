import { Widget, WidgetPosition } from "./types"

export const throttle = <T extends (...args: any[]) => any>(
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

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const generateId = (prefix: string = 'id'): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const transformApiDataToTabs = (apiData: any): DashboardTab[] => {
  if (!apiData?.data) return []
  
  return apiData.data.map((tab: any) => ({
    id: tab.id,
    title: tab.label,
    label: tab.label,
    description: tab.description,
    ...tab.configuration,
    widgets: (tab.configuration?.widgets || []).map((widget: any) => ({
      ...widget,
      position: widget.position || { x: 0, y: 0, w: 4, h: 2 }
    }))
  }))
}

export const calculateGridMetrics = (
  gridElement: HTMLDivElement | null,
  gridColumns: number,
  gap: number
) => {
  if (!gridElement) return { colWidth: 0, totalWidth: 0, colWidthPx: 0 }
  
  const containerWidth = gridElement.clientWidth
  const totalGapWidth = gap * (gridColumns - 1)
  const colWidth = (containerWidth - totalGapWidth) / gridColumns
  
  return { colWidth, totalWidth: containerWidth, colWidthPx: colWidth }
}

export const pixelsToGrid = (
  x: number, 
  y: number, 
  gridMetrics: any, 
  rowHeight: number, 
  gap: number
) => {
  const { colWidth } = gridMetrics
  const gridX = Math.round(x / (colWidth + gap))
  const gridY = Math.round(y / (rowHeight + gap))
  return { gridX, gridY }
}

export const calculateWidgetStyle = (
  widget: Widget,
  gridMetrics: any,
  rowHeight: number,
  gap: number,
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
}