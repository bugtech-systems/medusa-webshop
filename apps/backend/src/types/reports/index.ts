import { FetchError } from "@medusajs/js-sdk"

export interface AdminReport {
  id: string
  name: string
  type: string
  description?: string
  config?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AdminReportListResponse {
  reports: AdminReport[]
  count: number
  offset: number
  limit: number
}

export interface AdminReportResponse {
  report: AdminReport
}

export interface AdminCreateReport {
  name: string
  type: string
  description?: string
  config?: Record<string, any>
}

export interface AdminUpdateReport {
  name?: string
  type?: string
  description?: string
  config?: Record<string, any>
}

export interface ReportFilterParams {
  search?: string
  type?: string
  offset?: number
  limit?: number
  sort_by?: string
  sort_dir?: "asc" | "desc"
  [key: string]: any
}