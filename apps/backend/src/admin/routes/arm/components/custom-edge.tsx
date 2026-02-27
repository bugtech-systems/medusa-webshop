import { EdgeProps, getBezierPath } from "@xyflow/react"
import { useState } from "react"
import { X } from "lucide-react"

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}: EdgeProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data?.label || "")

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const handleLabelSubmit = () => {
    if (data?.onUpdate) {
      data.onUpdate(id, label)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLabelSubmit()
    } else if (e.key === "Escape") {
      setLabel(data?.label || "")
      setIsEditing(false)
    }
  }

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  return (
    <g 
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <path
        id={id}
        style={{ ...style, strokeWidth: selected ? 3 : 2 }}
        className={`react-flow__edge-path ${selected ? 'stroke-blue-500' : 'stroke-gray-400'}`}
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Edge Label */}
      {(data?.label || isEditing) && (
        <foreignObject
          width={120}
          height={30}
          x={midX - 60}
          y={midY - 15}
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="flex items-center justify-center"
            style={{ pointerEvents: 'all' }}
          >
            {isEditing ? (
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelSubmit}
                onKeyDown={handleKeyDown}
                className="text-xs border rounded px-2 py-1 bg-white shadow-sm w-24 text-center"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                className="text-xs bg-white px-2 py-1 rounded shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => setIsEditing(true)}
              >
                {data.label}
              </div>
            )}
          </div>
        </foreignObject>
      )}

      {/* Delete Button */}
      {showDelete && data?.onDelete && (
        <foreignObject
          width={20}
          height={20}
          x={midX - 10}
          y={midY - 30}
          style={{ pointerEvents: 'all' }}
        >
          <button
            onClick={() => data.onDelete(id)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-sm transition-colors"
            title="Delete edge"
          >
            <X size={10} />
          </button>
        </foreignObject>
      )}
    </g>
  )
}