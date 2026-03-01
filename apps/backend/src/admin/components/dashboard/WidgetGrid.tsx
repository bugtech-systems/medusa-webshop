import React, { useMemo } from "react"
import { Badge, Button } from "@medusajs/ui"
import { ArrowsPointingOut, SquaresPlus } from "@medusajs/icons"
import { WidgetCard } from "./WidgetCard"
import { DashboardTab, Widget, DragState, ResizeState } from "../../../types/dashboards"
import { getWidgetStyle, getDropIndicatorStyle } from "../../utils/dashboards/gridHelpers"

interface WidgetGridProps {
  activeTab: DashboardTab
  isEditing: boolean
  pendingChanges: any[]
  draggingWidget: DragState | null
  resizingWidget: ResizeState | null
  gridRef: React.RefObject<HTMLDivElement>
  onAddWidget: () => void
  onUpdateWidget: (widgetId: string, updates: Partial<Widget>) => void
  onDeleteWidget: (widgetId: string) => void
  onEditWidget: (widget: Widget) => void
  onDuplicateWidget: (widgetId: string) => void
  onDragStart: (e: React.MouseEvent, widget: Widget) => void
  onResizeStart: (e: React.MouseEvent, widget: Widget, direction: string, axis?: 'x' | 'y') => void
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  activeTab,
  isEditing,
  pendingChanges,
  draggingWidget,
  resizingWidget,
  gridRef,
  onAddWidget,
  onUpdateWidget,
  onDeleteWidget,
  onEditWidget,
  onDuplicateWidget,
  onDragStart,
  onResizeStart,
}) => {
  const gridColumns = activeTab.layout.columns
  const rowHeight = activeTab.layout.rowHeight
  const gap = activeTab.layout.gap

  // Calculate grid metrics
  const gridMetrics = useMemo(() => {
    if (!gridRef.current) return { colWidth: 0, rowHeight, gap }
    const containerWidth = gridRef.current.clientWidth
    const totalGapWidth = gap * (gridColumns - 1)
    const colWidth = (containerWidth - totalGapWidth) / gridColumns
    return { colWidth, rowHeight, gap }
  }, [gridColumns, rowHeight, gap, gridRef.current?.clientWidth])

  // Calculate total grid height
  const gridHeight = useMemo(() => {
    const maxRow = Math.max(...activeTab.widgets.map(w => w.position.y + w.position.h), 1)
    return maxRow * (rowHeight + gap)
  }, [activeTab.widgets, rowHeight, gap])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Edit Mode Controls Bar */}
      {isEditing && (
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge color="blue" size="small">Edit Mode</Badge>
            <span className="text-small text-ui-fg-subtle">
              {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button 
            variant="secondary" 
            size="small"
            onClick={onAddWidget}
          >
            <SquaresPlus className="w-4 h-4" /> Add Widget
          </Button>
        </div>
      )}

      {/* Grid Container */}
      <div 
        ref={gridRef}
        className={`relative rounded-lg transition-colors duration-300 ${
          isEditing ? 'bg-ui-bg-subtle' : ''
        }`}
        style={{ height: `${gridHeight}px` }}
      >
        {/* Grid Background */}
        {isEditing && gridMetrics.colWidth > 0 && (
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
            style={getWidgetStyle(
              { ...draggingWidget.affectedWidgets[0], position: draggingWidget.ghostPosition },
              gridMetrics,
              true
            )}
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
            style={getWidgetStyle(
              { ...draggingWidget.widget, position: draggingWidget.ghostPosition },
              gridMetrics,
              true
            )}
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
            style={getWidgetStyle(
              { ...resizingWidget.widget, position: resizingWidget.ghostPosition },
              gridMetrics,
              true
            )}
          />
        )}

        {/* Widgets */}
        {activeTab.widgets.map(widget => {
          const hasPendingChange = pendingChanges.some(c => c.widgetId === widget.id)
          const isAffected = draggingWidget?.affectedWidgets.some(w => w.id === widget.id)
          const swapPosition = draggingWidget?.swapPreview.get(widget.id)

          const displayPosition = swapPosition 
            ? { 
                x: swapPosition.x, 
                y: swapPosition.y,
                w: widget.position.w,
                h: widget.position.h
              }
            : widget.position

          // Skip rendering the dragged widget itself (it's shown as ghost)
          if (draggingWidget?.widget.id === widget.id) {
            return null
          }

          return (
            <div
              key={widget.id}
              style={getWidgetStyle(
                { ...widget, position: displayPosition },
                gridMetrics
              )}
              className={`absolute ${
                isAffected ? 'ring-2 ring-ui-border-interactive ring-offset-2' : ''
              }`}
            >
              <WidgetCard
                widget={widget}
                isEditing={isEditing}
                hasPendingChange={hasPendingChange}
                onUpdate={onUpdateWidget}
                onDelete={onDeleteWidget}
                onEdit={onEditWidget}
                onDuplicate={onDuplicateWidget}
                onDragStart={onDragStart}
                onResizeStart={onResizeStart}
                gridMetrics={gridMetrics}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}