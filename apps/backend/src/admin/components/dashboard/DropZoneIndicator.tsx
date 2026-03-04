import React from "react"
import { ArrowsPointingOut } from "@medusajs/icons"

interface DropZoneIndicatorProps {
  draggingWidget: {
    affectedWidgets?: any[]
    isValidDrop?: boolean
  } | null
  isEditing: boolean
  getWidgetStyle: (widget: any, isGhost: boolean) => React.CSSProperties
}

export const getDropIndicatorStyle = (isValid: boolean = true): string => {
  return isValid
    ? 'bg-ui-bg-base/30 border-2 border-dashed border-ui-border-interactive'
    : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'
}

export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  draggingWidget,
  isEditing,
  getWidgetStyle,
}) => {
  if (!draggingWidget || !isEditing || !draggingWidget.affectedWidgets?.length) return null

  return (
    <div
      className={`absolute ${getDropIndicatorStyle(draggingWidget.isValidDrop)} rounded-lg transition-all duration-200`}
      style={getWidgetStyle(draggingWidget.affectedWidgets[0], true)}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ArrowsPointingOut className="w-6 h-6 text-ui-fg-interactive" />
      </div>
    </div>
  )
}