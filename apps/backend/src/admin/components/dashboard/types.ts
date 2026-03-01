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
  size: "small" | "medium" | "large"
  position: WidgetPosition
  config: WidgetConfig
  configuration?: WidgetConfig
  metadata?: WidgetConfig
  description?: string
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

export interface DashboardState {
  tabs: DashboardTab[]
  activeTabId: string
  isEditing: boolean
  hasUnsavedChanges: boolean
}



export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface WidgetConfig {
  [key: string]: any
}

export interface Widget {
  id: string
  type: string
  title: string
  size: "small" | "medium" | "large"
  position: WidgetPosition
  config: WidgetConfig
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

export interface AdminDashboard {
  id: string
  name: string
  description?: string
  tabs: DashboardTab[]
  created_at: string
  updated_at: string
  created_by?: string
  is_default?: boolean
  settings?: {
    allowSharing?: boolean
    isPublic?: boolean
    allowedUsers?: string[]
  }
}

export interface AdminDashboardListResponse {
  dashboards: AdminDashboard[]
  count: number
  offset: number
  limit: number
}

export interface AdminDashboardResponse {
  dashboard: AdminDashboard
}

export interface AdminCreateDashboard {
  name: string
  description?: string
  tabs: DashboardTab[]
  settings?: {
    allowSharing?: boolean
    isPublic?: boolean
    allowedUsers?: string[]
  }
}

export interface AdminUpdateDashboard {
  name?: string
  description?: string
  tabs?: DashboardTab[]
  settings?: {
    allowSharing?: boolean
    isPublic?: boolean
    allowedUsers?: string[]
  }
}

export interface DashboardFilterParams {
  search?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_dir?: "asc" | "desc"
  is_default?: boolean
  created_by?: string
  [key: string]: any
}

// Widget Templates
export interface WidgetTemplate {
  id: string
  type: string
  name: string
  description: string
  defaultConfig: WidgetConfig
  defaultSize: {
    w: number
    h: number
  }
  icon?: string
  category?: string
}

// Dashboard Export/Import
export interface DashboardExport {
  dashboard: AdminDashboard
  version: string
  exported_at: string
}

export interface DashboardImport {
  dashboard: AdminDashboard
  overwrite?: boolean
  newId?: boolean
}

// Dashboard Sharing
export interface DashboardShareSettings {
  isPublic: boolean
  shareUrl?: string
  allowedUsers?: string[]
  expiryDate?: string
}

export interface DashboardShareResponse {
  shareUrl: string
  settings: DashboardShareSettings
}

// Dashboard Analytics
export interface DashboardAnalytics {
  dashboardId: string
  views: number
  uniqueVisitors: number
  averageTimeOnDashboard: number
  widgetInteractions: Record<string, number>
  lastViewed: string
  popularTimeRanges: Array<{
    hour: number
    count: number
  }>
}

// Dashboard Version History
export interface DashboardVersion {
  id: string
  dashboardId: string
  version: number
  data: AdminDashboard
  created_at: string
  created_by: string
  comment?: string
}


import { FetchError } from "@medusajs/js-sdk"

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
  size: "small" | "medium" | "large"
  position: WidgetPosition
  config: WidgetConfig
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

export interface AdminDashboardResponse {
  tabs: DashboardTab[]
}

export interface AdminDashboardTabResponse {
  tab: DashboardTab
}

export interface AdminCreateDashboardTab {
  title: string
  description?: string
  layout?: {
    columns: number
    rowHeight: number
    gap: number
  }
}

export interface AdminUpdateDashboardTab {
  title?: string
  description?: string
  layout?: {
    columns: number
    rowHeight: number
    gap: number
  }
}

export interface AdminCreateWidget {
  tabId: string
  type: string
  title: string
  position: WidgetPosition
  config: WidgetConfig
}

export interface AdminUpdateWidget {
  title?: string
  position?: Partial<WidgetPosition>
  config?: WidgetConfig
}

export interface AdminWidgetResponse {
  widget: Widget
}

export interface AdminBulkWidgetAction {
  ids: string[]
  action: "duplicate" | "delete" | "move"
  data?: {
    tabId?: string
    position?: Partial<WidgetPosition>
  }
}

export interface AdminBulkWidgetResponse {
  widgets: Widget[]
}

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
  size: "small" | "medium" | "large"
  position: WidgetPosition
  config: WidgetConfig
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

export interface PendingChange {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'resize' | 'swap'
  tabId: string
  widgetId?: string
  data: any
  timestamp: number
}




// Find best position for widget with size consideration
export const findBestPosition = (
  widgets: Widget[],
  widgetToPlace: Widget,
  preferredX: number,
  preferredY: number,
  columns: number
): WidgetPosition => {
  // Try preferred position first
  const preferredPos = {
    x: preferredX,
    y: preferredY,
    w: widgetToPlace.position.w,
    h: widgetToPlace.position.h
  }

  if (isValidPosition(widgets, widgetToPlace.id, preferredPos, columns)) {
    return preferredPos
  }

  // Search outward from preferred position
  for (let radius = 1; radius < 10; radius++) {
    for (let y = Math.max(0, preferredY - radius); y <= preferredY + radius; y++) {
      for (let x = 0; x <= columns - widgetToPlace.position.w; x++) {
        const testPos = {
          x,
          y,
          w: widgetToPlace.position.w,
          h: widgetToPlace.position.h
        }
        if (isValidPosition(widgets, widgetToPlace.id, testPos, columns)) {
          return testPos
        }
      }
    }
  }

  // Fallback to first available
  return findFirstAvailablePosition(
    widgets.filter(w => w.id !== widgetToPlace.id),
    columns,
    widgetToPlace.position.w,
    widgetToPlace.position.h,
    preferredY
  )
}


// Find all widgets that would be affected by a move
export const findAffectedWidgets = (
  widgets: Widget[],
  movingWidget: Widget,
  newPosition: WidgetPosition
): Widget[] => {
  return widgets.filter(w => 
    w.id !== movingWidget.id && checkCollision(newPosition, w.position)
  )
}

// Calculate optimal swap positions
export const calculateSwapPositions = (
  widgets: Widget[],
  draggingWidget: Widget,
  targetWidget: Widget,
  columns: number
): { newPositions: Map<string, WidgetPosition>; isValid: boolean } => {
  const newPositions = new Map<string, WidgetPosition>()
  
  // Check if widgets can simply swap positions
  const tempPosition = { ...targetWidget.position }
  const canSimpleSwap = !widgets.some(w => 
    w.id !== draggingWidget.id && 
    w.id !== targetWidget.id &&
    checkCollision({ ...draggingWidget.position, ...tempPosition }, w.position)
  )

  if (canSimpleSwap) {
    // Simple swap
    newPositions.set(draggingWidget.id, targetWidget.position)
    newPositions.set(targetWidget.id, draggingWidget.position)
    return { newPositions, isValid: true }
  }

  // Try to find alternative positions
  const otherWidgets = widgets.filter(w => 
    w.id !== draggingWidget.id && w.id !== targetWidget.id
  )

  // Find new position for target widget
  const targetNewPos = findFirstAvailablePosition(
    otherWidgets,
    columns,
    targetWidget.position.w,
    targetWidget.position.h,
    targetWidget.position.y
  )

  if (targetNewPos) {
    newPositions.set(draggingWidget.id, targetWidget.position)
    newPositions.set(targetWidget.id, targetNewPos)
    return { newPositions, isValid: true }
  }

  return { newPositions, isValid: false }
}

// Check if a position is valid (within bounds and no collisions)
export const isValidPosition = (
  widgets: Widget[],
  widgetId: string,
  newPosition: WidgetPosition,
  columns: number
): boolean => {
  // Check bounds
  if (newPosition.x < 0 || newPosition.x + newPosition.w > columns) {
    return false
  }
  if (newPosition.y < 0) {
    return false
  }

  // Check collisions with other widgets
  const otherWidgets = widgets.filter(w => w.id !== widgetId)
  return !otherWidgets.some(w => checkCollision(newPosition, w.position))
}

// Get drop indicator style based on position validity
export const getDropIndicatorStyle = (isValid: boolean): string => {
  return isValid 
    ? 'border-2 border-ui-border-interactive bg-ui-bg-base/30' 
    : 'border-2 border-ui-border-error bg-ui-tag-red-bg/20'
}




// Grid helper functions
export const findFirstAvailablePosition = (
  widgets: Widget[],
  columns: number,
  widgetWidth: number,
  widgetHeight: number
): WidgetPosition => {
  // Create a grid occupancy map
  const occupied = new Set<string>()
  
  widgets.forEach(widget => {
    for (let x = widget.position.x; x < widget.position.x + widget.position.w; x++) {
      for (let y = widget.position.y; y < widget.position.y + widget.position.h; y++) {
        occupied.add(`${x},${y}`)
      }
    }
  })

  // Find first empty spot
  let maxY = 0
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= columns - widgetWidth; x++) {
      let available = true
      for (let wx = 0; wx < widgetWidth; wx++) {
        for (let wy = 0; wy < widgetHeight; wy++) {
          if (occupied.has(`${x + wx},${y + wy}`)) {
            available = false
            break
          }
        }
        if (!available) break
      }
      if (available) {
        return { x, y, w: widgetWidth, h: widgetHeight }
      }
    }
    maxY = y
  }
  
  // If no spot found, place at bottom
  return { x: 0, y: maxY + 1, w: widgetWidth, h: widgetHeight }
}

export const findSwappedPositions = (
  draggingWidget: Widget,
  targetWidget: Widget,
  widgets: Widget[],
  columns: number
): { updatedWidgets: Widget[]; newDraggingPosition: WidgetPosition } => {
  const updatedWidgets = [...widgets]
  const draggingIndex = updatedWidgets.findIndex(w => w.id === draggingWidget.id)
  const targetIndex = updatedWidgets.findIndex(w => w.id === targetWidget.id)
  
  if (draggingIndex === -1 || targetIndex === -1) {
    return { updatedWidgets, newDraggingPosition: draggingWidget.position }
  }

  // Find available position for target widget
  const otherWidgets = updatedWidgets.filter((_, idx) => 
    idx !== draggingIndex && idx !== targetIndex
  )
  
  const availablePosition = findFirstAvailablePosition(
    otherWidgets,
    columns,
    targetWidget.position.w,
    targetWidget.position.h
  )

  // Swap positions
  updatedWidgets[draggingIndex] = {
    ...draggingWidget,
    position: targetWidget.position
  }
  
  updatedWidgets[targetIndex] = {
    ...targetWidget,
    position: availablePosition
  }

  return { 
    updatedWidgets, 
    newDraggingPosition: targetWidget.position 
  }
}

export const checkCollision = (
  widget1: WidgetPosition,
  widget2: WidgetPosition
): boolean => {
  return !(
    widget2.x >= widget1.x + widget1.w ||
    widget2.x + widget2.w <= widget1.x ||
    widget2.y >= widget1.y + widget1.h ||
    widget2.y + widget2.h <= widget1.y
  )
}