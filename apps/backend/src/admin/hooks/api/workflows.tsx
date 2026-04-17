import { FetchError } from "@medusajs/js-sdk"
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { sdk } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

// Types (adjust to match your actual API responses)
export type Workflow = {
  id: string
  name: string
  nodes: any[]
  edges: any[]
  layout: string | null
  created_at: string
  updated_at: string
}

export type WorkflowListResponse = {
  workflows: Workflow[]
}

export type WorkflowResponse = {
  workflow: Workflow
}

export type CreateWorkflowInput = {
  name: string
}

export type UpdateWorkflowInput = {
  name?: string
  nodes?: any[]
  edges?: any[]
  layout?: string | null
}

// Query key factory
export const workflowsQueryKey = queryKeysFactory("workflows")

// List workflows
export const useWorkflows = (
  query?: Record<string, any>,
  options?: UseQueryOptions<
    WorkflowListResponse,
    FetchError,
    WorkflowListResponse,
    ReturnType<typeof workflowsQueryKey.list>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchWorkflows = async () =>
    sdk.client.fetch<WorkflowListResponse>(
      `/actions/get-relation-workflows/execute${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "POST",
      }
    )

  return useQuery({
    queryKey: workflowsQueryKey.list(query),
    queryFn: fetchWorkflows,
    ...options,
  })
}

// Get single workflow
export const useWorkflow = (
  workflowId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    WorkflowResponse,
    FetchError,
    WorkflowResponse,
    ReturnType<typeof workflowsQueryKey.detail>
  >
) => {
  const filterQuery = new URLSearchParams(query).toString()

  const fetchWorkflow = async () =>
    sdk.client.fetch<WorkflowResponse>(
      `/admin/actions/get-relation-workflows-by-id/execute`,
      {
        method: "POST",
        body: { "parameters": { "id": workflowId } }
      }
    )

  return useQuery({
    queryKey: workflowsQueryKey.detail(workflowId),
    queryFn: fetchWorkflow,
    enabled: !!workflowId,
    ...options,
  })
}

// Create workflow
export const useCreateWorkflow = (
  options?: UseMutationOptions<
    WorkflowResponse,
    FetchError,
    CreateWorkflowInput
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWorkflowInput) =>
      sdk.client.fetch<WorkflowResponse>("/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.detail(data.workflow.id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Update workflow
export const useUpdateWorkflow = (
  workflowId: string,
  options?: UseMutationOptions<
    WorkflowResponse,
    FetchError,
    UpdateWorkflowInput
  >
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateWorkflowInput) =>
      sdk.client.fetch<WorkflowResponse>(`/admin/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.detail(workflowId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Delete workflow
export const useDeleteWorkflow = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workflowId: string) =>
      sdk.client.fetch(`/admin/workflows/${workflowId}`, {
        method: "DELETE",
      }),
    onSuccess: (data: any, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: workflowsQueryKey.detail(variables),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}