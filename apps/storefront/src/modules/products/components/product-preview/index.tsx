import { getProductPrice } from "@/lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Text, clx } from "@medusajs/ui"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewAddToCart from "./preview-add-to-cart"
import PreviewPrice from "./price"
import { CompanyDTO } from "@/lib/types"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
  company,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  company?: CompanyDTO
}) {
  if (!product) return null

  const { cheapestPrice } = getProductPrice({ product })

  const inventoryQuantity = product.variants?.reduce(
    (acc, variant) => acc + (variant?.inventory_quantity || 0),
    0
  )

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group block">
      <div
        data-testid="product-wrapper"
        className="relative flex flex-col aspect-[3/5] w-full overflow-hidden rounded-lg bg-white p-4 shadow-borders-base transition-shadow duration-150 group-hover:shadow-[0_0_0_4px_rgba(0,0,0,0.1)]"
      >
        {/* Image */}
        <div className="relative flex-1 overflow-hidden rounded-md">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            isFeatured={isFeatured}
          />
        </div>

        {/* Product info */}
        <div className="mt-3 flex flex-col gap-1">
          <Text className="text-xs text-neutral-600">BRAND</Text>
          <Text
            className="text-ui-fg-base text-sm font-medium line-clamp-2"
            data-testid="product-title"
          >
            {product.title}
          </Text>
        </div>

        {/* Price */}
        <div className="mt-2 flex flex-col gap-0.5">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          <Text className="text-[0.6rem] text-neutral-600">Excl. VAT</Text>
        </div>

        {/* Bottom bar */}
        <div className="mt-auto pt-3 flex items-center">
          {/* Inventory */}
          <div className="flex items-center gap-1">
            <span
              className={clx("text-sm", {
                "text-green-500": inventoryQuantity && inventoryQuantity > 50,
                "text-orange-500":
                  inventoryQuantity && inventoryQuantity <= 50 && inventoryQuantity > 0,
                "text-red-500": inventoryQuantity === 0,
              })}
            >
              •
            </span>
            <Text className="text-xs text-neutral-600">
              {inventoryQuantity} left
            </Text>
          </div>
        </div>

        {/* Add to cart — pinned bottom right */}
        <div className="absolute bottom-4 right-4">
          <PreviewAddToCart
            product={product}
            region={region}
            company={company}
          />
        </div>
      </div>
    </LocalizedClientLink>
  )
}
