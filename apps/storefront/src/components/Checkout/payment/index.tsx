"use client"

import { RadioGroup } from "@headlessui/react"
import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputCard =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputCard) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-xl text-dark">Payment Method</h3>
          {!isOpen && paymentReady && (
            <button
              onClick={handleEdit}
              className="text-blue hover:text-blue-dark text-sm font-medium"
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-8.5">
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <div className="mb-6">
                <p className="text-dark-5 mb-6">
                  Choose your preferred payment method
                </p>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onChange={(value: string) => setPaymentMethod(value)}
                >
                  <div className="space-y-4">
                    {availablePaymentMethods.map((paymentMethod) => (
                      <div key={paymentMethod.id}>
                        {isStripeLike(paymentMethod.id) ? (
                          <StripeCardContainer
                            paymentProviderId={paymentMethod.id}
                            selectedPaymentOptionId={selectedPaymentMethod}
                            paymentInfoMap={paymentInfoMap}
                            setCardBrand={setCardBrand}
                            setError={setError}
                            setCardComplete={setCardComplete}
                          />
                        ) : (
                          <PaymentContainer
                            paymentInfoMap={paymentInfoMap}
                            paymentProviderId={paymentMethod.id}
                            selectedPaymentOptionId={selectedPaymentMethod}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {paidByGiftcard && (
            <div className="p-4 bg-gray-1 rounded-lg border border-gray-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-4 border-blue"></div>
                <div>
                  <h4 className="font-medium text-dark">Gift Card</h4>
                  <p className="text-sm text-dark-5">
                    Your order is fully covered by gift cards
                  </p>
                </div>
              </div>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
            className="mb-6"
          />

          <div className="flex justify-start">
            <Button
              size="large"
              className="mt-6 py-3 px-8 rounded-lg font-medium transition-all duration-200 bg-blue text-white hover:bg-blue-dark"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={
                (isStripeLike(selectedPaymentMethod) && !cardComplete) ||
                (!selectedPaymentMethod && !paidByGiftcard)
              }
              data-testid="submit-payment-button"
            >
              {!activeSession && isStripeLike(selectedPaymentMethod)
                ? "Enter card details"
                : "Continue to review"}
            </Button>
          </div>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-gray-1 rounded-lg border border-gray-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border-4 border-blue"></div>
                    <div>
                      <Heading className="font-medium text-dark text-base" level="h4">
                        {paymentInfoMap[activeSession?.provider_id]?.title ||
                          activeSession?.provider_id}
                      </Heading>
                      <Text
                        className="text-sm text-dark-5"
                        data-testid="payment-method-summary"
                      >
                        {isStripeLike(selectedPaymentMethod) && cardBrand
                          ? `${cardBrand} card`
                          : "Payment method selected"}
                      </Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircleSolid className="w-4 h-4" />
                    <span>Ready</span>
                  </div>
                </div>

                {isStripeLike(selectedPaymentMethod) && (
                  <div className="mt-4 pt-4 border-t border-gray-3">
                    <div
                      className="flex gap-2 text-dark-5 items-center"
                      data-testid="payment-details-summary"
                    >
                      <Container className="flex items-center p-2 bg-gray-2 rounded">
                        {paymentInfoMap[selectedPaymentMethod]?.icon || (
                          <CreditCard />
                        )}
                      </Container>
                      <Text className="text-sm">
                        {isStripeLike(selectedPaymentMethod) && cardBrand
                          ? cardBrand
                          : "Card details entered"}
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="p-4 bg-gray-1 rounded-lg border border-gray-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-4 border-blue"></div>
                  <div>
                    <Heading className="font-medium text-dark text-base" level="h4">
                      Gift Card
                    </Heading>
                    <Text
                      className="text-sm text-dark-5"
                      data-testid="payment-method-summary"
                    >
                      Your order is fully covered by gift cards
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircleSolid className="w-4 h-4" />
                  <span>Paid</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-dark-5">
              No payment method selected yet
            </div>
          )}
        </div>
      </div>
      <Divider className="mt-8 border-gray-3" />
    </div>
  )
}

export default Payment