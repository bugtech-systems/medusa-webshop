import React from "react"
import { DashboardTab } from "./DashboardContainer"
import { StatWidget, ChartWidget, TableWidget, ListWidget } from "./WidgetComponents"
import { IconButton, Badge } from "@medusajs/ui"
import { Trash, SquareDashedCursor, CogSixToothSolid } from "@medusajs/icons"
import { WidgetConfig } from "./DashboardContainer"

interface WidgetGridProps {
  tab: DashboardTab
  isEditing: boolean
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void
  onDeleteWidget: (widgetId: string) => void
}

export const WidgetGrid = ({
  tab,
  isEditing,
  onUpdateWidget,
  onDeleteWidget,
}: WidgetGridProps) => {
  const { layout, widgets } = tab

  const renderWidget = (widget: WidgetConfig) => {
    const commonProps = {
      ...widget.config,
      title: widget.title,
      isEditing,
      onUpdate: (updates: any) => onUpdateWidget(widget.id, { config: updates }),
      onDelete: () => onDeleteWidget(widget.id),
    }

    switch (widget.type) {
      case "stat":
        return <StatWidget {...commonProps} />
      case "chart":
        return <ChartWidget {...commonProps} />
      case "table":
        return <TableWidget {...commonProps} />
      case "list":
        return <ListWidget {...commonProps} />
      default:
        return null
    }
  }

  // Calculate grid positions
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gap: `${layout.gap}px`,
    gridAutoRows: `${layout.rowHeight}px`,
  }

  return (
    <div style={gridStyle} className="relative min-h-[500px]">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="relative group"
          style={{
            gridColumn: `span ${widget.position.w}`,
            gridRow: `span ${widget.position.h}`,
          }}
        >
          {/* Widget Container */}
          <div className="h-full border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Widget Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                {isEditing && (
                  <IconButton
                    size="small"
                    variant="transparent"
                    className="cursor-move"
                  >
                    <SquareDashedCursor />
                  </IconButton>
                )}
                <h3 className="font-medium text-sm">{widget.title}</h3>
                <Badge size="small" variant="grey">
                  {widget.type}
                </Badge>
              </div>
              
              {isEditing && (
                <div className="flex items-center gap-1">
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => {
                      // Open widget configuration modal
                      console.log("Configure widget", widget.id)
                    }}
                  >
                    <CogSixToothSolid />
                  </IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => onDeleteWidget(widget.id)}
                  >
                    <Trash />
                  </IconButton>
                </div>
              )}
            </div>

            {/* Widget Content */}
            <div className="p-4 h-[calc(100%-53px)] overflow-auto">
              {renderWidget(widget)}
            </div>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="col-span-full flex items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No widgets added yet</p>
            {isEditing && (
              <p className="text-sm text-gray-400">
                Click the "Add Widget" button to start building your dashboard
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}