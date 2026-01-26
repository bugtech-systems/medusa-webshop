"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/types/product";
import { useModalContext } from "@/lib/context/QuickViewModalContext";
import { updateQuickView } from "@/redux/features/quickView-slice";
import { addItemToCart } from "@/redux/features/cart-slice";
import { addItemToWishlist } from "@/redux/features/wishlist-slice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import Link from "next/link";
import Image from "next/image";
import Thumbnail from "@modules/products/components/thumbnail";
import { useIntersection } from "@lib/hooks/use-in-view";
import { addToCart } from "@lib/data/cart";
import { useRouter } from "next/navigation"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { FormattedProduct } from "@lib/formatters/product-formatter";
import { viewProduct } from "@lib/data/products";


type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
    
    
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}


const SingleGridItem = ({ item, region }: { item: any, region?: any }) => {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (item.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(item.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [item.variants])

  const selectedVariant = useMemo(() => {
  // console.log(item, 'ITEMM')
    if (!item.variants || item.variants.length === 0) {
      return
    }

    let variant = item.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    });
    
    if(variant){
      return variant
    } else {
      return item?.variants[0]
    }
    
  }, [item.variants, options])




  // update the QuickView state
  const handleQuickViewUpdate = async () => {
    await viewProduct(item?.id);
    dispatch(updateQuickView({ ...item }));
  };

  // add to cart
  const handleAddToCart = async () => {
  console.log(selectedVariant, 'VARIANT')
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
    <div className="group">
      <div className="relative overflow-hidden flex items-center justify-center rounded-lg bg-white shadow-1 min-h-[270px] mb-4">
          <Thumbnail
            thumbnail={item?.thumbnail}
            images={item.images}
            size="square"
          />
        <div className="absolute left-0 bottom-0 translate-y-full w-full flex items-center justify-center gap-2.5 pb-5 ease-linear duration-200 group-hover:translate-y-0">
          <button
            onClick={() => {
              openModal();
              handleQuickViewUpdate();
            }}
            id="newOne"
            aria-label="button for quick view"
            className="inline-flex font-medium flex items-center justify-between px-5 h-9 rounded-[5px] shadow-1 ease-out duration-200 text-dark bg-white hover:text-blue"

            // className="flex items-center justify-center w-9 h-9 rounded-[5px] shadow-1 ease-out duration-200 text-dark bg-white hover:text-blue"
          >
            <svg
              className="fill-current mr-2"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.00016 5.5C6.61945 5.5 5.50016 6.61929 5.50016 8C5.50016 9.38071 6.61945 10.5 8.00016 10.5C9.38087 10.5 10.5002 9.38071 10.5002 8C10.5002 6.61929 9.38087 5.5 8.00016 5.5ZM6.50016 8C6.50016 7.17157 7.17174 6.5 8.00016 6.5C8.82859 6.5 9.50016 7.17157 9.50016 8C9.50016 8.82842 8.82859 9.5 8.00016 9.5C7.17174 9.5 6.50016 8.82842 6.50016 8Z"
                fill=""
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.00016 2.16666C4.99074 2.16666 2.96369 3.96946 1.78721 5.49791L1.76599 5.52546C1.49992 5.87102 1.25487 6.18928 1.08862 6.5656C0.910592 6.96858 0.833496 7.40779 0.833496 8C0.833496 8.5922 0.910592 9.03142 1.08862 9.4344C1.25487 9.81072 1.49992 10.129 1.76599 10.4745L1.78721 10.5021C2.96369 12.0305 4.99074 13.8333 8.00016 13.8333C11.0096 13.8333 13.0366 12.0305 14.2131 10.5021L14.2343 10.4745C14.5004 10.129 14.7455 9.81072 14.9117 9.4344C15.0897 9.03142 15.1668 8.5922 15.1668 8C15.1668 7.40779 15.0897 6.96858 14.9117 6.5656C14.7455 6.18927 14.5004 5.87101 14.2343 5.52545L14.2131 5.49791C13.0366 3.96946 11.0096 2.16666 8.00016 2.16666ZM2.57964 6.10786C3.66592 4.69661 5.43374 3.16666 8.00016 3.16666C10.5666 3.16666 12.3344 4.69661 13.4207 6.10786C13.7131 6.48772 13.8843 6.7147 13.997 6.9697C14.1023 7.20801 14.1668 7.49929 14.1668 8C14.1668 8.50071 14.1023 8.79199 13.997 9.0303C13.8843 9.28529 13.7131 9.51227 13.4207 9.89213C12.3344 11.3034 10.5666 12.8333 8.00016 12.8333C5.43374 12.8333 3.66592 11.3034 2.57964 9.89213C2.28725 9.51227 2.11599 9.28529 2.00334 9.0303C1.89805 8.79199 1.8335 8.50071 1.8335 8C1.8335 7.49929 1.89805 7.20801 2.00334 6.9697C2.11599 6.7147 2.28725 6.48772 2.57964 6.10786Z"
                fill=""
              />
            </svg>
             View

          </button>

          <button
            onClick={() => handleAddToCart()}
            className="inline-flex font-medium text-custom-sm py-[7px] px-5 rounded-[5px] bg-blue text-white ease-out duration-200 hover:bg-blue-dark"
          >
            Add to cart
          </button>
    {/* <LocalizedClientLink href={`/products/${item.handle}`} className="group">
          <button
            // onClick={() => handleItemToWishList()}
            aria-label="button for favorite select"
            id="favOne"
            className="px-10 flex items-center justify-center w-12 h-9 rounded-[5px] shadow-1 ease-out duration-200 text-dark bg-white hover:text-blue"
          >
          </button>
          </LocalizedClientLink> */}
        </div>
      </div>

      {/* <div className="flex items-center gap-2.5 mb-2">
        <div className="flex items-center gap-1">
          <Image
            src="/images/icons/icon-star.svg"
            alt="star icon"
            width={15}
            height={15}
          />
          <Image
            src="/images/icons/icon-star.svg"
            alt="star icon"
            width={15}
            height={15}
          />
          <Image
            src="/images/icons/icon-star.svg"
            alt="star icon"
            width={15}
            height={15}
          />
          <Image
            src="/images/icons/icon-star.svg"
            alt="star icon"
            width={15}
            height={15}
          />
          <Image
            src="/images/icons/icon-star.svg"
            alt="star icon"
            width={15}
            height={15}
          />
        </div>

        <p className="text-custom-sm">({item.reviews})</p>
      </div> */}

      <h3 className="font-medium text-dark ease-out duration-200 hover:text-blue mb-1.5">
        <Link href={`/products/${item.handle}`} > {item.title} </Link>
      </h3>
      <span className="flex items-center gap-2 font-medium text-lg">
        <span className="text-dark">${item.discountedPrice}</span>
       {(item.discountable && item.price > item.discountedPrice) && <span className="text-dark-4 line-through">${item.price}</span>}
      </span>
    </div>
  );
};

export default SingleGridItem;
