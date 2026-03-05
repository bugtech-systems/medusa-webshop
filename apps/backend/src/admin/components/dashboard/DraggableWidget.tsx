"use client"

import React, { useEffect, useState } from "react"
import { Button, Tooltip, useToggleState, Text as UiText } from "@medusajs/ui"
import { PencilSquare, Trash, ArrowsPointingOut,  Minus } from "@medusajs/icons";
import {Copy } from 'lucide-react'
import { Widget } from "./types"
import { widgetRegistry } from "./widgets"
import { useExecuteAction, useExecution } from "../../hooks/api/actions"


interface DraggableWidgetProps {
  widget: Widget
  onUpdate?: (widgetId: string, updates: Partial<Widget>) => void
  onDelete: (widgetId: string) => void
  onEdit: (widget: Widget) => void
  onDuplicate?: (widgetId: string) => void
  onDragStart?: (e: React.MouseEvent, widget: Widget) => void
  onResizeStart?: (e: React.MouseEvent, widget: Widget, direction: string, axis?: 'x' | 'y') => void
  isDragging?: boolean
  isResizing?: boolean
  dragOffset?: { x: number; y: number }
  gridMetrics: { colWidth: number; totalWidth?: number; rowHeight?: number; gap: number }
  isEditing: any
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  onEdit,
  onDuplicate,
  onDragStart,
  onResizeStart,
  isDragging,
  isResizing,
  dragOffset,
  gridMetrics,
  isEditing,
}) => {
  const { mutateAsync: getWidgetData } = useExecuteAction('get-widget-data')
  const [showControls, setShowControls] = useState(false)
  const [widgetData, setWidgetData] = useState({});
  const [isHovered, setIsHovered] = useState(false)
  const deletePrompt = useToggleState()

  const fetchWidget = async (widgetId: any) => {
        let {data} = await getWidgetData({parameters: {widget_id: widgetId}}) as any;
    setWidgetData({...widget.configuration,...data, type: data.type, ...(data.type == 'table' ? {fields: data.config.fields, data: data.data} : {data: data.data})});
  }



  useEffect(() => {

fetchWidget(widget.id)    


  }, [widget])



  const WidgetComponent = widgetRegistry[widget?.type]

  if (!WidgetComponent) {
    return (
      <div className="h-full w-full p-4 border border-ui-border-base rounded-lg bg-ui-bg-base">
        <UiText className="text-ui-fg-error">Unknown widget type: {widget.type}</UiText>
      </div>
    )
  }




  // Drag transform for smooth movement
  const dragStyle = isDragging && dragOffset ? {
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(2deg)`,
    transition: 'transform 0.05s linear',
    zIndex: 1000,
    opacity: 0.9,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
    cursor: 'grabbing',
  } : {}

  // Resize style
  const resizeStyle = isResizing ? {
    boxShadow: '0 0 0 2px #3b82f6',
    transition: 'all 0.1s ease-out',
  } : {}

  return (
    <div
      id="widget-component" 
      className={`relative h-full w-full transition-all duration-200 ${
        isDragging ? 'z-50' : ''
      }`}
      style={{ ...dragStyle, ...resizeStyle }}
      onMouseEnter={() => {
        if (isEditing) {
          setShowControls(true)
          setIsHovered(true)
        }
      }}
      onMouseLeave={() => {
        setShowControls(false)
        setIsHovered(false)
      }}
    >
      {/* Widget Content */}
  <div className="h-full w-full">
        <WidgetComponent widget={{...widget, ...widgetData}} />
      </div>

      {/* Drag Handle */}
      {isEditing && (
        <div
          className={`absolute top-2 left-2 cursor-grab active:cursor-grabbing p-2 rounded-full bg-ui-bg-base hover:bg-ui-bg-base-hover shadow-md z-10 transition-all duration-200 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
          onMouseDown={(e) => onDragStart?.(e, widget)}
        >
          <ArrowsPointingOut className="w-4 h-4 text-ui-fg-subtle" />
        </div>
      )}

      {/* Controls */}
      {isEditing && showControls && !isDragging && !isResizing && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {/* <Tooltip content="Edit widget">
            <Button
              size="small"
              variant="secondary"
              onClick={() => onEdit(widget)}
              className="shadow-md bg-ui-bg-base hover:scale-105 transition-transform"
            >
              <PencilSquare className="w-4 h-4" />
            </Button>
          </Tooltip> */}
          {/* <Tooltip content="Duplicate widget">
            <Button
              size="small"
              variant="secondary"
              onClick={() => onDuplicate(widget.id)}
              className="shadow-md bg-ui-bg-base hover:scale-105 transition-transform"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </Tooltip> */}
          <Tooltip content="Delete widget">
            <Button
              size="small"
              variant="danger"
              onClick={deletePrompt.open}
              className="shadow-md hover:scale-105 transition-transform"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Resize Handles */}
      {isEditing && (
        <>
          {/* Right edge */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-12 cursor-ew-resize z-10 group ${
              isHovered ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-200`}
            onMouseDown={(e) => onResizeStart?.(e, widget, 'e', 'x')}
          >
            <div className="w-1 h-full bg-ui-border-interactive rounded-full mx-auto group-hover:w-2 transition-all" />
          </div>

          {/* Left edge */}
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-2 h-12 cursor-ew-resize z-10 group ${
              isHovered ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-200`}
            onMouseDown={(e) => onResizeStart?.(e, widget, 'w', 'x')}
          >
            <div className="w-1 h-full bg-ui-border-interactive rounded-full mx-auto group-hover:w-2 transition-all" />
          </div>

          {/* Bottom edge */}
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-12 cursor-ns-resize z-10 group ${
              isHovered ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-200`}
            onMouseDown={(e) => onResizeStart?.(e, widget, 's', 'y')}
          >
            <div className="h-1 w-full bg-ui-border-interactive rounded-full group-hover:h-2 transition-all" />
          </div>

          {/* Top edge */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 h-2 w-12 cursor-ns-resize z-10 group ${
              isHovered ? 'opacity-100' : 'opacity-0'
            } transition-opacity duration-200`}
            onMouseDown={(e) => onResizeStart?.(e, widget, 'n', 'y')}
          >
            <div className="h-1 w-full bg-ui-border-interactive rounded-full group-hover:h-2 transition-all" />
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deletePrompt.state && (
        <div className="absolute inset-0 bg-ui-bg-base/90 rounded-lg flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="p-4 text-center">
            <UiText size="small" className="mb-4">Delete this widget?</UiText>
            <div className="flex gap-2">
              <Button size="small" variant="secondary" onClick={deletePrompt.close}>
                Cancel
              </Button>
              <Button size="small" variant="danger" onClick={() => {
                onDelete(widget.id)
                deletePrompt.close()
              }}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}