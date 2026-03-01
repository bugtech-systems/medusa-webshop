import { FetchError } from "@medusajs/js-sdk"
import {
  AdminReport,
  AdminReportListResponse,
  AdminReportResponse,
  AdminCreateReport,
  AdminUpdateReport,
  ReportFilterParams,
} from "../../../types/reports"
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

// Query keys factory for reports
export const reportsQueryKey = queryKeysFactory("reports")

// List reports with filtering, pagination, and sorting
export const useReports = (
  query?: ReportFilterParams,
  options?: UseQueryOptions<
    AdminReportListResponse,
    FetchError,
    AdminReportListResponse,
    ReturnType<typeof reportsQueryKey.list>
  >
) => {
  const filterQuery = query ? new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = String(value)
      }
      return acc
    }, {} as Record<string, string>)
  ).toString() : ""

  const fetchReports = async () =>
    sdk.client.fetch<AdminReportListResponse>(
      `/admin/reports${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: reportsQueryKey.list(query),
    queryFn: fetchReports,
    ...options,
  })
}

// Get single report by ID
export const useReport = (
  reportId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminReportResponse,
    FetchError,
    AdminReportResponse,
    ReturnType<typeof reportsQueryKey.detail>
  >
) => {
  const filterQuery = query ? new URLSearchParams(query).toString() : ""

  const fetchReport = async () =>
    sdk.client.fetch<AdminReportResponse>(
      `/admin/reports/${reportId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: reportsQueryKey.detail(reportId),
    queryFn: fetchReport,
    enabled: !!reportId,
    ...options,
  })
}

// Create a new report
export const useCreateReport = (
  options?: UseMutationOptions<
    AdminReportResponse,
    FetchError,
    AdminCreateReport
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (report: AdminCreateReport) =>
      sdk.client.fetch<AdminReportResponse>("/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: report,
      }),
    onSuccess: (data, variables, context) => {
      // Invalidate all lists to refetch
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Update an existing report
export const useUpdateReport = (
  reportId?: string,
  options?: UseMutationOptions<
    AdminReportResponse,
    FetchError,
    AdminUpdateReport
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (report: AdminUpdateReport) =>
      sdk.client.fetch<AdminReportResponse>(`/admin/reports/${reportId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: report,
      }),
    onSuccess: (data, variables, context) => {
      // Invalidate both lists and the specific detail
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.lists(),
      })
      if (reportId) {
        queryClient.invalidateQueries({
          queryKey: reportsQueryKey.detail(reportId),
        })
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Delete a report
export const useDeleteReport = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reportId: string) =>
      sdk.client.fetch(`/admin/reports/${reportId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      // Invalidate all lists
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.lists(),
      })
      // Remove the specific detail from cache
      queryClient.removeQueries({
        queryKey: reportsQueryKey.detail(variables),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Duplicate a report
export const useDuplicateReport = (
  options?: UseMutationOptions<
    AdminReportResponse,
    FetchError,
    string
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reportId: string) =>
      sdk.client.fetch<AdminReportResponse>(
        `/admin/reports/${reportId}/duplicate`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Bulk operations on reports
export const useBulkReports = (
  options?: UseMutationOptions<
    AdminReportListResponse,
    FetchError,
    { ids: string[]; action: string; data?: any }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, action, data }: { ids: string[]; action: string; data?: any }) =>
      sdk.client.fetch<AdminReportListResponse>("/admin/reports/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, action, data }),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.lists(),
      })
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: reportsQueryKey.detail(id),
        })
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   Report Execution Hooks
============================================================ */

// Execute/generate a report
export const useExecuteReport = (
  reportId: string,
  options?: UseMutationOptions<
    any,
    FetchError,
    { parameters?: Record<string, any>; format?: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (executeData: { parameters?: Record<string, any>; format?: string }) =>
      sdk.client.fetch<any>(
        `/admin/reports/${reportId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: executeData,
        }
      ),
    onSuccess: (data, variables, context) => {
      // Invalidate execution history
      queryClient.invalidateQueries({
        queryKey: ["reportExecutions", reportId],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Get execution history for a report
export const useReportExecutionHistory = (
  reportId: string,
  options?: UseQueryOptions<
    any[],
    FetchError,
    any[],
    [string, string]
  >
) => {
  return useQuery({
    queryKey: ["reportExecutions", reportId],
    queryFn: async () =>
      sdk.client.fetch<any[]>(
        `/admin/reports/${reportId}/executions`,
        {
          method: "GET",
        }
      ),
    enabled: !!reportId,
    ...options,
  })
}

// Schedule a report
export const useScheduleReport = (
  reportId: string,
  options?: UseMutationOptions<
    any,
    FetchError,
    { schedule: string; recipients?: string[]; format?: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleData: { schedule: string; recipients?: string[]; format?: string }) =>
      sdk.client.fetch<any>(
        `/admin/reports/${reportId}/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: scheduleData,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: reportsQueryKey.detail(reportId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Export report in different formats
export const useExportReport = (
  reportId: string,
  options?: UseMutationOptions<
    Blob,
    FetchError,
    { format: "pdf" | "csv" | "excel"; parameters?: Record<string, any> }
  >
) => {
  return useMutation({
    mutationFn: async (exportData: { format: "pdf" | "csv" | "excel"; parameters?: Record<string, any> }) => {
      const response = await sdk.client.fetch(
        `/admin/reports/${reportId}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: exportData,
        }
      )
      return response as Blob
    },
    ...options,
  })
}

/* ============================================================
   Report Analytics Hooks
============================================================ */

// Get report usage analytics
export const useReportAnalytics = (
  reportId: string,
  timeRange?: { start: string; end: string },
  options?: UseQueryOptions<
    any,
    FetchError,
    any,
    ReturnType<typeof reportsQueryKey.detail>
  >
) => {
  const queryParams = timeRange ? new URLSearchParams({
    start: timeRange.start,
    end: timeRange.end,
  }).toString() : ""

  const fetchAnalytics = async () =>
    sdk.client.fetch<any>(
      `/admin/reports/${reportId}/analytics${queryParams ? `?${queryParams}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: [...reportsQueryKey.detail(reportId), "analytics", timeRange],
    queryFn: fetchAnalytics,
    enabled: !!reportId,
    ...options,
  })
}

// Get all report templates
export const useReportTemplates = (
  options?: UseQueryOptions<
    any[],
    FetchError,
    any[],
    [string]
  >
) => {
  return useQuery({
    queryKey: ["reportTemplates"],
    queryFn: async () =>
      sdk.client.fetch<any[]>("/admin/reports/templates", {
        method: "GET",
      }),
    ...options,
  })
}