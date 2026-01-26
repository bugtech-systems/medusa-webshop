import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

interface EnhancedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
  _viewCount?: number
}

/**
 * Helper function to sort products by various criteria including views from metadata
 * @param products
 * @param sortBy
 * @returns products sorted by specified criteria
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  let sortedProducts = products as EnhancedProduct[]

  // Precompute values needed for sorting
  sortedProducts.forEach((product) => {
    // Precompute minimum price
    if (product.variants && product.variants.length > 0) {
      product._minPrice = Math.min(
        ...product.variants.map(
          (variant) => variant?.calculated_price?.calculated_amount || 0
        )
      )
    } else {
      product._minPrice = Infinity
    }

    // Precompute view count from metadata
    const viewMetadata = product.metadata?.views || product.metadata?.view_count
    product._viewCount = typeof viewMetadata === 'number' 
      ? viewMetadata 
      : typeof viewMetadata === 'string' 
        ? parseInt(viewMetadata, 10) || 0 
        : 0
  })

  // Apply sorting based on sortBy parameter
  switch (sortBy) {
    case "price_asc":
      sortedProducts.sort((a, b) => a._minPrice! - b._minPrice!)
      break

    case "price_desc":
      sortedProducts.sort((a, b) => b._minPrice! - a._minPrice!)
      break

    case "created_at":
      sortedProducts.sort((a, b) => {
        return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      })
      break

    case "views_desc":
      sortedProducts.sort((a, b) => b._viewCount! - a._viewCount!)
      break

    case "views_asc":
      sortedProducts.sort((a, b) => a._viewCount! - b._viewCount!)
      break

    // Add more sorting options as needed
    default:
      // Default sorting (usually by relevance or created_at)
      sortedProducts.sort((a, b) => {
        return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      })
      break
  }

  return sortedProducts
}

// You'll also need to update your SortOptions type to include view sorting:
export type SortOptions = 
  | "created_at" 
  | "price_asc" 
  | "price_desc" 
  | "views_desc" 
  | "views_asc"
  | "relevance" // Add any other sorting options you need