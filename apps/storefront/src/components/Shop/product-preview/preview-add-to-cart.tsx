"use client"

import { HttpTypes, StoreProduct, StoreRegion } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import ShoppingBag from "@/modules/common/icons/shopping-bag"
import { useEffect, useMemo, useState } from "react"
import { CompanyDTO } from "@/lib/types"
import { useParams } from "next/navigation"
import { isEqual } from "lodash"
import { addToCart } from "@lib/data/cart";

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
    
    
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}


const PreviewAddToCart = ({
  product,
  region,
  company
}: {
  product: StoreProduct
  region: StoreRegion
  company?: CompanyDTO
}) => {
  const [isAdding, setIsAdding] = useState(false)


  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    let variant = product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    });
    
    if(variant){
      return variant
    } else {
      return product?.variants[0]
    }
    
  }, [product.variants, options])

  const handleAddToCart = async () => {
      if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })
    setIsAdding(false)
  };

  return (
    <Button
      className="rounded-full p-3 border-none shadow-none text-white bg-blue"
      onClick={(e) => {
        e.preventDefault()
        handleAddToCart()
      }}
      isLoading={isAdding}
    >
      <ShoppingBag fill="#fff" />
    </Button>
  )
}

export default PreviewAddToCart
