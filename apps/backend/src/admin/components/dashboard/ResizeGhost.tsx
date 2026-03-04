import React from "react"

interface ResizeGhostProps {
  resizingWidget: {
    widget: any
    ghostPosition: any
    isValidDrop?: boolean
  } | null
  isEditing: boolean
  getWidgetStyle: (widget: any, isGhost: boolean, position?: any) => React.CSSProperties
}

export const ResizeGhost: React.FC<ResizeGhostProps> = ({
  resizingWidget,
  isEditing,
  getWidgetStyle,
}) => {
  if (!resizingWidget || !isEditing) return null

  const ghostClasses = resizingWidget.isValidDrop
    ? 'bg-ui-bg-base/50 border-2 border-dashed border-ui-border-interactive'
    : 'bg-ui-tag-red-bg/30 border-2 border-dashed border-ui-border-error'

  return (
    <div
      className={`absolute ${ghostClasses} rounded-lg pointer-events-none backdrop-blur-sm`}
      style={getWidgetStyle(
        { ...resizingWidget.widget, position: resizingWidget.ghostPosition },
        true
      )}
    />
  )
}