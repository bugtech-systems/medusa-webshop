// lib/formatters/product-formatter.ts
import { HttpTypes } from "@medusajs/types"

export interface FormattedProduct {
  id: string
  title: string
  description: string | null
  reviews: number
  price: number
  discountedPrice: number
  originalPrice: number
  img: string
  images: string[]
  imgs: {
    thumbnails: string[]
    previews: string[]
  }
  variants?: Array<{
    id: string
    title: string
    price: number
    options: Record<string, string>
  }>
  categories?: any
  tags?: Array<{
    id: string
    value: string
  }>
  hasDiscount?: boolean
  handle: string
  stock?: number
  inStock: boolean
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export const formatProduct = (product: HttpTypes.StoreProduct | any, customer: any): FormattedProduct => {
  // Get the first variant for pricing
  
const membership = customer?.groups ? customer.groups[0]?.name : "nonmember"  
const firstVariant = product.variants?.[0] as any;
let standard_price = product.metadata ? product.metadata['nonmember'] : firstVariant?.prices[0]?.amount as any;
let discount_price = product.metadata ? product.metadata[membership] : standard_price as any;
  const originalPrice = discount_price || firstVariant?.prices[0]?.amount

  
  
  // Find the thumbnail image (usually first in list or marked as thumbnail)
  const thumbnailImage = product.images?.find(img => 
    img.metadata?.is_thumbnail || 
    img.metadata?.purpose === 'thumbnail'
  ) || product.images?.[0]


  // Get all images
  const allImages = product.images?.map(img => img.url) || []
  
  
  
  
  // Split images into thumbnails and previews based on metadata or size
  const thumbnails = product.images
    ?.filter(img => 
      img.metadata?.type === 'thumbnail' || 
      img.metadata?.is_thumbnail ||
      img.metadata?.size === 'small'
    )
    .map(img => img.url) || []

  const previews = product.images
    ?.filter(img => 
      img.metadata?.type === 'preview' || 
      img.metadata?.is_preview ||
      img.metadata?.size === 'large'
    )
    .map(img => img.url) || allImages














  // Calculate discounted price if there's a sale
  const hasDiscount = standard_price && 
                      discount_price < standard_price
  
  const discountedPrice = hasDiscount ? discount_price : originalPrice
  // Get review count from metadata or default to 0
  const views = product.metadata?.views || 0 as any

    

  return {
     ...product,
    id: product.id,
    title: product.title || "",
    description: product.description || product.subtitle || null,
    views: typeof views === 'number' ? views : parseInt(views) || 0,
    price: originalPrice,
    discountedPrice: discountedPrice || 0,
    originalPrice: standard_price,
    img: thumbnailImage?.url || product.thumbnail || "",
    images: product.images,
    thumbnail: product.images[0] ? product.images[0].url : null,
    imgs: {
      thumbnails: thumbnails.length > 0 ? thumbnails : allImages.slice(0, 3),
      previews: previews.length > 0 ? previews : allImages
    },
    sku: product.variants[0].sku,
    category: product.categories[0] ? product.categories[0].name : null,
    variants: product.variants?.map(variant => ({
      ...variant,
      id: variant.id,
      title: variant.title || product.title || "",
      price: firstVariant?.prices[0].amount || standard_price || 0
    })),
    categories: product.categories,
    tags: product.tags?.map(tag => ({
      id: tag.id,
      value: tag.value
    })),
    handle: product.handle,
    hasDiscount,
    stock: firstVariant?.inventory_quantity,
    inStock: (firstVariant?.inventory_quantity || 0) > 0,
    metadata: product.metadata,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  }
}

// Batch formatter for multiple products
export const formatProducts = (products: HttpTypes.StoreProduct[], customer: any): FormattedProduct[] => {
  return products.map(product => formatProduct(product, customer))
}

// Formatter for product lists (lightweight version)
export const formatProductList = (products: HttpTypes.StoreProduct[]): Array<{
  id: string
  title: string
  price: number
  discountedPrice: number
  img: string
  inStock: boolean
}> => {
  return products.map(product => {
    const firstVariant = product.variants?.[0] as any;
  const calculatedPrices = firstVariant?.prices || firstVariant?.prices[0].amount || 0
  const originalPrice = firstVariant?.prices[0].amount || calculatedPrices
  
    const thumbnail = product.images?.[0]?.url || product.thumbnail || ""
    
    
    
    
    
    return {
      id: product.id,
      title: product.title || "",
      price: originalPrice,
      discountedPrice: calculatedPrice,
      img: thumbnail,
      inStock: (firstVariant?.inventory_quantity || 0) > 0
    }
  })
}

// Helper to extract specific fields (if you only need certain fields)
export const extractProductFields = (
  product: HttpTypes.StoreProduct, 
  fields: Array<keyof FormattedProduct>
): Partial<FormattedProduct> => {
  const formatted = formatProduct(product)
  const result: Partial<FormattedProduct> = {}
  
  fields.forEach(field => {
    if (field in formatted) {
      result[field] = formatted[field]
    }
  })
  
  return result
}

// Price formatter helper (reusable)
export const formatPrice = (amount: number, currencyCode: string = "USD"): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) // Medusa stores prices in cents
}

// Image URL formatter helper
export const formatImageUrl = (url: string, size?: 'thumbnail' | 'small' | 'medium' | 'large'): string => {
  if (!url) return ''
  
  // If you're using a CDN or image service, you can add size parameters here
  // Example for Cloudinary, Imgix, etc.
  if (size === 'thumbnail') {
    return `${url}?w=150&h=150&fit=crop`
  } else if (size === 'small') {
    return `${url}?w=300&h=300&fit=cover`
  } else if (size === 'medium') {
    return `${url}?w=600&h=600&fit=cover`
  } else if (size === 'large') {
    return `${url}?w=1200&h=1200&fit=cover`
  }
  
  return url
}

// Usage examples:
/*
// Single product
const product = await medusaClient.products.retrieve(productId)
const formattedProduct = formatProduct(product)

// Product list
const { products } = await medusaClient.products.list()
const formattedProducts = formatProducts(products)

// Lightweight list for grids
const productList = formatProductList(products)

// Specific fields only
const minimalProduct = extractProductFields(product, ['id', 'title', 'price', 'img'])

// Format price
const priceDisplay = formatPrice(formattedProduct.price, 'USD')
*/