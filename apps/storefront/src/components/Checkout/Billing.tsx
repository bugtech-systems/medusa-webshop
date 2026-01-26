"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { useToggleState } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import BillingAddress from "./billing_address"
import ErrorMessage from "./error-message"
import ShippingAddress from "./shipping-address"
import { SubmitButton } from "./submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: any | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"
  const [dropdown, setDropdown] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isCompleted = cart?.shipping_address && cart?.billing_address && cart?.email
  const isReturningCustomer = !!customer
  const hasNoAddress = (!cart?.shipping_address?.first_name && !cart?.shipping_address?.last_name)

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  useEffect(() => {
    if (hasNoAddress && !isReturningCustomer && !isOpen) {
      handleEdit()
    } else if (isOpen) {
      setDropdown(true)
      setIsEditing(true)
    } else if (isCompleted) {
      setDropdown(true)
      setIsEditing(false)
      handleRedirects()
    } else if (hasNoAddress && isReturningCustomer) {
      setDropdown(true)
    }
  }, [hasNoAddress, isReturningCustomer, isOpen, isCompleted])

  const handleEdit = () => {
    setIsEditing(true)
    setDropdown(true)
    router.push(pathname + "?step=address")
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    router.push(pathname)
  }

  const handleStartNewAddress = () => {
    setIsEditing(true)
    setDropdown(true)
  }

  const handleRedirects = () => {
    const paidByGiftcard =
      cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0
    const addressComplete =
      cart.shipping_address && cart?.shipping_methods?.length > 0
    const paymentComplete = cart.payment_collection || paidByGiftcard

    if (paymentComplete) {
      router.push(pathname + "?step=review")
    } else if (cart.shipping_methods?.length > 0) {
      router.push(pathname + "?step=payment")
    } else if (cart.shipping_address) {
      router.push(pathname + "?step=delivery")
    } else {
      router.push(pathname + "?step=address")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
        const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await setAddresses(cart.id, formData)
      setMessage(null)
      handleRedirects()
    } catch (err: any) {
      setMessage(err.message || "Failed to save address.")
    }
  }

  return (
    <div className="bg-white shadow-1 rounded-[10px]">
      {/* Collapsible Header */}
      <div
        onClick={() => !isEditing && setDropdown(!dropdown)}
        className={`flex items-center justify-between py-5 px-5.5 ${
          dropdown && "border-b border-gray-3"
        } ${isEditing ? "" : "cursor-pointer"}`}
      >
        {/* Header content omitted for brevity; same as before */}
      </div>

      {/* Collapsible Content */}
      <div className={`${dropdown ? "block" : "hidden"} pt-7.5 pb-8.5 px-4 sm:px-8.5`}>
        <form onSubmit={handleSubmit}>
          <ShippingAddress
            customer={customer}
            checked={sameAsBilling}
            onChange={toggleSameAsBilling}
            cart={cart}
          />
          {!sameAsBilling && (
            <div className="mt-8 pt-8 border-t border-gray-3">
              <h3 className="font-medium text-dark text-lg mb-6">Billing Address</h3>
              <BillingAddress cart={cart} />
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-3 flex gap-3">
            <SubmitButton className="w-full sm:w-auto">
              {hasNoAddress ? "Save Address & Continue" : "Save Changes"}
            </SubmitButton>
            {!hasNoAddress && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="py-3 px-8 rounded-lg font-medium transition-all duration-200 bg-gray-1 border border-gray-3 text-dark hover:bg-gray-2"
              >
                Cancel
              </button>
            )}
          </div>

          {message && <ErrorMessage error={message} className="mt-4" />}
        </form>
      </div>
    </div>
  )
}

export default Addresses
