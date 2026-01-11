import { Radio as RadioGroupOption } from "@headlessui/react"
import React, { useContext, useMemo, useState, useEffect, type JSX } from "react"
import { isManual } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { CardElement } from "@stripe/react-stripe-js"
import { StripeCardElementOptions } from "@stripe/stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
  isMounted?: boolean
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
  isMounted = true,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"
  const isSelected = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={`flex flex-col w-full p-4 border rounded-lg cursor-pointer transition-all duration-200 mb-3 ${
        isSelected
          ? "border-blue bg-blue/5"
          : "border-gray-3 hover:border-blue/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
            isSelected
              ? "border-blue bg-blue"
              : "border-gray-4"
          }`}>
            {isSelected && (
              <div className="h-2 w-2 rounded-full bg-white"></div>
            )}
          </div>
          <span className="font-medium text-dark">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </span>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden sm:block" />
          )}
        </div>
        <div className="text-dark-4">
          {paymentInfoMap[paymentProviderId]?.icon}
        </div>
      </div>
      
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="sm:hidden text-xs mt-2" />
      )}
      
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

export const StripeCardContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setCardBrand,
  setError,
  setCardComplete,
  isMounted = false,
}: Omit<PaymentContainerProps, "children"> & {
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
  isMounted?: boolean
}) => {
  const stripeReady = useContext(StripeContext)
  const isSelected = selectedPaymentOptionId === paymentProviderId
  const [shouldShowCard, setShouldShowCard] = useState(false)
  const [cardElementKey, setCardElementKey] = useState(0)

  // Control when to show the card element to prevent Stripe errors
  useEffect(() => {
    if (isSelected && stripeReady && isMounted) {
      // Small delay to ensure proper mounting
      const timer = setTimeout(() => {
        setShouldShowCard(true)
        setCardElementKey(prev => prev + 1) // Force re-render of CardElement
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setShouldShowCard(false)
    }
  }, [isSelected, stripeReady, isMounted])

  // Reset error and completion when switching away from this option
  useEffect(() => {
    if (!isSelected) {
      setError(null)
      setCardComplete(false)
    }
  }, [isSelected, setError, setCardComplete])

  const useOptions: StripeCardElementOptions = useMemo(() => {
    return {
      style: {
        base: {
          fontFamily: "Inter, sans-serif",
          color: "#1C2434", // text-dark equivalent
          fontWeight: "400",
          fontSize: "16px",
          "::placeholder": {
            color: "#64748B", // text-dark-5 equivalent
          },
        },
      },
      classes: {
        base: "pt-3 pb-2 block w-full h-12 px-5 mt-2 bg-gray-1 border border-gray-3 rounded-md appearance-none outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20 hover:bg-gray-2 transition-all",
      },
    }
  }, [])

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
      isMounted={isMounted}
    >
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-3">
          {shouldShowCard && stripeReady ? (
            <>
              <h4 className="font-medium text-dark mb-3">
                Enter your card details:
              </h4>
              <div className="relative">
                <CardElement
                  key={`card-element-${cardElementKey}`}
                  options={useOptions as StripeCardElementOptions}
                  onChange={(e) => {
                    if (e.brand) {
                      setCardBrand(
                        e.brand.charAt(0).toUpperCase() + e.brand.slice(1)
                      )
                    }
                    setError(e.error?.message || null)
                    setCardComplete(e.complete)
                  }}
                />
                {!shouldShowCard && (
                  <div className="absolute inset-0 bg-gray-1/50 rounded-md flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue"></div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <SkeletonCardDetails />
          )}
        </div>
      )}
    </PaymentContainer>
  )
}