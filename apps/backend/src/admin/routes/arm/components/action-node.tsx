import { Handle, Position, NodeProps } from "@xyflow/react"
import { useState } from "react"
import { WorkflowAction } from "../../../../types"
import { X, ChevronRight } from "lucide-react"

interface ActionNodeData {
  label: string
  index: number
  action: WorkflowAction
  onDelete?: (nodeId: string) => void
  onUpdate?: (action: WorkflowAction) => void
  onOpenSubflow?: (subflowId: string) => void
}

export default function ActionNode({ data, isConnectable }: NodeProps<ActionNodeData>) {
  const [showDelete, setShowDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label)

  const inputs = data.action.inputs || [{ id: "input", type: "any", label: "Input" }]
  const outputs = data.action.outputs || [{ id: "output", type: "any", label: "Output" }]

  const handleLabelSubmit = () => {
    if (data.onUpdate && label !== data.label) {
      data.onUpdate({
        ...data.action,
        name: label
      })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLabelSubmit()
    } else if (e.key === "Escape") {
      setLabel(data.label)
      setIsEditing(false)
    }
  }

  return (
    <div 
      className="px-4 py-3 rounded-md border-2 border-blue-500 bg-white shadow-sm min-w-[200px] hover:shadow-md transition-shadow relative group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Delete Button */}
      {showDelete && data.onDelete && (
        <div className="absolute -top-2 -right-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onDelete?.(data.action.id!)
            }}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-sm transition-colors"
            title="Delete node"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Sub-flow indicator */}
      {data.action.subflowId && (
        <div className="absolute -top-2 -left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onOpenSubflow?.(data.action.subflowId!)
            }}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white hover:bg-purple-600 shadow-sm transition-colors"
            title="Open sub-flow"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
            {data.index}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleLabelSubmit}
              onKeyDown={handleKeyDown}
              className="font-semibold text-sm border rounded px-2 py-1 w-32"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className="font-semibold text-sm cursor-pointer hover:text-blue-600"
              onDoubleClick={() => setIsEditing(true)}
            >
              {label}
            </div>
          )}
        </div>
      </div>

      {/* Input Handles */}
      <div className="relative h-4">
        {inputs.map((input, index) => (
          <Handle
            key={input.id}
            id={`${input.id}-${input.type}`}
            type="target"
            position={Position.Left}
            style={{ 
              top: `${30 + index * 20}px`,
              background: input.type === 'any' ? '#555' : 
                         input.type === 'string' ? '#3b82f6' : 
                         input.type === 'number' ? '#10b981' : '#555'
            }}
            isConnectable={isConnectable}
          />
        ))}
      </div>

      {/* Output Handles */}
      <div className="relative h-4 mt-4">
        {outputs.map((output, index) => (
          <Handle
            key={output.id}
            id={`${output.id}-${output.type}`}
            type="source"
            position={Position.Right}
            style={{ 
              top: `${30 + index * 20}px`,
              background: output.type === 'any' ? '#555' : 
                         output.type === 'string' ? '#3b82f6' : 
                         output.type === 'number' ? '#10b981' : '#555'
            }}
            isConnectable={isConnectable}
          />
        ))}
      </div>

      {/* Handle Labels */}
      <div className="mt-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <div>
            {inputs.map((input, i) => (
              <div key={input.id} className="text-left">{input.label || input.id}</div>
            ))}
          </div>
          <div>
            {outputs.map((output, i) => (
              <div key={output.id} className="text-right">{output.label || output.id}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}