"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import ErrorMessage from "@modules/checkout/components/error-message"
import Image from "next/image"
import { formatPrice } from "@lib/formatters/prices"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += `${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

// Helper function to get shipping method icon
const getShippingMethodIcon = (methodName: string) => {
  const lowerName = methodName.toLowerCase()
  if (lowerName.includes('fedex') || lowerName.includes('fed ex')) {
    return { src: "/images/checkout/fedex.svg", alt: "fedex", width: 64, height: 18 }
  }
  if (lowerName.includes('dhl')) {
    return { src: "/images/checkout/dhl.svg", alt: "dhl", width: 64, height: 20 }
  }
  if (lowerName.includes('ups')) {
    return { src: "/images/checkout/ups.svg", alt: "ups", width: 64, height: 18 }
  }
  if (lowerName.includes('usps') || lowerName.includes('postal')) {
    return { src: "/images/checkout/usps.svg", alt: "usps", width: 64, height: 20 }
  }
  return null
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [showPickupOptions, setShowPickupOptions] = useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  // Get the selected shipping method for summary view
  const selectedShippingMethod = cart.shipping_methods?.at(-1)

  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-xl text-dark">Shipping Method</h3>
          {!isOpen && selectedShippingMethod && (
            <button
              onClick={handleEdit}
              className="text-blue hover:text-blue-dark text-sm font-medium"
              data-testid="edit-delivery-button"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-8.5">
        {isOpen ? (
          <>
            <div className="mb-6">
              <p className="text-dark-5 mb-6">
                How would you like your order delivered
              </p>

              <div data-testid="delivery-options-container" className="flex flex-col gap-4">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className="flex cursor-pointer select-none items-center gap-3.5"
                    >
                      <div className="relative">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                          showPickupOptions === PICKUP_OPTION_ON
                            ? "border-4 border-blue"
                            : "border border-gray-4"
                        }`}></div>
                      </div>
                      <span className="font-medium text-dark">
                        Pick up your order
                      </span>
                    </Radio>
                  </RadioGroup>
                )}

                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    const icon = getShippingMethodIcon(option.name)
                    const price = option.price_type === "flat" 
                      ? formatPrice(option.amount, cart?.currency_code)
                      : calculatedPricesMap[option.id] 
                        ? formatPrice( calculatedPricesMap[option.id], cart?.currency_code)
                        : isLoadingPrices 
                          ? "Calculating..."
                          : "-"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        disabled={isDisabled}
                        data-testid="delivery-option-radio"
                        className={`flex cursor-pointer select-none items-center gap-3.5 mt-2 ${
                          isDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <div className="relative">
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                            option.id === shippingMethodId
                              ? "border-4 border-blue"
                              : "border border-gray-4"
                          }`}></div>
                        </div>

                        <div className={`rounded-md border-[0.5px] py-3.5 px-5 w-full transition-all duration-200 ${
                          option.id === shippingMethodId
                            ? "border-blue bg-blue/5"
                            : "border-gray-3 hover:bg-gray-2 hover:border-transparent"
                        }`}>
                          <div className="flex items-center">
                            {icon ? (
                              <div className="pr-4">
                                <Image
                                  src={icon.src}
                                  alt={icon.alt}
                                  width={icon.width}
                                  height={icon.height}
                                />
                              </div>
                            ) : (
                              <>
                               
                              </>
                            )}

                            <div className="border-l border-gray-4 pl-4">
                              <p className="font-semibold text-dark">{price}</p>
                              <p className="text-custom-xs text-dark-5">
                                {option.name}
                                {option.price_type === "calculated" && price !== "-" && " (Calculated)"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>

            {showPickupOptions === PICKUP_OPTION_ON && _pickupMethods && (
              <div className="pt-6 border-t border-gray-3">
                <h3 className="font-medium text-dark text-lg mb-4">
                  Store
                </h3>
                <p className="text-dark-5 mb-6">
                  Choose a store near you
                </p>

                <div data-testid="delivery-options-container" className="flex flex-col gap-4">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={`flex cursor-pointer select-none items-center gap-3.5 ${
                            option.insufficient_inventory ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <div className="relative">
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
                              option.id === shippingMethodId
                                ? "border-4 border-blue"
                                : "border border-gray-4"
                            }`}></div>
                          </div>

                          <div className={`rounded-md border-[0.5px] py-3.5 px-5 w-full transition-all duration-200 ${
                            option.id === shippingMethodId
                              ? "border-blue bg-blue/5"
                              : "border-gray-3 hover:bg-gray-2 hover:border-transparent"
                          }`}>
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-dark">{option.name}</span>
                                <span className="font-semibold text-dark">
                                  {formatPrice( option.amount, cart?.currency_code)}
                                </span>
                              </div>
                              <p className="text-custom-xs text-dark-5">
                                {formatAddress(
                                  option.service_zone?.fulfillment_set?.location?.address
                                )}
                              </p>
                            </div>
                          </div>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-gray-3 mt-6">
              <ErrorMessage
                error={error}
                data-testid="delivery-option-error-message"
                className="mb-6"
              />
              <div className="flex justify-start">
                <button
                  onClick={handleSubmit}
                  disabled={!cart.shipping_methods?.[0] || isLoading}
                  className={`py-3 px-8 rounded-lg font-medium transition-all duration-200 ${
                    !cart.shipping_methods?.[0] || isLoading
                      ? "bg-gray-3 text-dark-4 cursor-not-allowed"
                      : "bg-blue text-white hover:bg-blue-dark"
                  }`}
                  data-testid="submit-delivery-option-button"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    "Continue to payment"
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          // Summary view when not editing
          <div>
            {selectedShippingMethod ? (
              <div className="flex items-center justify-between p-4 bg-gray-1 rounded-lg border border-gray-3">
                <div className="flex items-center gap-4">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                    selectedShippingMethod ? "border-4 border-blue" : "border border-gray-4"
                  }`}></div>
                  <div>
                    <h3 className="font-medium text-dark mb-1">{selectedShippingMethod.name}</h3>
                    <p className="text-sm text-dark-5">
                      {formatPrice(selectedShippingMethod.amount, cart?.currency_code)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircleSolid className="w-4 h-4" />
                  <span>Confirmed</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-dark-5">
                No shipping method selected yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Shipping