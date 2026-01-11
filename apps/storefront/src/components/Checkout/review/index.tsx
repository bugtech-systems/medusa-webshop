"use client"

import { useSearchParams } from "next/navigation"
import PaymentButton from "../payment-button"

const Review = ({ cart }: { cart: any }) => {
  const searchParams = useSearchParams()
  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white shadow-1 rounded-[10px] mt-7.5">
      <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
        <h3 className="font-medium text-xl text-dark">Order Review</h3>
      </div>

      <div className="p-4 sm:p-8.5">
        {isOpen && previousStepsCompleted ? (
          <div className="space-y-6">
            <div className="bg-gray-1 p-5 rounded-lg border border-gray-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <svg
                    className="w-5 h-5 text-dark-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark mb-2">
                    All Steps Completed
                  </h4>
                  <p className="text-sm text-dark-5">
                    Please review and confirm your order details before placing your order.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-3 pt-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="mt-0.5">
                  <svg
                    className="w-5 h-5 text-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-dark mb-3">Terms & Conditions</h4>
                  <p className="text-sm text-dark-5 leading-relaxed">
                    By clicking the "Place Order" button, you confirm that you have read, 
                    understand and accept our Terms of Use, Terms of Sale and Returns Policy. 
                    You also acknowledge that you have read and understood our Privacy Policy.
                  </p>
                </div>
              </div>

              <PaymentButton cart={cart} data-testid="submit-order-button" />
            </div>
          </div>
        ) : isOpen ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg
                className="w-12 h-12 text-dark-4 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="font-medium text-dark text-lg mb-2">
              Complete Previous Steps
            </h4>
            <p className="text-dark-5 max-w-md mx-auto">
              Please complete shipping address, shipping method, and payment information 
              before reviewing your order.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-1 rounded-lg border border-gray-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border border-gray-4"></div>
              <div>
                <h4 className="font-medium text-dark">Order Review</h4>
                <p className="text-sm text-dark-5">
                  Review order details and confirm purchase
                </p>
              </div>
            </div>
            <div className="text-sm text-dark-4">
              Not completed
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Review