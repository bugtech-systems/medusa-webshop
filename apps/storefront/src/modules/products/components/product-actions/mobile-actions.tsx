import { Dialog, Transition } from "@headlessui/react"
import { Button, clx } from "@medusajs/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"
import { formatPrice, calculateDiscount } from "@lib/formatters/prices"

type MobileActionsProps = {
  product: any
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  membership?: "member" | "student" | "nonmember"
  optionsDisabled: boolean
  currencyCode?: string
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
  membership = "nonmember",
  currencyCode = "AUD"
}) => {
  const { state, open, close } = useToggleState()

  // Extract prices from metadata
  const metadata = product.metadata || {}
  // Prices in cents
  const prices = {
    nonmember: metadata.nonmember ? Number(metadata.nonmember) : 0,
    member: metadata.member ? Number(metadata.member) : 0,
    student: metadata.student ? Number(metadata.student) : 0,
  }

  // // Get base price info from Medusa
  // const price = getProductPrice({
  //   product: product,
  //   variantId: variant?.id,
  // })
  
    // Determine user's price
  const userPrice = membership === "member" 
    ? (prices.member || prices.nonmember)
    : membership === "student"
    ? (prices.student || prices.nonmember)
    : prices.nonmember

  // const selectedPrice = useMemo(() => {
  //   if (!price) {
  //     return null
  //   }
  //   const { variantPrice, cheapestPrice } = price
  //   return variantPrice || cheapestPrice || null
  // }, [price])

  // Determine user's price based on membership
  // const userPrice = useMemo(() => {
  //   if (membership === "member") {
  //     return prices.member || prices.nonmember
  //   } else if (membership === "student") {
  //     return prices.student || prices.nonmember
  //   }
  //   return prices.nonmember
  // }, [membership, prices.member, prices.student, prices.nonmember])

  // const userPrice = product?.discountedPrice;


  // Calculate savings
  const savings = useMemo(() => {
    if (membership !== "nonmember" && prices.nonmember && userPrice < prices.nonmember) {
      return {
        amount: prices.nonmember - userPrice,
        percentage: calculateDiscount(prices.nonmember, userPrice)
      }
    }
    return null
  }, [membership, prices.nonmember, userPrice])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="bg-white flex flex-col gap-y-4 justify-center items-center text-large-regular p-4 h-full w-full border-t border-gray-200 shadow-lg"
            data-testid="mobile-actions"
          >
            {/* Mobile Price Display */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-dark" data-testid="mobile-title">
                  {product.title}
                </span>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(userPrice)}
                    </span>
                    {savings && (
                      <span className="text-xs text-green-600 font-medium">
                        Save {savings.percentage}%
                      </span>
                    )}
                  </div>
                  {savings && (
                    <div className="text-xs text-gray-500">
                      <span className="line-through mr-1">
                        {formatPrice(prices.nonmember)}
                      </span>
                      Regular
                    </div>
                  )}
                </div>
              </div>
              
              {/* Membership Indicator */}
              {membership !== "nonmember" && (
                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  membership === "member" 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {membership.charAt(0).toUpperCase() + membership.slice(1)} Price Applied
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={clx("grid w-full gap-x-4", {
              "grid-cols-2": !isSimple,
              "grid-cols-1": isSimple
            })}>
              {!isSimple && (
                <Button
                  onClick={open}
                  variant="secondary"
                  className="w-full"
                  data-testid="mobile-actions-button"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">
                      {variant
                        ? Object.values(options).join(" / ")
                        : "Select Options"}
                    </span>
                    <ChevronDown />
                  </div>
                </Button>
              )}
              
              <Button
                onClick={handleAddToCart}
                disabled={!inStock || !variant}
                  className={`w-full inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md ease-out duration-200 hover:bg-blue-dark
                  `}
                  isLoading={isAdding}
                data-testid="mobile-cart-button"
              >
                {!variant
                  ? "Select variant"
                  : !inStock
                  ? "Out of stock"
                  : `Add to cart - ${formatPrice(userPrice)}`}
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      {/* Options Modal */}
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-700 bg-opacity-75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="w-full h-full transform overflow-hidden text-left flex flex-col"
                  data-testid="mobile-actions-modal"
                >
                  {/* Header with pricing info */}
                  <div className="bg-white p-4 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-dark">{product.title}</h3>
                        
                        {/* Pricing in modal header */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatPrice(userPrice)}
                            </div>
                            {savings && (
                              <div className="text-sm text-green-600 font-medium">
                                Save {savings.percentage}%
                              </div>
                            )}
                          </div>
                          
                          {savings && (
                            <div className="text-sm text-gray-500">
                              <span className="line-through mr-2">
                                {formatPrice(prices.nonmember)}
                              </span>
                              Regular price
                            </div>
                          )}
                          
                          {membership !== "nonmember" && (
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${
                              membership === "member" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {membership.charAt(0).toUpperCase() + membership.slice(1)} discount applied
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={close}
                        className="ml-4 w-10 h-10 rounded-full text-ui-fg-base flex justify-center items-center hover:bg-gray-100"
                        data-testid="close-modal-button"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Available pricing tiers */}
                    {(prices.member || prices.student) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs font-medium text-dark mb-2">Available pricing:</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Regular</span>
                            <span>{formatPrice(prices.nonmember)}</span>
                          </div>
                          
                          {prices.member && (
                            <div className={`flex justify-between items-center ${
                              membership === "member" ? "text-blue-600 font-medium" : ""
                            }`}>
                              <span>Member</span>
                              <div className="flex items-center gap-2">
                                <span>{formatPrice(prices.member)}</span>
                                {prices.nonmember && prices.member < prices.nonmember && (
                                  <span className={`text-xs ${membership === "member" ? "text-green-600" : "text-gray-500"}`}>
                                    saves {formatPrice(prices.nonmember - prices.member)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {prices.student && (
                            <div className={`flex justify-between items-center ${
                              membership === "student" ? "text-green-600 font-medium" : ""
                            }`}>
                              <span>Student</span>
                              <div className="flex items-center gap-2">
                                <span>{formatPrice(prices.student)}</span>
                                {prices.nonmember && prices.student < prices.nonmember && (
                                  <span className={`text-xs ${membership === "student" ? "text-green-600" : "text-gray-500"}`}>
                                    saves {formatPrice(prices.nonmember - prices.student)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options Selection */}
                  <div className="bg-white flex-1 overflow-y-auto px-6 py-4">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={option.title ?? ""}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Button in Modal */}
                  <div className="p-4 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        handleAddToCart()
                        close()
                      }}
                      disabled={!inStock || !variant}
                 className={`inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md ease-out duration-200 hover:bg-blue-dark`}
                      isLoading={isAdding}
                      size="large"
                    >
                      {!variant
                        ? "Please select options"
                        : !inStock
                        ? "Out of stock"
                        : `Add to cart - ${formatPrice(userPrice)}`}
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions