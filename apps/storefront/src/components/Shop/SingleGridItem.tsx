"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useDispatch } from "react-redux"
import { AppDispatch } from "@/redux/store"
import { useParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { Text } from "@medusajs/ui"
import PreviewAddToCart from "./product-preview/preview-add-to-cart"

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, opt: any) => {
    acc[opt.option_id] = opt.value
    return acc
  }, {})
}

const SingleGridItem = ({
  item,
  region,
}: {
  item: HttpTypes.StoreProduct
  region?: HttpTypes.StoreRegion
}) => {
  const countryCode = useParams().countryCode as string
  const [options, setOptions] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    if (item.variants?.length === 1) {
      setOptions(optionsAsKeymap(item.variants[0].options) ?? {})
    }
  }, [item.variants])

  const selectedVariant = useMemo(() => {
    if (!item.variants?.length) return undefined

    return (
      item.variants.find((v) =>
        isEqual(optionsAsKeymap(v.options), options)
      ) || item.variants[0]
    )
  }, [item.variants, options])



console.log(selectedVariant, 'selected')


  return (
    <LocalizedClientLink href={`/products/${item.handle}`} className="group block">
      <div
        className="
          relative flex flex-col
          aspect-[3/4] w-full
          rounded-lg bg-white shadow-1
          p-4 
          overflow-hidden
        "
      >
        {/* Image */}
        <div className="w-full p-5">
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.images}
            size="square"
          />
        </div>

        {/* Title — safe, never overlaps */}
        <Text
          className="
            text-ui-fg-base font-medium
            line-clamp-2
            leading-snug
          "
          data-testid="product-title"
        >
          {item.title}
        </Text>

        {/* Bottom bar — FIXED */}
        <div
          className="
            absolute bottom-0 inset-x-0
            bg-white
            px-4 pb-4
          "
        >
          <div className="flex items-end justify-between gap-3">
            {/* Price + VAT */}
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-2 font-medium text-lg">
                <span className="text-dark">${item.discountedPrice}</span>
                {item.discountable &&
                  item.price > item.discountedPrice && (
                    <span className="text-dark-4 line-through">
                      ${item.price}
                    </span>
                  )}
              </span>
              <Text className="text-neutral-600 text-[0.6rem]">
                Excl. VAT
              </Text>
            </div>

            {/* Add to cart */}
            <PreviewAddToCart product={item} region={region} />
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}

export default SingleGridItem
