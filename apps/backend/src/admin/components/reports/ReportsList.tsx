"use client"

import React, { useEffect, useState } from "react"
import {
  Button,
  Container,
  Heading,
  Table,
  Toaster,
  useToggleState,
  Text,
  DropdownMenu,
  IconButton,
} from "@medusajs/ui"
import { 
  Plus, 
  EllipsisHorizontal,
  PencilSquare,
  Trash,
  Eye,
} from "@medusajs/icons"
import { Copy } from 'lucide-react'; 
import { useExecuteAction } from "../../hooks/api/actions"
import { AdminReport, AdminCreateReport, AdminUpdateReport } from "../../../types/reports"
import { ReportsListProps } from "./types"
import { StatusBadge } from "./StatusBadge"
import { TypeIcon } from "./TypeIcon"
import { SortableHeader } from "./SortableHeader"
import { SearchFilterBar } from "./SearchFilterBar"
import { CreateReportModal } from "./modals/CreateReportModal"
import { EditReportDrawer } from "./modals/EditReportDrawer"
import { DeleteReportPrompt } from "./modals/DeleteReportPrompt"

export const ReportsList = ({ config }: ReportsListProps) => {
  // Table state
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // Modal states
  const createModal = useToggleState()
  const editDrawer = useToggleState()
  const deletePrompt = useToggleState()

  // Selected record
  const [selectedRecord, setSelectedRecord] = useState<AdminReport | null>(null)

  // API Hooks
  const { data: reports, isPending: isLoading, mutateAsync: refetch } = 
    useExecuteAction('get-reports')
  const { mutateAsync: createReport } = useExecuteAction('create-report')
  const { mutateAsync: updateReport } = useExecuteAction('update-report')
  const { mutateAsync: deleteReport } = useExecuteAction('delete-report')
  const { mutateAsync: duplicateReport } = useExecuteAction('duplicate-report')

  // Load reports on mount
  useEffect(() => {
    refetch({})
  }, [])

  // Handlers
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(key)
      setSortDir("asc")
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handleCreate = async (data: any) => {
    await createReport({ parameters: {
        ...data,
        label: data?.title,
        action_id: data.action_id,
        description: data.description,
        type: data.type,
        config: data
    } 
  })
    await refetch({})
  }

  const handleUpdate = async (data: any) => {
    if (!selectedRecord?.id) return


    await updateReport({ parameters: {
       id: selectedRecord.id, 
       ...data,
        label: data?.title,
        action_id: data.action_id,
        description: data.description,
        type: data.type,
        config: data
    } })
    await refetch({})
  }

  const handleDelete = async () => {
    if (!selectedRecord?.id) return
    await deleteReport({ parameters: {id: selectedRecord.id }})
    await refetch({})
  }

  const handleDuplicate = async (reportId: string) => {
    await duplicateReport({ id: reportId })
    await refetch({})
  }

  const handleView = (reportId: string) => {
    window.location.href = `/app/dashboards/reports/${reportId}`
  }

  // Calculate page count
  const pageCount = reports?.count ? Math.ceil(reports.count / pageSize) : 0

  
  let reportsData = reports?.data ? reports.data.map(a => ({...a, type: a.configuration?.type})) : [];

  return (
    <Container>
      <Toaster />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Heading level="h1" className="text-2xl font-semibold">
            Reports
          </Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Create and manage your reports
          </Text>
        </div>
        <Button 
          variant="primary" 
          onClick={createModal.open}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilterBar
        filters={config.filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        searchValue={search}
      />

      {/* Table */}
      <div className="border border-ui-border-base rounded-lg overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              {config.columns.map((col) => (
                <SortableHeader
                  key={col.key}
                  column={col}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              ))}
              <Table.HeaderCell className="w-[50px]">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={config.columns.length + 1}>
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-border-interactive" />
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : !reportsData?.length ? (
              <Table.Row>
                <Table.Cell colSpan={config.columns.length + 1}>
                  <div className="flex flex-col items-center justify-center py-12">
                    <TypeIcon type="report" className="w-12 h-12 text-ui-fg-subtle mb-4" />
                    <Text className="text-ui-fg-subtle mb-2">No reports found</Text>
                    <Button 
                      variant="secondary" 
                      size="small"
                      onClick={createModal.open}
                    >
                      Create your first report
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : (
              reportsData.map((report: AdminReport) => (
                <Table.Row 
                  key={report.id}
                  className="hover:bg-ui-bg-base-hover cursor-pointer"
                  onClick={() => handleView(report.id)}
                >
                  {config.columns.map((col) => (
                    <Table.Cell key={col.key}>
                      {col.type === "status" ? (
                        <StatusBadge status={report[col.key as keyof AdminReport] as string} />
                      ) : col.key === "type" ? (
                        <div className="flex items-center gap-2">
                          <TypeIcon type={report.type as string} />
                          <span>{report[col.key]}</span>
                        </div>
                      ) : (
                        report[col.key as keyof AdminReport]
                      )}
                    </Table.Cell>
                  ))}
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <IconButton size="small" variant="secondary">
                          <EllipsisHorizontal className="w-4 h-4" />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item 
                          className="gap-2"
                          onClick={() => handleView(report.id)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </DropdownMenu.Item>
                        <DropdownMenu.Item 
                          className="gap-2"
                          onClick={() => {
                            setSelectedRecord(report)
                            editDrawer.open()
                          }}
                        >
                          <PencilSquare className="w-4 h-4" />
                          Edit
                        </DropdownMenu.Item>
                        {/* <DropdownMenu.Item 
                          className="gap-2"
                          onClick={() => handleDuplicate(report.id)}
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </DropdownMenu.Item> */}
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item 
                          className="gap-2 text-ui-tag-red-text"
                          onClick={() => {
                            setSelectedRecord(report)
                            deletePrompt.open()
                          }}
                        >
                          <Trash className="w-4 h-4" />
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Pagination */}
      {reports?.count !== undefined && reports.count > 0 && (
        <div className="flex items-center justify-between gap-2 mt-4">
          <Text size="small">{`Page ${page + 1} of ${pageCount}`}</Text>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="small"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setPage(page + 1)}
              disabled={page >= pageCount - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      <CreateReportModal
        open={createModal.state}
        onOpenChange={createModal.toggle}
        onSubmit={handleCreate}
        config={config}
      />

      {/* Edit Report Drawer */}
      <EditReportDrawer
        open={editDrawer.state}
        onOpenChange={editDrawer.toggle}
        record={selectedRecord}
        onUpdate={handleUpdate}
        config={config}
      />

      {/* Delete Confirmation Prompt */}
      <DeleteReportPrompt
        open={deletePrompt.state}
        onOpenChange={deletePrompt.toggle}
        record={selectedRecord}
        onConfirm={handleDelete}
      />
    </Container>
  )
}