import React from "react"
import { ArrowsPointingOut } from "@medusajs/icons"

interface DragGhostProps {
  draggingWidget: {
    widget: any
    ghostPosition: any
    isValidDrop?: boolean
  } | null
  isEditing: boolean
  getWidgetStyle: (widget: any, isGhost: boolean, position?: any) => React.CSSProperties
}

export const DragGhost: React.FC<DragGhostProps> = ({
  draggingWidget,
  isEditing,
  getWidgetStyle,
}) => {
  if (!draggingWidget || !isEditing) return null

  const ghostClasses = draggingWidget.isValidDrop
    ? 'bg-ui-bg-base/50 border-2 border-dashed border-ui-border-interactive'
    : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'

  return (
    <div
      className={`absolute ${ghostClasses} rounded-lg pointer-events-none backdrop-blur-sm transition-all duration-100`}
      style={getWidgetStyle(
        { ...draggingWidget.widget, position: draggingWidget.ghostPosition },
        true
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-50">
        <div className="text-xs bg-ui-bg-base px-2 py-1 rounded shadow-md">
          {draggingWidget.widget.position.w}×{draggingWidget.widget.position.h}
        </div>
      </div>
    </div>
  )
}