import React, { useState } from "react"
import {
  Container,
  Text,
  Heading,
  Badge,
  Table,
  Input,
  Select,
  Button,
  ProgressAccordion,
  Copy,
} from "@medusajs/ui"
import {
  ArrowUpCircleSolid,
  ArrowDown,
  EllipsisHorizontal,
  ChartBar,
  ChartActivity,
  ChartPie,
} from "@medusajs/icons"

// Stat Widget
interface StatWidgetProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
    label?: string
  }
  icon?: React.ReactNode
  color?: "blue" | "green" | "red" | "yellow" | "purple"
  isEditing?: boolean
  onUpdate?: (config: any) => void
  onDelete?: () => void
}


// Chart Widget
interface ChartWidgetProps {
  title: string
  type: "line" | "bar" | "pie"
  data: any[]
  options?: {
    showLegend?: boolean
    showGrid?: boolean
    colors?: string[]
  }
  isEditing?: boolean
  onUpdate?: (config: any) => void
}

// Table Widget
interface TableWidgetProps {
  title: string
  columns: Array<{ key: string; label: string }>
  data: Array<Record<string, any>>
  pageSize?: number
  isEditing?: boolean
  onUpdate?: (config: any) => void
}

export const TableWidget = ({
  title,
  columns,
  data,
  pageSize = 5,
  isEditing,
  onUpdate,
}: TableWidgetProps) => {
  const [currentPage, setCurrentPage] = useState(0)
  const start = currentPage * pageSize
  const end = start + pageSize
  const paginatedData = data.slice(start, end)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            className="font-medium"
          />
        ) : (
          <Heading level="h3">{title}</Heading>
        )}
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            {columns.map((col) => (
              <Table.HeaderCell key={col.key}>{col.label}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {paginatedData.map((row, i) => (
            <Table.Row key={i}>
              {columns.map((col) => (
                <Table.Cell key={col.key}>{row[col.key]}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {data.length > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <Text size="small">
            Showing {start + 1} to {Math.min(end, data.length)} of {data.length}
          </Text>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={end >= data.length}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// List Widget
interface ListWidgetProps {
  title: string
  items: Array<{
    id: string
    label: string
    value?: string | number
    icon?: React.ReactNode
    badge?: {
      text: string
      variant?: "success" | "danger" | "warning" | "info"
    }
  }>
  showIcons?: boolean
  isEditing?: boolean
  onUpdate?: (config: any) => void
}

export const ListWidget = ({
  title,
  items,
  showIcons = true,
  isEditing,
  onUpdate,
}: ListWidgetProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            className="font-medium"
          />
        ) : (
          <Heading level="h3">{title}</Heading>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              {showIcons && item.icon && (
                <div className="text-gray-500">{item.icon}</div>
              )}
              <Text size="small" className="font-medium">
                {item.label}
              </Text>
              {item.badge && (
                <Badge variant={item.badge.variant}>{item.badge.text}</Badge>
              )}
            </div>
            {item.value !== undefined && (
              <Text size="small" className="text-gray-600">
                {item.value}
              </Text>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <Button variant="secondary" size="small" className="w-full mt-2">
          Add List Item
        </Button>
      )}
    </div>
  )
}

// Stat Widget
interface StatWidgetProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
    label?: string
  }
  icon?: React.ReactNode
  color?: "blue" | "green" | "red" | "yellow" | "purple"
  isEditing?: boolean
  onUpdate?: (config: any) => void
  onDelete?: () => void
}

export const StatWidget = ({
  title,
  value,
  description,
  trend,
  icon,
  color = "blue",
  isEditing,
  onUpdate,
}: StatWidgetProps) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  }

  const TrendIcon = trend?.direction === "up" 
    ? ArrowUpCircleSolid 
    : trend?.direction === "down" 
    ? ArrowDown 
    : EllipsisHorizontal

  return (
    <div className="p-4 h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => onUpdate?.({ title: e.target.value })}
                className="text-sm font-medium"
              />
            ) : (
              <Text size="small" className="text-gray-500 uppercase tracking-wider">
                {title}
              </Text>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            {isEditing ? (
              <Input
                value={value}
                onChange={(e) => onUpdate?.({ value: e.target.value })}
                className="text-2xl font-bold"
              />
            ) : (
              <Heading level="h1">{value}</Heading>
            )}
            
            {trend && (
              <div className={`flex items-center gap-1 text-sm ${
                trend.direction === "up" 
                  ? "text-green-600" 
                  : trend.direction === "down" 
                  ? "text-red-600" 
                  : "text-gray-500"
              }`}>
                <TrendIcon />
                <span>{trend.value}%</span>
                {trend.label && <span className="text-gray-500">{trend.label}</span>}
              </div>
            )}
          </div>
          
          {description && (
            isEditing ? (
              <Input
                value={description}
                onChange={(e) => onUpdate?.({ description: e.target.value })}
                className="text-sm text-gray-500 mt-1"
              />
            ) : (
              <Text size="small" className="text-gray-500 mt-1">
                {description}
              </Text>
            )
          )}
        </div>
        
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Chart Widget
interface ChartWidgetProps {
  title: string
  type: "line" | "bar" | "pie"
  data: any[]
  options?: {
    showLegend?: boolean
    showGrid?: boolean
    colors?: string[]
  }
  isEditing?: boolean
  onUpdate?: (config: any) => void
}


export const ChartWidget = ({
  title,
  type,
  data,
  options,
  isEditing,
  onUpdate,
}: ChartWidgetProps) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            className="font-medium"
          />
        ) : (
          <Heading level="h3">{title}</Heading>
        )}
        
        {isEditing && (
          <Select onValueChange={(value: any) => onUpdate?.({ type: value })} value={type}>
            <Select.Trigger>
              <Select.Value placeholder="Select chart type" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="line">Line Chart</Select.Item>
              <Select.Item value="bar">Bar Chart</Select.Item>
              <Select.Item value="pie">Pie Chart</Select.Item>
            </Select.Content>
          </Select>
        )}
      </div>

      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        {/* Chart placeholder */}
        <div className="text-center text-gray-400">
          {type === "line" && <ChartActivity />}
          {type === "bar" && <ChartBar />}
          {type === "pie" && <ChartPie />}
          <p className="text-sm mt-2">Chart visualization would render here</p>
          <p className="text-xs">Data points: {data?.length}</p>
        </div>
      </div>

      {options?.showLegend && (
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <Text size="small">Series 1</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <Text size="small">Series 2</Text>
          </div>
        </div>
      )}
    </div>
  )
}