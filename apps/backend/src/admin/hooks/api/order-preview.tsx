import { HttpTypes } from "@medusajs/framework/types";
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { sdk } from "../../lib/client";
import { ClientHeaders, FetchError } from "@medusajs/js-sdk";

export const orderPreviewQueryKey = queryKeysFactory("custom_orders");

export const useOrderPreview = (
  id: string,
  query?: HttpTypes.AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      HttpTypes.AdminOrderPreviewResponse,
      FetchError,
      HttpTypes.AdminOrderPreviewResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.order.retrievePreview(id, query),
    queryKey: orderPreviewQueryKey.detail(id),
    ...options,
  });

  return { ...data, ...rest };
};


export const useOrderLink = (
  id: string,
  options?: UseQueryOptions<
    any,
    FetchError,
    QueryKey
  >
) => {
  const fetchQuote = (
    id: string,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<any>(`/admin/draft-orders/${id}/payment-link`, {
      headers,
    });

  const { data, ...rest } = useQuery({
    queryFn: () => fetchQuote(id),
    queryKey: orderPreviewQueryKey.detail(id),
    ...options,
  });

  return { ...data, ...rest };
};
