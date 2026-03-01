import { FetchError } from "@medusajs/js-sdk"
import {
  AdminAction,
  AdminActionListResponse,
  AdminActionResponse,
  AdminCreateAction,
  AdminUpdateAction,
  AdminExecuteAction,
  AdminActionTemplateResponse,
  AdminUpdateActionTemplate,
  AdminCreateActionTemplate,
  AdminExecuteActionResponse,
  AdminExecuteActionParams,
  AdminActionExecutionHistoryItem,
  AdminActionExecutionLog,
} from "@/types/action"
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  QueryKey,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { useEffect, useState } from "react"

export const actionsQueryKey = queryKeysFactory("actions")

export const useActions = (
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminActionListResponse,
    FetchError,
    AdminActionListResponse,
    ReturnType<typeof actionsQueryKey.list>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchActions = async () =>
    sdk.client.fetch<AdminActionListResponse>(
      `/admin/actions${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: actionsQueryKey.list(query),
    queryFn: fetchActions,
    ...options,
  })
}

export const useAction = (
  actionId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminActionResponse,
    FetchError,
    AdminActionResponse,
    ReturnType<typeof actionsQueryKey.detail>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchAction = async () =>
    sdk.client.fetch<AdminActionResponse>(
      `/admin/actions/${actionId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: actionsQueryKey.detail(actionId),
    queryFn: fetchAction,
    enabled: !!actionId,
    ...options,
  })
}

export const useCreateAction = (
  options?: UseMutationOptions<
    AdminActionResponse,
    FetchError,
    AdminCreateAction
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: AdminCreateAction) =>
      sdk.client.fetch<AdminActionResponse>("/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.detail(data.action.id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateAction = (
  actionId: string,
  options?: UseMutationOptions<
    AdminActionResponse,
    FetchError,
    AdminUpdateAction
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: AdminUpdateAction) =>
      sdk.client.fetch<AdminActionResponse>(`/admin/actions/${actionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: action,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.detail(actionId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteAction = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.client.fetch(`/admin/actions/${actionId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// export const useExecuteAction = (
//   actionId: string,
//   options?: UseMutationOptions<
//     any,
//     FetchError,
//     AdminExecuteAction
//   >
// ) => {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: (execution: AdminExecuteAction) =>
//       sdk.client.fetch(`/admin/actions/${actionId}/execute`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(execution),
//       }),
//     onSuccess: (data, variables, context) => {
//       queryClient.invalidateQueries({
//         queryKey: actionsQueryKey.detail(actionId),
//       })
//       options?.onSuccess?.(data, variables, context)
//     },
//     ...options,
//   })
// }

export const useDuplicateAction = (
  options?: UseMutationOptions<
    AdminActionResponse,
    FetchError,
    string
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) =>
      sdk.client.fetch<AdminActionResponse>(
        `/admin/actions/${actionId}/duplicate`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useBulkActions = (
  options?: UseMutationOptions<
    AdminActionListResponse,
    FetchError,
    { ids: string[]; action: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: string }) =>
      sdk.client.fetch<AdminActionListResponse>("/admin/actions/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, action }),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: actionsQueryKey.detail(id),
        })
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}




// In /admin/src/hooks/api/actions.ts
export const useActionTemplate = (
  actionId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminActionTemplateResponse,
    FetchError,
    AdminActionTemplateResponse,
    ReturnType<typeof actionsQueryKey.detail>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchActionTemplate = async () =>
    sdk.client.fetch<AdminActionTemplateResponse>(
      `/admin/actions/${actionId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: actionsQueryKey.detail(actionId),
    queryFn: fetchActionTemplate,
    enabled: !!actionId,
    ...options,
  })
}

export const useCreateActionTemplate = (
  options?: UseMutationOptions<
    AdminActionTemplateResponse,
    FetchError,
    AdminCreateActionTemplate
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: AdminCreateActionTemplate) =>
      sdk.client.fetch<AdminActionTemplateResponse>("/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: action,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.detail(data.action_template.id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateActionTemplate = (
  actionId: string,
  options?: UseMutationOptions<
    AdminActionTemplateResponse,
    FetchError,
    AdminUpdateActionTemplate
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: AdminUpdateActionTemplate) =>
      sdk.client.fetch<AdminActionTemplateResponse>(
        `/admin/actions/${actionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: action,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.detail(actionId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}




/* ============================================================
   Execute Action Hooks
============================================================ */

export const useExecuteAction = (
  actionId: string,
  options?: UseMutationOptions<
    AdminExecuteActionResponse,
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (execution?: any) =>
      sdk.client.fetch<AdminExecuteActionResponse>(
        `/admin/actions/${actionId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: execution,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: actionsQueryKey.detail(actionId),
      })
      queryClient.invalidateQueries({
        queryKey: ["actionExecutionHistory", actionId],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}



// List reports with filtering, pagination, and sorting
export const useExecution = (
  actionId?: any,
  query?: any,
  options?: any
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
    sdk.client.fetch<AdminExecuteActionResponse>(
        `/admin/actions/${actionId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: query ? query : {},
        }
      )

  return useQuery({
    queryKey: actionsQueryKey.list(actionId),
    queryFn: fetchReports,
    ...(options ? options : {}),
  })
}


export const useActionExecutionHistory = (
  actionId: string,
  options?: UseQueryOptions<
    AdminActionExecutionHistoryItem[],
    FetchError,
    AdminActionExecutionHistoryItem[],
    [string, string]
  >
) => {
  return useQuery({
    queryKey: ["actionExecutionHistory", actionId],
    queryFn: async () =>
      sdk.client.fetch<AdminActionExecutionHistoryItem[]>(
        `/admin/actions/${actionId}/history`,
        {
          method: "GET",
        }
      ),
    ...options,
  })
}

export const useActionExecutionLogs = (executionId?: string) => {
  const [logs, setLogs] = useState<AdminActionExecutionLog[]>([])

  useEffect(() => {
    if (!executionId) return

    const evtSource = new EventSource(`/admin/actions/${executionId}/logs`)

    evtSource.onmessage = (e) => {
      try {
        const log: AdminActionExecutionLog = JSON.parse(e.data)
        setLogs((prev) => [...prev, log])
      } catch {
        console.error("Failed to parse execution log:", e.data)
      }
    }

    return () => evtSource.close()
  }, [executionId])

  return { data: logs }
}
