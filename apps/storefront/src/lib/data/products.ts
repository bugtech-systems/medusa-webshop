"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { formatProducts } from "@lib/formatters/product-formatter"
import { retrieveCustomer, retrieveCustomerById } from "./customer"
import medusaError from "@lib/util/medusa-error"

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: any; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }




  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }
  
  
   // Build query parameters
  const query: Record<string, any> = {
    limit,
    offset,
    region_id: region?.id,
    // Always include these fields for proper product display
    fields: "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.prices,+metadata,+tags,*categories,*collections"
  }

  // Add search query if provided
  if (queryParams?.q) {
    query.q = queryParams.q
  }

  // Add sorting if provided
  if (queryParams?.order) {
    query.order = queryParams.order
  }

  // Add filters if provided
  if (queryParams?.category_id) {
    query.category_id = queryParams.category_id
  }
  if (queryParams?.collection_id) {
    query.collection_id = queryParams.collection_id
  }
 

  return sdk.client
    .fetch<{ products: any; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region.id,
          country_code: region?.countries ? region?.countries[0]?.iso_2 : countryCode,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.prices,+metadata,+tags,*categories",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null
      return {
        response: {
          products: products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[] | any; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const customer = await retrieveCustomer();
  let customerData = {};
  
  if(customer?.id){
    customerData = await retrieveCustomerById(customer?.id);
  }

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)
  return {
    response: {
      products: formatProducts(paginatedProducts, customerData),
      count,
    },
    nextPage,
    queryParams,
  }
}




/**
 * Retrieve store details
 */
export const viewProduct = async (id: any) => {
  
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions('products')),
    }

  

  return sdk.client
    .fetch<{ store: any }>(`/store/view/${id}`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
    .then((data) => data)
    .catch(medusaError)
    
}