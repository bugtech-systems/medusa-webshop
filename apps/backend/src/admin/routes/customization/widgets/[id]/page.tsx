'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from "react-router-dom"
import { 
  FocusModal, 
  Heading, 
  Text, 
  Button, 
  Container,
  Badge,
  StatusBadge,
  Table,
  ProgressAccordion,
} from "@medusajs/ui"
import { 
  AtSymbol, 
  Phone, 
  ChartBar, 
  ListBullet,
  Calendar,
  Envelope,
  CurrencyDollar
} from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { TableCellsMerge, TrendingUp } from 'lucide-react'

// Types (keep the same as before)
interface WidgetDetails {
  id: string
  type: 'stat' | 'table' | 'list' | 'chart'
  title: string
  description?: string
  config: StatConfig | TableConfig | ListConfig | ChartConfig
  data: any
  metadata?: {
    createdAt: string
    updatedAt: string
    createdBy?: string
    tags?: string[]
    version?: number
  }
}

interface StatConfig {
  value: number
  previousValue?: number
  trend?: number
  trendDirection?: 'up' | 'down'
  format?: 'currency' | 'number' | 'percentage'
  icon?: string
  details?: {
    label: string
    value: number
  }[]
}

interface TableConfig {
  columns: Array<{
    key: string
    label: string
    type?: 'text' | 'badge' | 'status' | 'currency' | 'date'
    width?: string
  }>
  data: any[]
  totalRows?: number
  summary?: {
    label: string
    value: number
  }[]
}

interface ListConfig {
  items: Array<{
    primary: string
    secondary?: string
    metadata?: Record<string, any>
    icon?: string
    badge?: {
      text: string
      color?: 'grey' | 'green' | 'red' | 'blue' | 'orange'
    }
  }>
  variant?: 'default' | 'compact'
  groups?: {
    label: string
    count: number
  }[]
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie'
  data: any[]
  dataKey: string
  xAxisKey?: string
  colors?: string[]
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  summary?: {
    total: number
    average: number
    min: number
    max: number
  }
}

// Custom hook for fetching widget details
function useWidgetDetails(id: string) {
  const [widget, setWidget] = useState<WidgetDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWidgetDetails = async () => {
      try {
        setLoading(true)
        // Replace with actual API call
        const response = await fetch(`/api/widgets/${id}`)
        if (!response.ok) throw new Error('Failed to fetch widget details')
        const data = await response.json()
        setWidget(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        toast.error('Failed to load widget details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchWidgetDetails()
    }
  }, [id])

  return { widget, loading, error }
}

// Widget Content Renderers (keep the same as before)
const StatWidgetView = ({ config, metadata }: { config: StatConfig; metadata?: WidgetDetails['metadata'] }) => {
  const formatValue = (value: number) => {
    switch (config.format) {
      case 'currency':
        return <CurrencyAmount amount={value} currency="USD" />
      case 'percentage':
        return `${value}%`
      default:
        return value?.toLocaleString()
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Stat */}
      <Container className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <Text size="small" className="text-ui-fg-subtle flex items-center gap-1">
              {config.icon && <span>{config.icon}</span>}
              Current Value
            </Text>
            <Heading level="h1" className="text-3xl font-semibold mt-2">
              {formatValue(config.value)}
            </Heading>
          </div>
          {config.trend && (
            <Badge color={config.trendDirection === 'up' ? 'green' : 'red'}>
              {config.trendDirection === 'up' ? '↑' : '↓'} {Math.abs(config.trend)}%
            </Badge>
          )}
        </div>

        {config.previousValue && (
          <div className="mt-4 pt-4 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-subtle">
              Previous: {formatValue(config.previousValue)}
            </Text>
          </div>
        )}
      </Container>

      {/* Details Grid */}
      {config.details && config.details.length > 0 && (
        <Container className="p-6">
          <Heading level="h2" className="text-lg font-medium mb-4">
            Breakdown
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            {config.details.map((detail, index) => (
              <div key={index} className="p-3 bg-ui-bg-subtle rounded-lg">
                <Text size="small" className="text-ui-fg-subtle">
                  {detail.label}
                </Text>
                <Text weight="plus" className="text-lg">
                  {formatValue(detail.value)}
                </Text>
              </div>
            ))}
          </div>
        </Container>
      )}

      {/* Metadata */}
      {metadata && (
        <Container className="p-6">
          <Heading level="h2" className="text-lg font-medium mb-4">
            Widget Information
          </Heading>
          <div className="space-y-2">
            {metadata.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="text-ui-fg-subtle w-4 h-4" />
                <Text size="small">
                  Created: {new Date(metadata.createdAt).toLocaleString()}
                </Text>
              </div>
            )}
            {metadata.updatedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="text-ui-fg-subtle w-4 h-4" />
                <Text size="small">
                  Updated: {new Date(metadata.updatedAt).toLocaleString()}
                </Text>
              </div>
            )}
            {metadata.createdBy && (
              <div className="flex items-center gap-2">
                <Envelope className="text-ui-fg-subtle w-4 h-4" />
                <Text size="small">Created by: {metadata.createdBy}</Text>
              </div>
            )}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {metadata.tags.map((tag, index) => (
                    <Badge key={index} size="small">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Container>
      )}
    </div>
  )
}

const TableWidgetView = ({ config, metadata }: { config: TableConfig; metadata?: WidgetDetails['metadata'] }) => {
  const renderCell = (item: any, column: TableConfig['columns'][0]) => {
    const value = item[column.key]

    switch (column.type) {
      case 'badge':
        return <Badge>{value}</Badge>
      case 'status':
        return (
          <StatusBadge color={value === 'active' ? 'green' : 'grey'}>
            {value}
          </StatusBadge>
        )
      case 'currency':
        return <CurrencyAmount amount={value} currency="USD" />
      case 'date':
        return new Date(value).toLocaleDateString()
      default:
        return value
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {config.summary && config.summary.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {config.summary.map((item, index) => (
            <Container key={index} className="p-4">
              <Text size="small" className="text-ui-fg-subtle">
                {item.label}
              </Text>
              <Text weight="plus" className="text-xl">
                {item.value.toLocaleString()}
              </Text>
            </Container>
          ))}
        </div>
      )}

      {/* Table */}
      <Container className="p-0 overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              {config.columns.map((column) => (
                <Table.HeaderCell key={column.key}>
                  {column.label}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {config.data.map((item, index) => (
              <Table.Row key={index}>
                {config.columns.map((column) => (
                  <Table.Cell key={`${index}-${column.key}`}>
                    {renderCell(item, column)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {config.totalRows && config.totalRows > config.data.length && (
          <div className="p-4 border-t border-ui-border-base bg-ui-bg-subtle">
            <Text size="small" className="text-ui-fg-subtle">
              Showing {config.data.length} of {config.totalRows} rows
            </Text>
          </div>
        )}
      </Container>

      {/* Metadata */}
      {metadata && (
        <Container className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="text-ui-fg-subtle w-4 h-4" />
              <Text size="small">
                Last updated: {new Date(metadata.updatedAt).toLocaleString()}
              </Text>
            </div>
            {metadata.version && (
              <Badge size="small">Version {metadata.version}</Badge>
            )}
          </div>
        </Container>
      )}
    </div>
  )
}

const ListWidgetView = ({ config, metadata }: { config: ListConfig; metadata?: WidgetDetails['metadata'] }) => {
  return (
    <div className="space-y-6">
      {/* Groups */}
      {config.groups && config.groups.length > 0 && (
        <Container className="p-4">
          <div className="flex gap-4">
            {config.groups.map((group, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge>{group.label}</Badge>
                <Text size="small">{group.count}</Text>
              </div>
            ))}
          </div>
        </Container>
      )}

      {/* List Items */}
      <Container className="p-4">
        <div className="space-y-2">
          {config.items.map((item, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-3 rounded-lg hover:bg-ui-bg-subtle ${
                config.variant === 'compact' ? 'py-2' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon && (
                  <span className="text-ui-fg-subtle text-lg">{item.icon}</span>
                )}
                <div>
                  <Text size={config.variant === 'compact' ? 'small' : 'base'}>
                    {item.primary}
                  </Text>
                  {item.secondary && (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {item.secondary}
                    </Text>
                  )}
                </div>
              </div>
              {item.badge && (
                <Badge color={item.badge.color || 'grey'}>
                  {item.badge.text}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Container>

      {/* Metadata with tags */}
      {metadata?.tags && metadata.tags.length > 0 && (
        <Container className="p-4">
          <Text size="small" className="text-ui-fg-subtle mb-2">
            Tags
          </Text>
          <div className="flex gap-1">
            {metadata.tags.map((tag, index) => (
              <Badge key={index} size="small">{tag}</Badge>
            ))}
          </div>
        </Container>
      )}
    </div>
  )
}

const ChartWidgetView = ({ config, metadata }: { config: ChartConfig; metadata?: WidgetDetails['metadata'] }) => {
  const COLORS = config.colors || ['#2563eb', '#7c3aed', '#db2777', '#ea580c']

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={config.height || 400}>
            <BarChart data={config.data}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxisKey} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={config.dataKey} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={config.height || 400}>
            <LineChart data={config.data}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxisKey} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={config.dataKey} stroke={COLORS[0]} />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={config.height || 400}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.dataKey}
                nameKey={config.xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Chart Summary */}
      {config.summary && (
        <Container className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle">Total</Text>
              <Text weight="plus">{config.summary.total.toLocaleString()}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Average</Text>
              <Text weight="plus">{config.summary.average.toLocaleString()}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Min</Text>
              <Text weight="plus">{config.summary.min.toLocaleString()}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Max</Text>
              <Text weight="plus">{config.summary.max.toLocaleString()}</Text>
            </div>
          </div>
        </Container>
      )}

      {/* Chart */}
      <Container className="p-6">
        {config.showLegend && (
          <div className="flex gap-4 mb-4">
            {config.data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <Text size="small">{item[config.xAxisKey || 'name']}</Text>
              </div>
            ))}
          </div>
        )}
        {renderChart()}
      </Container>
    </div>
  )
}

// Main Focus Modal Component
export default function WidgetViewModal() {
  const params = useParams()
  const navigate = useNavigate()
  const widgetId = params.id as string
  const [isModalOpen, setIsModalOpen] = useState(true)
  const { widget, loading, error } = useWidgetDetails(widgetId)

  // Handle modal close and navigate back
  const handleClose = () => {
    setIsModalOpen(false)
    // Navigate back to previous page
    navigate(-1)
  }

  // Handle modal open change from FocusModal component
  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      // Navigate back when modal is closed
      navigate(-1)
    }
  }

  // Get icon based on widget type
  const getWidgetIcon = () => {
    switch (widget?.type) {
      case 'stat':
        return <TrendingUp className="text-ui-fg-subtle" />
      case 'table':
        return <TableCellsMerge className="text-ui-fg-subtle" />
      case 'list':
        return <ListBullet className="text-ui-fg-subtle" />
      case 'chart':
        return <ChartBar className="text-ui-fg-subtle" />
      default:
        return null
    }
  }

  // Render widget content based on type
  const renderWidgetContent = () => {
    if (!widget) return null
    
    switch (widget.type) {
      case 'stat':
        return <StatWidgetView config={widget.config as StatConfig} metadata={widget.metadata} />
      case 'table':
        return <TableWidgetView config={widget.config as TableConfig} metadata={widget.metadata} />
      case 'list':
        return <ListWidgetView config={widget.config as ListConfig} metadata={widget.metadata} />
      case 'chart':
        return <ChartWidgetView config={widget.config as ChartConfig} metadata={widget.metadata} />
      default:
        return (
          <Container className="p-8 text-center">
            <Text className="text-ui-fg-subtle">
              Unsupported widget type: {widget.type}
            </Text>
          </Container>
        )
    }
  }

  // Render loading state
  if (loading) {
    return (
      <FocusModal open={isModalOpen} onOpenChange={handleOpenChange}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center justify-center overflow-y-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-ui-border-base border-t-ui-fg-base rounded-full animate-spin" />
              <Text>Loading widget details...</Text>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    )
  }

  // Render error state
  if (error || !widget) {
    return (
      <FocusModal open={isModalOpen} onOpenChange={handleOpenChange}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center justify-center overflow-y-auto">
            <Container className="p-8 text-center">
              <Text className="text-ui-fg-error mb-4">
                {error || 'Widget not found'}
              </Text>
              <Button variant="secondary" onClick={handleClose}>
                Go Back
              </Button>
            </Container>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    )
  }

  return (
    <FocusModal open={isModalOpen} onOpenChange={handleOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center gap-2">
            {getWidgetIcon()}
            <Text weight="plus" className="text-ui-fg-base">
              Widget ID: {widget.id}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {widget.metadata?.version && (
              <Badge size="small">v{widget.metadata.version}</Badge>
            )}
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </FocusModal.Header>
        
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="max-w-4xl w-full p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                {getWidgetIcon()}
                <Heading level="h1">
                  {widget.title}
                </Heading>
                <Badge color="blue" className="ml-2">
                  {widget.type.charAt(0).toUpperCase() + widget.type.slice(1)}
                </Badge>
              </div>
              {widget.description && (
                <Text className="text-ui-fg-subtle">
                  {widget.description}
                </Text>
              )}
            </div>

            {/* Widget Content */}
            {renderWidgetContent()}

            {/* Export/Action Buttons */}
            <div className="mt-8 flex justify-end gap-2">
              <Button variant="secondary">
                Export Data
              </Button>
              <Button variant="secondary">
                Share
              </Button>
              <Button variant="primary" onClick={() => {
                // Refresh logic here
                toast.success('Widget refreshed')
              }}>
                Refresh
              </Button>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}