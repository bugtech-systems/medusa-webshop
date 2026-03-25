import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from ".."
import { Pagination } from "../pagination"
import { listCategories } from "@lib/data/categories"
import { getProductPrice } from "@lib/util/get-product-price"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: any
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  searchParams, // New prop for search
  categories

}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  searchParams?: string
  categories?: any
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }
  
  // Add search query if provided
  if (searchParams) {
    queryParams.q = searchParams
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }




  let {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
  })


  const totalPages = Math.ceil(count / PRODUCT_LIMIT)
  
  let newProducts = products.map(a => {
      const { cheapestPrice } = getProductPrice({
      product: a,
    })
    
    return {...a, cheapestPrice}
  })




  return (
    <>
      <StoreTemplate
          products={newProducts}  
          page={page}
          totalPages={totalPages}
          categories={categories}
      />
     
    </>
  )
}
