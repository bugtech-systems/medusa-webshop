import { Suspense } from "react"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"
import Breadcrumb from "@/components/Common/Breadcrumb"
import SkeletonStoreTemplate from "@modules/skeletons/templates/skeleton-grid"

const ShopWithSidebar = ({
  sortBy,
  page,
  countryCode,
  searchParams
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  searchParams?: any
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
<>
        <Breadcrumb
        title={searchParams ? `Search results: ${searchParams}` : 'Explore Products'}
        titles={[searchParams ? searchParams : 'Shop']}
        pages={[searchParams ? `products?q=${searchParams}` : 'shop']}
      />
      <section className="overflow-hidden relative pb-20 pt-5 lg:pt-10 xl:pt-18 bg-[#f3f4f6]">
        <Suspense fallback={<SkeletonStoreTemplate />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            searchParams={searchParams}
          />
        </Suspense>
        </section>
    </>
  )
}

export default ShopWithSidebar
