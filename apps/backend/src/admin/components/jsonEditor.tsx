import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Edit2, Eye, Copy, Check, AlertCircle } from 'lucide-react'

interface JsonEditorProps {
  value: Record<string, any> | any[]
  onChange: (value: Record<string, any> | any[]) => void
  height?: string
  placeholder?: string
  readOnly?: boolean
}

type ViewMode = 'tree' | 'code'

const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  height = '400px',
  placeholder = '{}',
  readOnly = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [jsonText, setJsonText] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))

  // Initialize jsonText from value
  useEffect(() => {
    try {
      setJsonText(JSON.stringify(value, null, 2))
    } catch (e) {
      setJsonText('')
    }
  }, [value])

  // Handle JSON text changes
  const handleJsonTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setJsonText(text)
    
    try {
      if (text.trim() === '') {
        onChange(Array.isArray(value) ? [] : {})
        setJsonError(null)
      } else {
        const parsed = JSON.parse(text)
        onChange(parsed)
        setJsonError(null)
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
    }
  }

  // Format JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
      setJsonError(null)
    } catch (error) {
      setJsonError('Cannot format invalid JSON')
    }
  }

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Toggle node expansion
  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Handle value change in tree view
  const handleTreeValueChange = (path: string[], newValue: any) => {
    const newData = { ...value }
    let current: any = newData
    
    // Navigate to the parent
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) return
      current = current[path[i]]
    }
    
    const key = path[path.length - 1]
    
    if (newValue === undefined) {
      // Delete the key
      if (Array.isArray(current)) {
        current.splice(parseInt(key), 1)
      } else {
        delete current[key]
      }
    } else {
      // Update the value
      current[key] = newValue
    }
    
    onChange(newData)
  }

  // Add new key-value pair
  const handleAddKey = (parentPath: string[], keyType: 'string' | 'number' | 'boolean' | 'object' | 'array') => {
    const newData = { ...value }
    let current: any = newData
    
    for (const path of parentPath) {
      if (!current[path]) return
      current = current[path]
    }
    
    let newKey = `new_${Date.now()}`
    let i = 1
    while (current.hasOwnProperty(newKey)) {
      newKey = `new_${Date.now()}_${i}`
      i++
    }
    
    switch (keyType) {
      case 'string':
        current[newKey] = ''
        break
      case 'number':
        current[newKey] = 0
        break
      case 'boolean':
        current[newKey] = false
        break
      case 'object':
        current[newKey] = {}
        break
      case 'array':
        current[newKey] = []
        break
    }
    
    onChange(newData)
  }

  // Render tree view
  const renderJsonTree = useCallback((data: any, path: string[] = [], level: number = 0) => {
    if (data === null) return <span className="text-gray-500">null</span>
    if (data === undefined) return <span className="text-gray-500">undefined</span>
    
    const type = Array.isArray(data) ? 'array' : typeof data
    
    if (type !== 'object' || data === null) {
      // Primitive value
      return (
        <span className={`
          ${type === 'string' ? 'text-green-600' : ''}
          ${type === 'number' ? 'text-blue-600' : ''}
          ${type === 'boolean' ? 'text-purple-600' : ''}
          ${data === null ? 'text-gray-500' : ''}
        `}>
          {type === 'string' ? `"${data}"` : String(data)}
        </span>
      )
    }
    
    const isArray = Array.isArray(data)
    const keys = Object.keys(data)
    const isEmpty = keys.length === 0
    const pathKey = path.join('.') || 'root'
    const isExpanded = expandedNodes.has(pathKey)
    
    if (isEmpty) {
      return <span className="text-gray-400">{isArray ? '[]' : '{}'}</span>
    }
    
    return (
      <div className="font-mono text-sm">
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1"
          onClick={() => toggleNode(pathKey)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-gray-600">
            {isArray ? '[' : '{'}
            {!isExpanded && (
              <span className="text-gray-400 ml-1">
                {keys.length} {keys.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </span>
        </div>
        
        {isExpanded && (
          <div className="ml-4 border-l-2 border-gray-100 pl-4">
            {keys.map((key, index) => {
              const currentPath = [...path, key]
              const value = data[key]
              const isLast = index === keys.length - 1
              
              return (
                <div key={key} className="mb-1 group relative">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-700 font-medium">{key}:</span>
                    <div className="flex-1">
                      {renderJsonTree(value, currentPath, level + 1)}
                    </div>
                    
                    {!readOnly && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 flex gap-1 bg-white px-1">
                        {typeof value === 'string' && (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleTreeValueChange(currentPath, e.target.value)}
                            className="w-24 px-1 py-0.5 text-xs border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {typeof value === 'number' && (
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => handleTreeValueChange(currentPath, parseFloat(e.target.value))}
                            className="w-24 px-1 py-0.5 text-xs border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {typeof value === 'boolean' && (
                          <select
                            value={String(value)}
                            onChange={(e) => handleTreeValueChange(currentPath, e.target.value === 'true')}
                            className="px-1 py-0.5 text-xs border rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTreeValueChange(currentPath, undefined)
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  {!isLast && <div className="text-gray-400 text-xs ml-4">,</div>}
                </div>
              )
            })}
            

            
            <div className="text-gray-600 mt-1">
              {isArray ? ']' : '}'}
            </div>
          </div>
        )}
      </div>
    )
  }, [expandedNodes, readOnly])

  // Memoize the tree view to prevent unnecessary re-renders
  const treeView = useMemo(() => {
    try {
      return renderJsonTree(value)
    } catch (error) {
      return <div className="text-red-500">Error rendering JSON tree</div>
    }
  }, [value, renderJsonTree])

  return (
    <div className="border border-gray-200 rounded-lg bg-white" style={{ height }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'tree' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            title="Tree view"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'code' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            title="Code view"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          {viewMode === 'code' && (
            <button
              onClick={formatJson}
              className="ml-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              disabled={!!jsonError}
            >
              Format
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="relative" style={{ height: `calc(${height} - 41px)` }}>
        {viewMode === 'tree' ? (
          <div className="p-4 overflow-auto h-full">
            {Object.keys(value).length === 0 ? (
              <div className="text-gray-400 text-sm italic">
                {placeholder}
              </div>
            ) : (
              treeView
            )}
          </div>
        ) : (
          <div className="relative h-full">
            <textarea
              value={jsonText}
              onChange={handleJsonTextChange}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`w-full h-full p-4 font-mono text-sm resize-none focus:outline-none ${
                jsonError ? 'bg-red-50' : ''
              }`}
              style={{ lineHeight: 1.5 }}
              spellCheck={false}
            />
            
            {jsonError && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{jsonError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 rounded-b-lg text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Type: {Array.isArray(value) ? 'Array' : 'Object'}</span>
          <span>Size: {Object.keys(value).length} items</span>
        </div>
        <div>
          {viewMode === 'code' ? (
            <span>JSON • {jsonError ? 'Invalid' : 'Valid'}</span>
          ) : (
            <span>Tree view • {expandedNodes.size} expanded</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default JsonEditor