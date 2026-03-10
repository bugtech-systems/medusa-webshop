// src/admin/routes/mims-orders/page.tsx
import { 
  Container, 
  Heading, 
  Text,
  Badge,
  StatusBadge,
  Button,
  toast,
  Input,
  Select,
  FocusModal,
  Alert,
  Table
} from "@medusajs/ui"
import { 
  Plus,
  Envelope,
  BuildingStorefront,
  MapPin,
  Calendar,
  Hashtag,
  InformationCircle,
  Phone,
  AtSymbol,
  DocumentText,
  PaperClip,
  EllipsisHorizontal,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import { Copy } from 'lucide-react'
import { Cuboid, Printer, DownloadCloud } from 'lucide-react';
import { useState, useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import CustomTablePage, { Column } from "../../../../components/dashboard/CustomTable"
import { useExecuteAction } from "../../../../hooks/api/actions"
import { DropdownMenu, IconButton } from "@medusajs/ui"

// ============================================
// Report Configuration Types (based on sample JSON)
// ============================================
interface ReportField {
  key: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'email' | 'phone'
  label: string
  visible: boolean
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  editable?: boolean
  required?: boolean
  alignment?: 'left' | 'center' | 'right'
}

interface ReportConfiguration {
  type: 'table'
  dense: boolean
  title: string
  description?: string
  fields: ReportField[]
  dividers: boolean
  maxItems?: number
  pageSize: number
  action_id: string
  iconField?: string
  showIcons: boolean
  exportable: boolean
  primaryField?: string
  stickyHeader: boolean
  secondaryField?: string
  showRowNumbers: boolean
  pageSizeOptions: number[]
}

interface ReportMetadata {
  id: string
  name: string
  description: string
  configuration: ReportConfiguration
}

// ============================================
// Helper function to transform config fields to table columns
// ============================================
const transformFieldsToColumns = (fields: ReportField[], config: ReportConfiguration): Column[] => {
  return fields
    .filter(field => field.visible) // Only include visible fields
    .map(field => ({
      id: field.key,
      header: field.label,
      accessorKey: field.key,
      enableSorting: field.sortable || false,
      enableFiltering: field.filterable || false,
      enableSearch: field.searchable || false,
      alignment: field.alignment || 'left',
      cell: (value: any, row: any) => {
        // Handle different field types with appropriate formatting
        switch (field.type) {
          case 'date':
            if (value) {
              const date = new Date(value)
              return date.toLocaleDateString()
            }
            return '—'
          case 'boolean':
            return value ? 'Yes' : 'No'
          case 'email':
            return value ? (
              <div className="flex items-center gap-1">
                <AtSymbol className="text-ui-fg-subtle w-4 h-4" />
                <Text size="small">{value}</Text>
              </div>
            ) : '—'
          case 'phone':
            return value ? (
              <div className="flex items-center gap-1">
                <Phone className="text-ui-fg-subtle w-4 h-4" />
                <Text size="small" className="font-mono">{value}</Text>
              </div>
            ) : '—'
          case 'number':
            return value?.toLocaleString() || '0'
          default:
            return value || '—'
        }
      }
    }))
}

// ============================================
// Main Page Component
// ============================================
const DynamicReportPage = () => {
  const { id } = useParams<{ id: string }>() // Get report ID from URL

  const { mutateAsync: updateReport } = useExecuteAction('update-report')
  const { mutateAsync: deleteReport } = useExecuteAction('delete-report')
  const { mutateAsync: duplicateReport } = useExecuteAction('duplicate-report')

  const [report, setReport] = useState<ReportMetadata | null>(null)
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view')

  // Transform fields to columns whenever report changes
  const tableColumns = useMemo(() => {
    if (!report?.configuration?.fields) return []
    return transformFieldsToColumns(
      report.configuration.fields, 
      report.configuration
    )
  }, [report])

  // Fetch report metadata and then data
  useEffect(() => {
    if (!id) {
      setError("No report ID provided")
      setLoading(false)
      return
    }

    const fetchReport = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. Fetch report details (includes configuration)
        const reportRes = await fetch(`/admin/dashboards/reports/${id}`)
        if (!reportRes.ok) throw new Error("Failed to load report")
        const reportJson: ReportMetadata = await reportRes.json();
      console.log(reportJson, 'REPORT JSON')
        setReport(reportJson)

        // 2. Fetch report data using the action_id from configuration
        if (reportJson.configuration?.action_id) {
          const dataRes = await fetch(`/admin/actions/${reportJson.configuration.action_id}/execute`, {method: "POST"})
         
         console.log(dataRes, "DATA RES")
          if (!dataRes.ok) return setError("Failed to load report data")
          const dataJson = await dataRes.json()
          
          // Handle different response formats
          if (Array.isArray(dataJson)) {
            setReportData(dataJson)
            setTotalCount(dataJson.length)
          } else if (dataJson.data && Array.isArray(dataJson.data)) {
            setReportData(dataJson.data)
            setTotalCount(dataJson.total || dataJson.data.length)
          } else {
            setReportData([])
            setTotalCount(0)
          }
        } else {
          setReportData([])
          setTotalCount(0)
        }
      } catch (err: any) {
        setError(err.message || "An error occurred")
        toast.error(err.message || "Failed to load report")
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id])

  // Handle row click (open details modal)
  const handleRowClick = (row: any) => {
    setSelectedRow(row)
    setModalMode('view')
    setIsModalOpen(true)
  }

  // Handle create new
  const handleCreate = () => {
    setSelectedRow(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  // Handle edit
  const handleEdit = (row: any) => {
    setSelectedRow(row)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (row: any) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteReport(row.id)
        toast.success('Item deleted successfully')
        // Refresh data
        setReportData(prev => prev.filter(item => item.id !== row.id))
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete item')
      }
    }
  }

  // Handle duplicate
  const handleDuplicate = async (row: any) => {
    try {
      await duplicateReport(row.id)
      toast.success('Item duplicated successfully')
      // Refresh data
      if (report?.configuration?.action_id) {
        const dataRes = await fetch(`/admin/reports/${report.configuration.action_id}/data`)
        const dataJson = await dataRes.json()
        setReportData(Array.isArray(dataJson) ? dataJson : dataJson.data || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate item')
    }
  }

  // Handle bulk actions
  const handleBulkAction = (selectedIds: string[]) => {
    console.log('Bulk action on:', selectedIds)
    toast.success(`Selected ${selectedIds.length} items for bulk action`)
  }

  // Handle export
  const handleExport = () => {
    toast.success('Export started successfully')
  }

  // Row actions dropdown
  const RowActions = ({ row }: { row: any }) => (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item className="gap-x-2" onClick={() => handleEdit(row)}>
          <PencilSquare className="text-ui-fg-subtle" />
          Edit
        </DropdownMenu.Item>
        <DropdownMenu.Item className="gap-x-2" onClick={() => handleDuplicate(row)}>
          <Copy className="text-ui-fg-subtle" />
          Duplicate
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="gap-x-2 text-ui-fg-error" onClick={() => handleDelete(row)}>
          <Trash className="text-ui-fg-error" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )

  // Add actions column if needed
  const columnsWithActions = useMemo(() => {
    if (!tableColumns) return []
    
    return [
      ...tableColumns,
      // {
      //   id: 'actions',
      //   header: '',
      //   accessorKey: 'id',
      //   enableSorting: false,
      //   enableFiltering: false,
      //   cell: (_: any, row: any) => <RowActions row={row} />
      // }
    ]
  }, [tableColumns])

  // Custom actions for the table header
  const customActions = report && (
    <div className="flex items-center gap-2">
      {report.configuration?.exportable && (
        <Button variant="secondary" onClick={handleExport}>
          <DownloadCloud className="mr-2" />
          Export
        </Button>
      )}
      <Button variant="primary" onClick={handleCreate}>
        <Plus className="mr-2" />
        New {report.name}
      </Button>
    </div>
  )

  // Bulk action menu
  const bulkActions = (selectedIds: string[]) => (
    <div className="flex items-center gap-2">
      <Button size="small" variant="secondary" onClick={() => toast.success(`Printing ${selectedIds.length} items`)}>
        <Printer className="mr-2" />
        Print
      </Button>
      <Button size="small" variant="secondary" onClick={() => toast.success(`Email sent for ${selectedIds.length} items`)}>
        <Envelope className="mr-2" />
        Email
      </Button>
    </div>
  )

  // Loading state
  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <Text>Loading report...</Text>
        </div>
      </Container>
    )
  }

  // Error state
  if (error || !report) {
    return (
      <Container>
        <Alert variant="error" className="mb-4">
          {error || "Report not found"}
        </Alert>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Container>
    )
  }

  const config = report.configuration ?? {fields: []}


  return (
    <>
      {/* Header Section */}
      {/* <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">{config?.title || report?.name}</Heading>
            {config.type && (
              <Badge color="green" size="small">{config.type}</Badge>
            )}
          </div>
          {config.description && (
            <Text className="text-ui-fg-subtle mt-1">
              {config.description}
            </Text>
          )}
        </div>
      </div> */}

      {/* Main Table */}
      <CustomTablePage
        title={config.title}
        description={config.description}
        columns={columnsWithActions}
        data={reportData}
        totalCount={totalCount}
        onBulkAction={handleBulkAction}
        onRowClick={handleRowClick}
        customActions={customActions}
        bulkActions={bulkActions}
        enableExport={config.exportable}
        enableSearch={true}
        enableFilters={true}
        pageSize={config.pageSize || 15}
        pageSizeOptions={config.pageSizeOptions}
        dense={config.dense}
        dividers={config.dividers}
        stickyHeader={config.stickyHeader}
        showRowNumbers={config.showRowNumbers}
        maxItems={config.maxItems}
      />

      {/* Details/Create/Edit Modal */}
      <FocusModal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
            <div className="max-w-4xl w-full p-8">
              <Heading level="h1" className="mb-8">
                {modalMode === 'create' && `Create New ${report.label || report.name}`}
                {modalMode === 'edit' && `Edit ${report.label || report.name}`}
                {modalMode === 'view' && `${report.label || report.name} Details`}
              </Heading>

              {modalMode === 'view' && selectedRow ? (
                <div className="space-y-6">
                  {config.fields
                    .filter(f => f.visible)
                    .map(field => (
                      <div key={field.key} className="border-b border-ui-border-base pb-4">
                        <Text size="small" className="text-ui-fg-subtle mb-1">
                          {field.label}
                        </Text>
                        <div className="flex items-center gap-2">
                          {field.type === 'email' && <AtSymbol className="text-ui-fg-subtle w-4 h-4" />}
                          {field.type === 'phone' && <Phone className="text-ui-fg-subtle w-4 h-4" />}
                          <Text weight="plus">
                            {selectedRow[field.key] || '—'}
                          </Text>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <form className="space-y-6">
                  {config.fields
                    .filter(f => f.visible && (modalMode === 'create' ? true : f.editable))
                    .map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium mb-1">
                          {field.label}
                          {field.required && <span className="text-ui-fg-error ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
                          <Input 
                            type={field.type === 'email' ? 'email' : 'text'}
                            placeholder={`Enter ${field.label}`}
                            defaultValue={modalMode === 'edit' ? selectedRow?.[field.key] : ''}
                            required={field.required}
                          />
                        ) : field.type === 'number' ? (
                          <Input 
                            type="number"
                            placeholder={`Enter ${field.label}`}
                            defaultValue={modalMode === 'edit' ? selectedRow?.[field.key] : ''}
                            required={field.required}
                          />
                        ) : field.type === 'date' ? (
                          <Input 
                            type="date"
                            defaultValue={modalMode === 'edit' ? selectedRow?.[field.key]?.split('T')[0] : ''}
                            required={field.required}
                          />
                        ) : field.type === 'boolean' ? (
                          <select className="w-full p-2 border border-ui-border-base rounded">
                            <option value="true" selected={modalMode === 'edit' && selectedRow?.[field.key] === true}>
                              Yes
                            </option>
                            <option value="false" selected={modalMode === 'edit' && selectedRow?.[field.key] === false}>
                              No
                            </option>
                          </select>
                        ) : (
                          <Input 
                            placeholder={`Enter ${field.label}`}
                            defaultValue={modalMode === 'edit' ? selectedRow?.[field.key] : ''}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))}
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        toast.success(`${report.name} ${modalMode === 'create' ? 'created' : 'updated'} successfully`)
                        setIsModalOpen(false)
                      }}
                    >
                      {modalMode === 'create' ? 'Create' : 'Save'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}

// Route configuration – now includes an :id parameter
export const config = defineRouteConfig({
  label: "Reports",
  rank: 1
})

export default DynamicReportPage