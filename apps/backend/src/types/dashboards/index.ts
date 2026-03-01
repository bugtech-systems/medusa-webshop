export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface Widget {
  id: string
  type: string
  title: string
  size: 'small' | 'medium' | 'large'
  position: WidgetPosition
  config: Record<string, any>
}

export interface DashboardTab {
  id: string
  title: string
  description?: string
  widgets: Widget[]
  layout: {
    columns: number
    rowHeight: number
    gap: number
  }
}

export type PendingChangeType = 'create' | 'update' | 'delete' | 'move' | 'resize'

export interface PendingChange {
  id: string
  type: PendingChangeType
  tabId: string
  widgetId?: string
  data: any
  timestamp: number
}

export interface DragState {
  widget: Widget
  startX: number
  startY: number
  startPos: WidgetPosition
  offsetX: number
  offsetY: number
  ghostPosition: WidgetPosition
  isValidDrop: boolean
  affectedWidgets: Widget[]
  swapPreview: Map<string, WidgetPosition>
}

export interface ResizeState {
  widget: Widget
  direction: string
  axis: 'x' | 'y' | 'both'
  startX: number
  startY: number
  startPos: WidgetPosition
  ghostPosition: WidgetPosition
  isValidDrop: boolean
}

export interface GridMetrics {
  colWidth: number
  totalWidth: number
  colWidthPx: number
}

export interface DashboardProps {
  initialTabs?: DashboardTab[]
}