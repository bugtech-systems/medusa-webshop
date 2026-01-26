import { HttpTypes } from "@medusajs/framework/types";
import { FetchError } from "@medusajs/js-sdk";
import { AdminCreateCustomer, AdminCustomer, CustomerDTO } from "@medusajs/types";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "../../lib/query-key-factory";
import { sdk } from "../../lib/client";

export const customerQueryKey = queryKeysFactory("customer");

export const useCustomers = (
  companyId: string,
  query?: Record<string, any>,
  options?: UseQueryOptions<
    CustomerDTO,
    FetchError,
    CustomerDTO,
    QueryKey
  >
) => {
  const filterQuery = new URLSearchParams(query).toString();

  const fetchEmployees = async () =>
    sdk.client.fetch<CustomerDTO>(
      `/admin/companies/${companyId}/employees${
        filterQuery ? `?${filterQuery}` : ""
      }`,
      {
        method: "GET",
      }
    );

  return useQuery({
    queryKey: customerQueryKey.list(companyId),
    queryFn: fetchEmployees,
    ...options,
  });
};

export const useAdminCustomerGroups = (
  options?: UseQueryOptions<
    { customer_groups: HttpTypes.AdminCustomerGroup[] },
    FetchError,
    HttpTypes.AdminCustomerGroup[],
    QueryKey
  >
) => {
  return useQuery({
    queryKey: customerQueryKey.list("groups"),
    queryFn: () => sdk.admin.customerGroup.list(),
    select: (data) => data.customer_groups,
    ...options,
  });
};


export const useAdminCreateCustomer = (
  options?: UseMutationOptions<
    { customer: AdminCustomer },
    FetchError,
    AdminCreateCustomer
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: any) => {
      const email = customer.email;
      const companyName =
        (customer.company_name as string | undefined) ??
        undefined;

      /**
       * 1. Try to find existing customer by email
       */
      const { customers } = await sdk.admin.customer.list({
        email,
        limit: 10,
      });
      
      
            console.log(customers, 'CUSTOMERRS')


      const existingCustomer = customers?.find(
        (c) =>
          c.email === email &&
          c.company_name === companyName
      );
      
      console.log(customers, 'CUSTOMERRS', existingCustomer)

      /**
       * 2. Return existing customer if found
       */
      if (existingCustomer) {
        return { customer: existingCustomer };
      }

      /**
       * 3. Otherwise create customer
       */
      return sdk.admin.customer.create(customer).catch(() => {return null;}) as any;
    },

    onSuccess: (data, variables, context) => {
      queryClient?.invalidateQueries({
        queryKey: customerQueryKey.lists(),
      });

      options?.onSuccess?.(data, variables, context);
    },
     onError: (err) => {
     console.log(err, 'ERRORR TOO')
      return {message: 'Something went wrong!'}  
    },

    ...options,
  });
};

