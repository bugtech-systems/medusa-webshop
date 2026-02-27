import { FetchError } from "@medusajs/js-sdk"
import {
  AdminAiModel,
  AdminAiModelListResponse,
  AdminAiModelResponse,
  AdminCreateAiModel,
  AdminUpdateAiModel,
} from "@/types/ai-model" // You'll need to create these types
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

export const aiModelsQueryKey = queryKeysFactory("ai-models")

export const useAiModels = (
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminAiModelListResponse,
    FetchError,
    AdminAiModelListResponse,
    ReturnType<typeof aiModelsQueryKey.list>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchAiModels = async () =>
    sdk.client.fetch<AdminAiModelListResponse>(
      `/admin/ai-models${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: aiModelsQueryKey.list(query),
    queryFn: fetchAiModels,
    ...options,
  })
}

export const useAiModel = (
  aiModelId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    AdminAiModelResponse,
    FetchError,
    AdminAiModelResponse,
    ReturnType<typeof aiModelsQueryKey.detail>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchAiModel = async () =>
    sdk.client.fetch<AdminAiModelResponse>(
      `/admin/ai-models/${aiModelId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: aiModelsQueryKey.detail(aiModelId),
    queryFn: fetchAiModel,
    enabled: !!aiModelId,
    ...options,
  })
}

export const useCreateAiModel = (
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    AdminCreateAiModel
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModel: AdminCreateAiModel) =>
      sdk.client.fetch<AdminAiModelResponse>("/admin/ai-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: aiModel,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.detail(data.ai_model.id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateAiModel = (
  aiModelId?: string,
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    AdminUpdateAiModel
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModel: AdminUpdateAiModel) =>
      sdk.client.fetch<AdminAiModelResponse>(`/admin/ai-models/${aiModelId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: aiModel,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.detail(aiModelId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteAiModel = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModelId: string) =>
      sdk.client.fetch(`/admin/ai-models/${aiModelId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDuplicateAiModel = (
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    string
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (aiModelId: string) =>
      sdk.client.fetch<AdminAiModelResponse>(
        `/admin/ai-models/${aiModelId}/duplicate`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useBulkAiModels = (
  options?: UseMutationOptions<
    AdminAiModelListResponse,
    FetchError,
    { ids: string[]; action: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: string }) =>
      sdk.client.fetch<AdminAiModelListResponse>("/admin/ai-models/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, action }),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.lists(),
      })
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: aiModelsQueryKey.detail(id),
        })
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   AI Model Testing/Execution Hooks
============================================================ */

// Test AI Model with input
export const useTestAiModel = (
  aiModelId: string,
  options?: UseMutationOptions<
    any,
    FetchError,
    { input: string; parameters?: Record<string, any> }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (testData: { input: string; parameters?: Record<string, any> }) =>
      sdk.client.fetch<any>(
        `/admin/ai-models/${aiModelId}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: testData,
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["aiModelTestResults", aiModelId],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Get test history for an AI model
export const useAiModelTestHistory = (
  aiModelId: string,
  options?: UseQueryOptions<
    any[],
    FetchError,
    any[],
    [string, string]
  >
) => {
  return useQuery({
    queryKey: ["aiModelTestHistory", aiModelId],
    queryFn: async () =>
      sdk.client.fetch<any[]>(
        `/admin/ai-models/${aiModelId}/test-history`,
        {
          method: "GET",
        }
      ),
    ...options,
  })
}

/* ============================================================
   AI Model Status/Health Hooks
============================================================ */

export const useAiModelStatus = (
  aiModelId: string,
  options?: UseQueryOptions<
    { status: string; last_checked: string; health: any },
    FetchError,
    { status: string; last_checked: string; health: any },
    ReturnType<typeof aiModelsQueryKey.detail>
  >
) => {
  const fetchAiModelStatus = async () =>
    sdk.client.fetch<{ status: string; last_checked: string; health: any }>(
      `/admin/ai-models/${aiModelId}/status`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: [...aiModelsQueryKey.detail(aiModelId), "status"],
    queryFn: fetchAiModelStatus,
    enabled: !!aiModelId,
    ...options,
  })
}

/* ============================================================
   AI Model Deployment Hooks
============================================================ */

export const useDeployAiModel = (
  aiModelId: string,
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    { environment: string; config?: Record<string, any> }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (deployment: { environment: string; config?: Record<string, any> }) =>
      sdk.client.fetch<AdminAiModelResponse>(
        `/admin/ai-models/${aiModelId}/deploy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deployment),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.detail(aiModelId),
      })
      queryClient.invalidateQueries({
        queryKey: [...aiModelsQueryKey.detail(aiModelId), "status"],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUndeployAiModel = (
  aiModelId: string,
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    { environment: string }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (undeployment: { environment: string }) =>
      sdk.client.fetch<AdminAiModelResponse>(
        `/admin/ai-models/${aiModelId}/undeploy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(undeployment),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.detail(aiModelId),
      })
      queryClient.invalidateQueries({
        queryKey: [...aiModelsQueryKey.detail(aiModelId), "status"],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/* ============================================================
   AI Model Version Management Hooks
============================================================ */

export const useAiModelVersions = (
  aiModelId: string,
  options?: UseQueryOptions<
    any[],
    FetchError,
    any[],
    ReturnType<typeof aiModelsQueryKey.detail>
  >
) => {
  const fetchAiModelVersions = async () =>
    sdk.client.fetch<any[]>(
      `/admin/ai-models/${aiModelId}/versions`,
      {
        method: "GET",
      }
    )

  return useQuery({
    queryKey: [...aiModelsQueryKey.detail(aiModelId), "versions"],
    queryFn: fetchAiModelVersions,
    enabled: !!aiModelId,
    ...options,
  })
}

export const useCreateAiModelVersion = (
  aiModelId: string,
  options?: UseMutationOptions<
    AdminAiModelResponse,
    FetchError,
    { version: string; config: Record<string, any> }
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionData: { version: string; config: Record<string, any> }) =>
      sdk.client.fetch<AdminAiModelResponse>(
        `/admin/ai-models/${aiModelId}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(versionData),
        }
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [...aiModelsQueryKey.detail(aiModelId), "versions"],
      })
      queryClient.invalidateQueries({
        queryKey: aiModelsQueryKey.detail(aiModelId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}