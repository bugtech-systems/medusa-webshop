import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Bolt, Plus, Webshipper, DocumentSeries,  Funnel, ArrowUpDown, Eye } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  Toaster,
  Input,
  Select,
  DropdownMenu,
  IconButton,
  StatusBadge,
  Switch,
  Label,
  Tooltip,
} from "@medusajs/ui"
import { useActions } from "../../../hooks/api/actions"
import { ActionFormDrawer } from "./components/action-form-drawer"
import { ActionActionsMenu } from "./components/action-actions-menu"
import { useState, useMemo } from "react"
import { Code, Workflow } from "lucide-react"

type SortField = 'name' | 'type' | 'status' | 'created_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'
type FilterStatus = 'all' | 'active' | 'draft' | 'inactive' | 'in-use' | 'archived'
type FilterType = 'all' | 'DB_OPERATION' | 'API_CALL' | 'AI_ACTION' | 'WORKFLOW' | 'SCRIPT'

// Define which statuses are visible by default
const DEFAULT_VISIBLE_STATUSES = ['active', 'draft', 'inactive']
const ADVANCED_STATUSES = ['in-use', 'archived']

const ActionsPage = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [showAdvancedStatuses, setShowAdvancedStatuses] = useState(false)

  const { data, isLoading, isError } = useActions({
    fields: "id,name,description,handle,type,status,created_at,updated_at",
    limit: 1000,
    offset: 0,
  })

  // Get visible statuses based on toggle
  const getVisibleStatuses = () => {
    return showAdvancedStatuses 
      ? [...DEFAULT_VISIBLE_STATUSES, ...ADVANCED_STATUSES]
      : DEFAULT_VISIBLE_STATUSES
  }

  // Available status options based on toggle
  const getStatusOptions = () => {
    const baseOptions = [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'draft', label: 'Draft' },
      { value: 'inactive', label: 'Inactive' },
    ]

    const advancedOptions = [
      { value: 'in-use', label: 'In Use' },
      { value: 'archived', label: 'Archived' },
    ]

    return showAdvancedStatuses 
      ? [...baseOptions, ...advancedOptions]
      : baseOptions
  }

  // Filter and sort actions
  const filteredAndSortedActions = useMemo(() => {
    if (!data?.actions) return []

    let filtered = [...data.actions]

    // First, filter by visible statuses if showing only default statuses
    if (!showAdvancedStatuses) {
      filtered = filtered.filter(action => 
        DEFAULT_VISIBLE_STATUSES.includes(action.status)
      )
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(action => 
        action.name.toLowerCase().includes(query) ||
        action.handle.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter (only if not 'all' and the status is valid for current view)
    if (statusFilter !== 'all') {
      // Only apply the filter if the status is visible in the current view
      const visibleStatuses = getVisibleStatuses()
      if (visibleStatuses.includes(statusFilter) || statusFilter === 'all') {
        filtered = filtered.filter(action => action.status === statusFilter)
      }
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(action => action.type === typeFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle date fields
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      // Handle number comparison
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return filtered
  }, [data?.actions, searchQuery, sortField, sortOrder, statusFilter, typeFilter, showAdvancedStatuses])

  const getTypeIcon = (type: string) => {
    const icons = {
      DB_OPERATION: <DocumentSeries className="text-ui-fg-subtle" />,
      API_CALL: <Webshipper className="text-ui-fg-subtle" />,
      AI_ACTION: <Bolt className="text-ui-fg-subtle" />,
      WORKFLOW: <Workflow className="text-ui-fg-subtle" />,
      SCRIPT: <Code className="text-ui-fg-subtle" />
    }
    return icons[type as keyof typeof icons] || <Bolt className="text-ui-fg-subtle" />
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, "green" | "orange" | "grey" | "blue" | "red" | "purple"> = {
      active: "green",
      draft: "orange",
      inactive: "grey",
      "in-use": "blue",
      archived: "red"
    }
    return colors[status] || "grey"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Active",
      draft: "Draft",
      inactive: "Inactive",
      "in-use": "In Use",
      archived: "Archived"
    }
    return labels[status] || status
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Table.HeaderCell className="cursor-pointer group" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown 
          className={`w-4 h-4 transition-opacity ${
            sortField === field 
              ? 'opacity-100 text-ui-fg-interactive' 
              : 'opacity-0 group-hover:opacity-50'
          }`}
        />
        {sortField === field && (
          <span className="text-xs ml-1">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </Table.HeaderCell>
  )

  // Reset status filter if it's not visible in current view
  const handleStatusFilterChange = (value: FilterStatus) => {
    setStatusFilter(value)
  }

  // Calculate counts for summary
  const totalVisibleActions = useMemo(() => {
    if (!data?.actions) return 0
    if (!showAdvancedStatuses) {
      return data.actions.filter(a => DEFAULT_VISIBLE_STATUSES.includes(a.status)).length
    }
    return data.actions.length
  }, [data?.actions, showAdvancedStatuses])

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <Heading className="font-sans font-medium h1-core">Actions</Heading>
            <ActionFormDrawer>
              <Button variant="secondary" size="small">
                <Plus /> Create Action
              </Button>
            </ActionFormDrawer>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, handle, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Status Filter */}
              <Select 
                value={statusFilter} 
                onValueChange={handleStatusFilterChange}
              >
                <Select.Trigger className="w-[160px]">
                  <Select.Value placeholder="Filter by status" />
                </Select.Trigger>
                <Select.Content>
                  {getStatusOptions().map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>

              {/* Type Filter */}
              <Select 
                value={typeFilter} 
                onValueChange={(value: FilterType) => setTypeFilter(value)}
              >
                <Select.Trigger className="w-[160px]">
                  <Select.Value placeholder="Filter by type" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Types</Select.Item>
                  <Select.Item value="DB_OPERATION">Database Operation</Select.Item>
                  <Select.Item value="API_CALL">API Call</Select.Item>
                  <Select.Item value="AI_ACTION">AI Action</Select.Item>
                  <Select.Item value="WORKFLOW">Workflow</Select.Item>
                  <Select.Item value="SCRIPT">Script</Select.Item>
                </Select.Content>
              </Select>

              {/* Clear Filters Button - shown when filters are active */}
              {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setTypeFilter("all")
                  }}
                >
                  <Funnel /> Clear Filters
                </Button>
              )}
            </div>

            {/* Advanced Status Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-advanced-statuses"
                  checked={showAdvancedStatuses}
                  onCheckedChange={(checked) => {
                    setShowAdvancedStatuses(checked)
                    // Reset status filter if it's an advanced status and we're hiding them
                    if (!checked && ADVANCED_STATUSES.includes(statusFilter)) {
                      setStatusFilter('all')
                    }
                  }}
                />
                <Label htmlFor="show-advanced-statuses" className="text-sm">
                  Show advanced statuses
                </Label>
              </div>
              <Tooltip content="Show In Use and Archived statuses in filters">
                <Badge size="small" color="blue" className="cursor-help">
                  <Eye className="w-3 h-3" />
                </Badge>
              </Tooltip>
            </div>
          </div>

          {/* Filter summary */}
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap">
              <Text size="small" className="text-ui-fg-subtle">
                Showing {filteredAndSortedActions.length} of {totalVisibleActions} actions
              </Text>
              {searchQuery && (
                <Badge size="small" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge 
                  size="small" 
                  color={getStatusColor(statusFilter)}
                  className="flex items-center gap-1 capitalize"
                >
                  Status: {getStatusLabel(statusFilter)}
                </Badge>
              )}
              {typeFilter !== 'all' && (
                <Badge size="small" className="flex items-center gap-1">
                  Type: {typeFilter.replace('_', ' ')}
                </Badge>
              )}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="p-8 text-center">
            <Text>Loading actions...</Text>
          </div>
        )}

        {isError && (
          <div className="p-8 text-center">
            <Text className="text-ui-fg-subtle">
              Error loading actions. Please try again.
            </Text>
          </div>
        )}

        {!isLoading && !isError && (
          <Table>
            <Table.Header>
              <Table.Row>
                <SortableHeader field="name">Name</SortableHeader>
                <SortableHeader field="type">Type</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="created_at">Created</SortableHeader>
                <SortableHeader field="updated_at">Updated</SortableHeader>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {filteredAndSortedActions.map((template) => (
                <Table.Row
                  key={template.id}
                  className="cursor-pointer hover:bg-ui-bg-base-hover group"
                  onClick={() =>
                    (window.location.href = `/app/arm/actions/${template.id}`)
                  }
                >
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ui-bg-base-component group-hover:bg-ui-bg-base-hover">
                        {getTypeIcon(template.type)}
                      </div>
                      <div>
                        <Text className="font-medium">{template.name}</Text>
                        <div className="flex items-center gap-2">
                          <Text className="text-ui-fg-subtle font-mono text-xs" size="small">
                            {template.handle}
                          </Text>
                          {template.description && (
                            <>
                              <span className="text-ui-fg-subtle">•</span>
                              <Text className="text-ui-fg-subtle text-xs" size="small">
                                {template.description}
                              </Text>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="small" className="capitalize">
                      {template.type.replace('_', ' ')}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge color={getStatusColor(template.status)}>
                      {getStatusLabel(template.status)}
                    </StatusBadge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {new Date(template.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {new Date(template.updated_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <ActionActionsMenu action={template} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {!isLoading && !isError && filteredAndSortedActions.length === 0 && (
          <div className="p-8 text-center">
            <Text className="text-ui-fg-subtle">
              {totalVisibleActions === 0 
                ? "No actions found. Create your first action to get started."
                : "No actions match your filters. Try adjusting your search criteria."}
            </Text>
          </div>
        )}
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "Actions",
  rank: 0,
  icon: Bolt,
})

export default ActionsPage