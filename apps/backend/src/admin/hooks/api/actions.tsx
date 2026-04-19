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
import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory"
import { useEffect, useState } from "react"
import { DEFAULT_ENV } from "../../utils/commonData";

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
  const session_id = localStorage.getItem('session_id');

  const fetchActions = async () =>
    sdk.client.fetch<AdminActionListResponse>(
      `/admin/actions${filterQuery ? `?${filterQuery}` : ""}`,
      {
        method: "GET",
        headers: { session_id }
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
  const session_id = localStorage.getItem('session_id');

  const fetchAction = async () => {
    let token = await sdk.client.getToken();

    return sdk.client.fetch<AdminActionResponse>(
      `/actions/${actionId}${filterQuery ? `?${filterQuery}` : ""}`,
      {
        headers: { "Authorization": `Bearer ${token}`, session_id },
        method: "GET",
      }
    )
  }

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
   Execute Action Hooks with Caching
============================================================ */

// Cache configuration
const CACHE_CONFIG = {
  // Cache duration in milliseconds (5 minutes default)
  DEFAULT_TTL: 5 * 60 * 1000,
  // Maximum cache size (number of entries)
  MAX_CACHE_SIZE: 100,
  // Cache keys for different types
  keys: {
    actionExecution: (actionId: string, paramsHash?: string) =>
      `action-execution-${actionId}${paramsHash ? `-${paramsHash}` : ''}`,
    actionHistory: (actionId: string, page?: number) =>
      `action-history-${actionId}${page ? `-page-${page}` : ''}`,
  }
};

// In-memory cache implementation
class ActionCache {
  private cache: Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }> = new Map();

  set(key: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL) {
    // Enforce max cache size
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: RegExp) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAction(actionId: string) {
    const pattern = new RegExp(`action-execution-${actionId}`);
    this.invalidate(pattern);
  }

  get size() {
    return this.cache.size;
  }
}

// Create cache instance
const actionCache = new ActionCache();

// Simple browser-compatible hash function
const generateSimpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Browser-compatible params hash generator (no Buffer dependency)
const generateParamsHash = (params: any): string => {
  if (!params) return '';

  try {
    // Create deterministic string representation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);

    // Stringify and create a simple hash
    const paramsString = JSON.stringify(sortedParams);

    // Use a simple hashing algorithm instead of Buffer
    return generateSimpleHash(paramsString);

  } catch (error) {
    console.warn('Failed to generate params hash:', error);
    // Fallback to timestamp to avoid cache collisions but still function
    return Date.now().toString();
  }
};


// Execute action with caching
export const useExecuteAction = (
  actionId: string,
  options?: UseMutationOptions<
    AdminExecuteActionResponse,
    FetchError,
    any
  >
) => {
  const queryClient = useQueryClient();
  const session_id = localStorage.getItem("session_id");

  return useMutation({
    mutationFn: async (execution?: any) => {

      return sdk.client.fetch<AdminExecuteActionResponse>(
        `/actions/${actionId}/execute`,
        {
          body: execution,
          headers: { session_id },
          method: "POST",
        }
      );
    },

    onSuccess: (data: any, variables, context) => {
      // ✅ Invalidate ONLY relevant queries
      if (data?.session_id) {
        localStorage.setItem('session_id', data.session_id)
      }
      queryClient.invalidateQueries({
        queryKey: ["execution", actionId],
      });

      options?.onSuccess?.(data, variables, context);
    },

    ...options,
  });
};


export const useN8nWebhook = (
  url: string,
  options?: any
) => {
  const queryClient = useQueryClient();
  const session_id = localStorage.getItem("session_id");

  return useMutation({
    mutationFn: async (execution?: any) => {

      let resp = await fetch(
        `${DEFAULT_ENV[options?.test ? 'n8n_test_url' : 'n8n_prod_url'] + url}`,
        {
          body: JSON.stringify(execution),
          method: options?.method || "POST",
          headers: {
            "content-type": "application/json",
            "session_id": session_id
          } as any
        }
      );

      let json = resp.json();

      return json;
    },

    onSuccess: (data: any, variables, context) => {
      // ✅ Invalidate ONLY relevant queries
      if (data?.session_id) {
        localStorage.setItem('session_id', data.session_id)
      }
      queryClient.invalidateQueries({
        queryKey: ["webhook", url],
      });

      options?.onSuccess?.(data, variables, context);
    },

    ...options,
  });
};
// List executions with caching
export const useExecution = (
  actionId?: string,
  query?: Record<string, any>,
  options?: any
) => {
  return useQuery({
    queryKey: ["execution", actionId, query], // ✅ includes query

    queryFn: async () => {
      if (!actionId) return null;

      const session_id = localStorage.getItem("session_id");

      const filterQuery = query
        ? new URLSearchParams(
          Object.entries(query).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
        : "";

      const url = `/actions/${actionId}/execute${filterQuery ? `?${filterQuery}` : ""
        }`;

      return sdk.client.fetch<AdminExecuteActionResponse>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          session_id,
        },
        body: query ?? {},
      });
    },

    // ✅ Proper caching config
    staleTime: 1000 * 60 * 5, // 5 mins
    gcTime: 1000 * 60 * 10,   // 10 mins

    enabled: !!actionId,

    ...options,
  });
};

// Cache management utilities
export const actionCacheUtils = {
  // Clear entire cache
  clearCache: () => {
    actionCache.invalidate();
  },

  // Invalidate cache for specific action
  invalidateAction: (actionId: string) => {
    actionCache.invalidateAction(actionId);
  },

  // Get cache stats
  getCacheStats: () => {
    return {
      size: actionCache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
    };
  },

  // Prefetch action execution
  prefetchExecution: async (actionId: string, query?: any) => {
    const paramsHash = query ? generateParamsHash(query) : '';
    const cacheKey = CACHE_CONFIG.keys.actionExecution(actionId, paramsHash);

    // Skip if already cached
    if (actionCache.get(cacheKey)) {
      return;
    }

    const filterQuery = query ? new URLSearchParams(
      Object.entries(query).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : "";

    const url = `/admin/actions/${actionId}/execute${filterQuery ? `?${filterQuery}` : ''}`;

    const response = await sdk.client.fetch<AdminExecuteActionResponse>(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: query ? query : {},
      }
    );

    actionCache.set(cacheKey, response);
    return response;
  },

  // Set custom TTL for specific action
  setCustomTTL: (actionId: string, ttl: number) => {
    // This would require extending the cache implementation
    // For now, we'll just log a warning
    console.warn('Custom TTL not implemented yet');
  },
};

// // Optional: Add persistence to localStorage/sessionStorage
// export const usePersistentCache = (enabled: boolean = false) => {
//   if (!enabled) return;

//   // Load cache from storage on mount
//   React.useEffect(() => {
//     try {
//       const savedCache = localStorage.getItem('action-cache');
//       if (savedCache) {
//         const parsed = JSON.parse(savedCache);
//         // Rehydrate cache (implementation depends on your needs)
//         console.log('Loaded cache from storage:', parsed);
//       }
//     } catch (error) {
//       console.error('Failed to load cache from storage:', error);
//     }

//     // Save cache to storage on unmount
//     return () => {
//       try {
//         // This is a simplified example - you'd need to serialize your cache properly
//         // localStorage.setItem('action-cache', JSON.stringify(actionCache));
//       } catch (error) {
//         console.error('Failed to save cache to storage:', error);
//       }
//     };
//   }, []);
// };

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
        `/actions/${actionId}/history`,
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

    const evtSource = new EventSource(`/actions/${executionId}/logs`)

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
