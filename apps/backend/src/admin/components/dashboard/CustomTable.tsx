// src/admin/components/custom-table/page.tsx
import { 
  Container, 
  Heading, 
  Button, 
  Table,
  Badge,
  Text,
  Checkbox,
  Input,
  Select,
  DatePicker,
  DropdownMenu,
  IconButton,
  Prompt,
  toast
} from "@medusajs/ui"
import { 
  EllipsisHorizontal, 
  Funnel, 
  MagnifyingGlass, 
  ArrowUpDown,
  ArrowDownCircle,
  XMark
} from "@medusajs/icons"
import { useState, useMemo } from "react"

// Types
export interface Column {
  id: string
  header: string
  accessorKey: string
  enableSorting?: boolean
  enableFiltering?: boolean
  filterType?: 'text' | 'select' | 'date'
  filterOptions?: { label: string; value: any }[]
  cell?: (value: any, row: any) => React.ReactNode
}

interface Filter {
  id: string
  value: any
  operator?: 'contains' | 'equals' | 'greaterThan' | 'lessThan' | 'between'
}

interface TableData {
  id: string
  [key: string]: any
}

interface CustomTablePageProps {
  title: string
  description?: string
  columns: Column[]
  data: TableData[]
  onBulkAction?: (selectedIds: string[]) => void
  onRowClick?: (row: TableData) => void
  customActions?: React.ReactNode
  bulkActions?: (selectedIds: string[]) => React.ReactNode
  enableExport?: boolean
  enableSearch?: boolean
  enableFilters?: boolean
  enableColumnVisibility?: boolean
  enableRowSelection?: boolean
  pageSize?: number
}

const CustomTablePage = ({
  title,
  description,
  columns,
  data,
  onBulkAction,
  onRowClick,
  customActions,
  bulkActions,
  enableExport = true,
  enableSearch = true,
  enableFilters = true,
  enableRowSelection = true,
  pageSize = 10
}: CustomTablePageProps) => {
  // State management
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<Filter[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [showExportPrompt, setShowExportPrompt] = useState(false)

  // Filterable columns
  const filterableColumns = useMemo(
    () => columns.filter(col => col.enableFiltering),
    [columns]
  )

  // Handle sorting
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId)
    if (!column?.enableSorting) return

    setSortConfig(current => {
      if (current?.key === columnId) {
        return {
          key: columnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key: columnId, direction: 'asc' }
    })
  }

  // Apply filters and search to data
  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchQuery && enableSearch) {
      result = result.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    // Apply filters
    filters.forEach(filter => {
      const column = columns.find(col => col.id === filter.id)
      if (!column) return

      result = result.filter(item => {
        const value = item[column.accessorKey]
        
        if (filter.operator === 'contains') {
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
        } else if (filter.operator === 'equals') {
          return value === filter.value
        } else if (filter.operator === 'greaterThan') {
          return value > filter.value
        } else if (filter.operator === 'lessThan') {
          return value < filter.value
        } else if (filter.operator === 'between') {
          return value >= filter.value[0] && value <= filter.value[1]
        }
        return true
      })
    })

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchQuery, filters, sortConfig, columns, enableSearch])

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  // Selection handlers
  const toggleAllRows = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(paginatedData.map(row => row.id))
    }
  }

  const toggleRow = (id: string) => {
    setSelectedRows(current =>
      current.includes(id)
        ? current.filter(rowId => rowId !== id)
        : [...current, id]
    )
  }

  // Export to CSV
  const exportToCSV = async () => {
    setExportLoading(true)
    try {
      const headers = columns.map(col => col.header)
      const csvData = filteredData.map(row =>
        columns.map(col => {
          const value = row[col.accessorKey]
          // Handle commas in values by wrapping in quotes
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value || ''
        })
      )

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '-')}-export.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("Export successful", {
        description: `${filteredData.length} records exported`,
      })
    } catch (error) {
      toast.error("Export failed", {
        description: "An error occurred while exporting data"
      })
    } finally {
      setExportLoading(false)
      setShowExportPrompt(false)
    }
  }

  // Add a new filter
  const addFilter = (columnId: string, value: any, operator?: string) => {
    // Check if filter already exists
    const existingFilter = filters.find(f => f.id === columnId)
    if (existingFilter) {
      // Update existing filter
      setFilters(current => 
        current.map(f => 
          f.id === columnId 
            ? { ...f, value, operator: operator as any }
            : f
        )
      )
    } else {
      // Add new filter
      setFilters(current => [
        ...current,
        { id: columnId, value, operator: operator as any }
      ])
    }
  }

  // Remove a filter
  const removeFilter = (filterId: string) => {
    setFilters(current => current.filter(f => f.id !== filterId))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters([])
    setSearchQuery("")
    setCurrentPage(1)
  }

  return (
    <Container>
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{title}</Heading>
          {description && (
            <Text className="text-ui-fg-subtle mt-1">{description}</Text>
          )}
        </div>
        <div className="flex items-center gap-2">
          {customActions}
          {enableExport && (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowExportPrompt(true)}
                disabled={filteredData.length === 0}
              >
                <ArrowDownCircle className="mr-2" />
                Export
              </Button>
              <Prompt open={showExportPrompt} onOpenChange={setShowExportPrompt}>
                <Prompt.Content>
                  <Prompt.Header>
                    <Prompt.Title>Export Data</Prompt.Title>
                    <Prompt.Description>
                      You are about to export {filteredData.length} records. 
                      This may take a moment depending on the amount of data.
                    </Prompt.Description>
                  </Prompt.Header>
                  <Prompt.Footer>
                    <Prompt.Cancel>Cancel</Prompt.Cancel>
                    <Prompt.Action onClick={exportToCSV} disabled={exportLoading}>
                      {exportLoading ? "Exporting..." : "Export"}
                    </Prompt.Action>
                  </Prompt.Footer>
                </Prompt.Content>
              </Prompt>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      {(enableSearch || enableFilters) && (
        <div className="px-6 py-4 border-t border-ui-border-base">
          <div className="flex items-center gap-2">
            {enableSearch && (
              <div className="flex-1">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefix={<MagnifyingGlass className="text-ui-fg-subtle" />}
                />
              </div>
            )}
            {enableFilters && filterableColumns.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Funnel className="mr-2" />
                Filters
                {filters.length > 0 && (
                  <Badge size="small" className="ml-2">
                    {filters.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {filters.map(filter => {
                const column = columns.find(c => c.id === filter.id)
                return (
                  <Badge key={filter.id} size="large" className="flex items-center gap-1">
                    <span className="font-medium">{column?.header}:</span>
                    <span>{String(filter.value)}</span>
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="ml-1 hover:text-ui-fg-error"
                    >
                      <XMark className="w-3 h-3" />
                    </button>
                  </Badge>
                )
              })}
              <Button
                variant="transparent"
                size="small"
                onClick={clearFilters}
                className="text-ui-fg-subtle"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && filterableColumns.length > 0 && (
        <div className="px-6 py-4 border-t border-ui-border-base bg-ui-bg-subtle">
          <div className="flex items-center justify-between mb-4">
            <Text size="small" weight="plus">
              Add filters
            </Text>
            <Button
              variant="transparent"
              size="small"
              onClick={() => setShowFilters(false)}
            >
              <XMark />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {filterableColumns.map(column => (
              <div key={column.id} className="flex flex-col gap-2">
                <Text size="small" weight="plus">
                  {column.header}
                </Text>
                {column.filterType === 'select' && column.filterOptions && (
                  <Select
                    onValueChange={(value) => {
                      const option = column.filterOptions?.find(opt => opt.value === value)
                      if (option?.value?.operator) {
                        addFilter(column.id, option.value.value, option.value.operator)
                      } else {
                        addFilter(column.id, value, 'equals')
                      }
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Select value" />
                    </Select.Trigger>
                    <Select.Content>
                      {column.filterOptions.map(option => (
                        <Select.Item key={option.value} value={option.value}>
                          {option.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                )}
                {column.filterType === 'date' && (
                  <Input
                    type="date"
                    placeholder="Select date"
                    onChange={(e) => addFilter(column.id, e.target.value, 'equals')}
                  />
                )}
                {(!column.filterType || column.filterType === 'text') && (
                  <Input
                    placeholder="Filter value..."
                    onChange={(e) => addFilter(column.id, e.target.value, 'contains')}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (onBulkAction || bulkActions) && (
        <div className="px-6 py-2 border-t border-ui-border-base bg-ui-bg-subtle">
          <div className="flex items-center justify-between">
            <Text size="small">
              {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
            </Text>
            <div className="flex items-center gap-2">
              {bulkActions ? (
                bulkActions(selectedRows)
              ) : (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => onBulkAction?.(selectedRows)}
                >
                  Bulk Action
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              {enableRowSelection && (
                <Table.HeaderCell className="w-10">
                  <Checkbox
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={toggleAllRows}
                  />
                </Table.HeaderCell>
              )}
              {columns.map(column => (
                <Table.HeaderCell key={column.id}>
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.enableSorting && (
                      <button onClick={() => handleSort(column.id)}>
                        <ArrowUpDown className="w-4 h-4 text-ui-fg-subtle" />
                      </button>
                    )}
                  </div>
                </Table.HeaderCell>
              ))}
              <Table.HeaderCell className="w-10">
                <span className="sr-only">Actions</span>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <Table.Row
                  key={row.id}
                  className={onRowClick ? "cursor-pointer hover:bg-ui-bg-subtle" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {enableRowSelection && (
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedRows.includes(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      />
                    </Table.Cell>
                  )}
                  {columns.map(column => (
                    <Table.Cell key={`${row.id}-${column.id}`}>
                      {column.cell
                        ? column.cell(row[column.accessorKey], row)
                        : row[column.accessorKey]}
                    </Table.Cell>
                  ))}
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <IconButton variant="transparent">
                          <EllipsisHorizontal />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item className="gap-x-2">
                          Edit
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className="gap-x-2 text-ui-fg-error">
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Table.Cell>
                </Table.Row>
              ))
            ) : (
              <Table.Row>
                <Table.Cell colSpan={columns.length + (enableRowSelection ? 2 : 1)}>
                  <div className="flex flex-col items-center justify-center py-12">
                    <Text className="text-ui-fg-subtle">No items found</Text>
                    <Button
                      variant="secondary"
                      size="small"
                      className="mt-4"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-ui-border-base">
          <Text size="small" className="text-ui-fg-subtle">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
            {filteredData.length} results
          </Text>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i
                }
                if (pageNum <= totalPages) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "secondary"}
                      size="small"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8"
                    >
                      {pageNum}
                    </Button>
                  )
                }
                return null
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <Text className="text-ui-fg-subtle">...</Text>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="secondary"
              size="small"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export default CustomTablePage