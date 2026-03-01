import { FetchError } from "@medusajs/js-sdk"
import {
  AdminDashboardResponse,
  AdminDashboardTabResponse,
  AdminCreateDashboardTab,
  AdminUpdateDashboardTab,
  AdminCreateWidget,
  AdminUpdateWidget,
  AdminWidgetResponse,
  AdminBulkWidgetAction,
  AdminBulkWidgetResponse,
  WidgetPosition,
} from "../../components/dashboard/types"
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { DashboardTab } from "@/admin/components/dashboard/DashboardContainer"

// Query keys factory for dashboard
export const dashboardQueryKey = queryKeysFactory("dashboard")

/* ============================================================
   Dashboard Tabs Hooks
============================================================ */

// Get all dashboard tabs
export const useDashboard = (
  options?: any
) => {
  const fetchDashboard = async () =>
    sdk.client.fetch<AdminDashboardResponse>("/admin/actions/get-dashboard-tabs/execute", {
      method: "POST",
    })

  return useQuery({
    queryKey: dashboardQueryKey.details(),
    queryFn: fetchDashboard,
    ...options,
  })
}

// Get single dashboard tab by ID
export const useDashboardTab = (
  tabId: string,
  options?: UseQueryOptions<
    AdminDashboardTabResponse,
    FetchError,
    AdminDashboardTabResponse,
    ReturnType<typeof dashboardQueryKey.detail>
  >
) => {
  const fetchDashboardTab = async () =>
    sdk.client.fetch<AdminDashboardTabResponse>(`/admin/dashboard/tabs/${tabId}`, {
      method: "GET",
    })

  return useQuery({
    queryKey: dashboardQueryKey.detail(tabId),
    queryFn: fetchDashboardTab,
    enabled: !!tabId,
    ...options,
  })
}

// Create a new dashboard tab
export const useCreateDashboardTab = (
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    AdminCreateDashboardTab
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tab: AdminCreateDashboardTab) =>
      sdk.client.fetch<AdminDashboardTabResponse>("/admin/dashboard/tabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: tab,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Update a dashboard tab
export const useUpdateDashboardTab = (
  tabId?: string,
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    AdminUpdateDashboardTab
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tab: AdminUpdateDashboardTab) =>
      sdk.client.fetch<AdminDashboardTabResponse>(`/admin/dashboard/tabs/${tabId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: tab,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      if (tabId) {
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKey.detail(tabId),
        })
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Delete a dashboard tab
export const useDeleteDashboardTab = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tabId: string) =>
      sdk.client.fetch(`/admin/dashboard/tabs/${tabId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      queryClient.removeQueries({
        queryKey: dashboardQueryKey.detail(variables),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   Widget Hooks
============================================================ */

// Create a new widget
export const useCreateWidget = (
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    AdminCreateWidget
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (widget: AdminCreateWidget) =>
      sdk.client.fetch<AdminDashboardTabResponse>(
        `/admin/dashboard/tabs/${widget.tabId}/widgets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: widget,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.detail(variables.tabId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Update a widget
export const useUpdateWidget = (
  tabId: string,
  widgetId?: string,
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    AdminUpdateWidget
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (widget: AdminUpdateWidget) =>
      sdk.client.fetch<AdminDashboardTabResponse>(
        `/admin/dashboard/tabs/${tabId}/widgets/${widgetId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: widget,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.detail(tabId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Update widget position (optimized for drag and drop)
export const useUpdateWidgetPosition = (
  tabId: string,
  widgetId?: string,
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    { position: Partial<WidgetPosition> }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ position }: { position: Partial<WidgetPosition> }) =>
      sdk.client.fetch<AdminDashboardTabResponse>(
        `/admin/dashboard/tabs/${tabId}/widgets/${widgetId}/position`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: { position },
        }
      ),
    onSuccess: (data, variables, context) => {
      // For drag operations, we want to update the cache without refetching
      queryClient.setQueriesData(
        { queryKey: dashboardQueryKey.detail(tabId) },
        (oldData: AdminDashboardTabResponse | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            tab: {
              ...oldData.tab,
              widgets: oldData.tab.widgets.map(w =>
                w.id === widgetId
                  ? { ...w, position: { ...w.position, ...variables.position } }
                  : w
              )
            }
          }
        }
      )
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Delete a widget
export const useDeleteWidget = (
  tabId: string,
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (widgetId: string) =>
      sdk.client.fetch(`/admin/dashboard/tabs/${tabId}/widgets/${widgetId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.detail(tabId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   Bulk Operations Hooks
============================================================ */

// Duplicate a widget
export const useDuplicateWidget = (
  tabId: string,
  options?: UseMutationOptions<
    AdminDashboardTabResponse,
    FetchError,
    string
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (widgetId: string) =>
      sdk.client.fetch<AdminDashboardTabResponse>(
        `/admin/dashboard/tabs/${tabId}/widgets/${widgetId}/duplicate`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.detail(tabId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Bulk operations on widgets
export const useBulkWidgets = (
  tabId: string,
  options?: UseMutationOptions<
    AdminBulkWidgetResponse,
    FetchError,
    AdminBulkWidgetAction
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, action, data }: AdminBulkWidgetAction) =>
      sdk.client.fetch<AdminBulkWidgetResponse>(
        `/admin/dashboard/tabs/${tabId}/widgets/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids, action, data }),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.detail(tabId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   Layout Management Hooks
============================================================ */

// Update entire dashboard layout (bulk save)
export const useUpdateDashboardLayout = (
  options?: UseMutationOptions<
    AdminDashboardResponse,
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tabs: any = []) =>
      sdk.client.fetch<AdminDashboardResponse>("/admin/dashboards/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: tabs,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.details(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Reset dashboard to default layout
export const useResetDashboardLayout = (
  options?: UseMutationOptions<
    AdminDashboardResponse,
    FetchError,
    void
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<AdminDashboardResponse>("/admin/dashboard/reset", {
        method: "POST",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKey.details(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   Widget Templates Hooks
============================================================ */

// Get available widget templates
export const useWidgetTemplates = (
  options?: UseQueryOptions<
    any[],
    FetchError,
    any[],
    [string]
  >
) => {
  return useQuery({
    queryKey: ["widgetTemplates"],
    queryFn: async () =>
      sdk.client.fetch<any[]>("/admin/dashboard/widget-templates", {
        method: "GET",
      }),
    ...options,
  })
}

