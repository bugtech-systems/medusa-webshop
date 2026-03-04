import React from "react"

interface GridBackgroundProps {
  isEditing: boolean
  gridMetrics: any
  rowHeight: number
  gap: number
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  isEditing,
  gridMetrics,
  rowHeight,
  gap,
}) => {
  if (!isEditing) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="h-full w-full opacity-30"
        style={{
          backgroundImage: `linear-gradient(to right, #9CA3AF 1px, transparent 1px), linear-gradient(to bottom, #9CA3AF 1px, transparent 1px)`,
          backgroundSize: `${gridMetrics.colWidth + gap}px ${rowHeight + gap}px`,
        }}
      />
    </div>
  )
}