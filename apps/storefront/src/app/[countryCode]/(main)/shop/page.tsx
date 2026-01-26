import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
// import StoreTemplate from "@modules/store/templates"
import ShopWithSidebar from "@/components/ShopWithSidebar/templates"
import { listCategories } from "@lib/data"
import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  customer_group_id?: string
  q?: string
}

export const metadata: Metadata = {
  title: "Store",
  description: "Explore all of our products.",
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams as any;
  const { sortBy, page } = searchParams

  
   const queryParams: PaginatedProductsParams = {
      limit: 12,
    }
  
    
    if (sortBy === "created_at") {
      queryParams["order"] = "created_at"
    }
    
    // Add search query if provided
    if (searchParams) {
      queryParams.q = searchParams
    }
  
    const region = await getRegion(params.countryCode)
  
    if (!region) {
      return null
    }
  

    let categories = await listCategories();
  
  
  
  
  console.log(categories, 'cat main')
  return (
    <ShopWithSidebar
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      categories={categories}
    />
  )
}
