import { notFound } from "next/navigation"
import { Suspense } from "react"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { HttpTypes } from "@medusajs/types"
import PaginatedProducts from "../templates/paginated-products"
import Breadcrumb from "@/components/Common/Breadcrumb"
import SkeletonStoreTemplate from "@modules/skeletons/templates/skeleton-grid"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)





  return (
  <>
        <Breadcrumb
        title={`Explore ${category.name} Category`}
        titles={[category.name]}
        pages={[category.handle]}
      />
      <section className="overflow-hidden relative pb-20 pt-5 lg:pt-20 xl:pt-28 bg-[#f3f4f6]">
    
        <Suspense
          fallback={
            <SkeletonStoreTemplate
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
          />
        </Suspense>
         </section>
    </>
  )
}
