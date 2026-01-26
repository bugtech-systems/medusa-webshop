import { cookies as nextCookies } from "next/headers"
import Link from "next/link"
import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <section className="overflow-hidden py-20 bg-gray-2">
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="bg-white rounded-xl shadow-1 px-4 py-10 sm:py-15 lg:py-20 xl:py-25">
          {isOnboarding && <OnboardingCta orderId={order.id} />}
          
          <div className="text-center mb-10" data-testid="order-complete-container">
            <h2 className="font-bold text-green-600 text-4xl lg:text-[45px] lg:leading-[57px] mb-5">
              Order Successful!
            </h2>

            <h3 className="font-medium text-dark text-xl sm:text-2xl mb-3">
              Thank you for your purchase
            </h3>

            <p className="max-w-[491px] w-full mx-auto mb-7.5 text-dark-5">
              Your order <span className="font-medium text-dark">#{order.display_id}</span> has been placed successfully. 
              You will receive an email confirmation shortly with your order details.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-medium text-white bg-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue-dark"
              >
                <svg
                  className="fill-current"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.6654 9.37502C17.0105 9.37502 17.2904 9.65484 17.2904 10C17.2904 10.3452 17.0105 10.625 16.6654 10.625H8.95703L8.95703 15C8.95703 15.2528 8.80476 15.4807 8.57121 15.5774C8.33766 15.6207 8.06884 15.6207 7.89009 15.442L2.89009 10.442C2.77288 10.3247 2.70703 10.1658 2.70703 10C2.70703 9.83426 2.77288 9.67529 2.89009 9.55808L7.89009 4.55808C8.06884 4.37933 8.33766 4.32586 8.57121 4.42259C8.80475 4.51933 8.95703 4.74723 8.95703 5.00002L8.95703 9.37502H16.6654Z"
                    fill=""
                  />
                </svg>
                Back to Home
              </Link>
              
              <Link
                href="/account/orders"
                className="inline-flex items-center gap-2 font-medium text-blue border border-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue hover:text-white"
              >
                <svg
                  className="fill-current"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3.33398 5.83333C3.33398 5.3731 3.70708 5 4.16732 5H15.834C16.2942 5 16.6673 5.3731 16.6673 5.83333V7.5C16.6673 7.96024 16.2942 8.33333 15.834 8.33333H4.16732C3.70708 8.33333 3.33398 7.96024 3.33398 7.5V5.83333Z"
                    fill="currentColor"
                  />
                  <path
                    d="M3.33398 10.8333C3.33398 10.3731 3.70708 10 4.16732 10H15.834C16.2942 10 16.6673 10.3731 16.6673 10.8333V12.5C16.6673 12.9602 16.2942 13.3333 15.834 13.3333H4.16732C3.70708 13.3333 3.33398 12.9602 3.33398 12.5V10.8333Z"
                    fill="currentColor"
                  />
                  <path
                    d="M3.33398 15.8333C3.33398 15.3731 3.70708 15 4.16732 15H15.834C16.2942 15 16.6673 15.3731 16.6673 15.8333V17.5C16.6673 17.9602 16.2942 18.3333 15.834 18.3333H4.16732C3.70708 18.3333 3.33398 17.9602 3.33398 17.5V15.8333Z"
                    fill="currentColor"
                  />
                </svg>
                View All Orders
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-3 pt-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-white rounded-[10px] shadow-1 p-6 mb-8">
                  <h3 className="font-medium text-xl text-dark mb-6">Order Summary</h3>
                  <Items order={order} />
                  <div className="mt-8">
                    <CartTotals totals={order} />
                  </div>
                </div>

                <div className="bg-white rounded-[10px] shadow-1 p-6">
                  <h3 className="font-medium text-xl text-dark mb-6">Order Details</h3>
                  <OrderDetails order={order} />
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white rounded-[10px] shadow-1 p-6">
                  <h3 className="font-medium text-xl text-dark mb-6">Shipping Details</h3>
                  <ShippingDetails order={order} />
                </div>

                <div className="bg-white rounded-[10px] shadow-1 p-6">
                  <h3 className="font-medium text-xl text-dark mb-6">Payment Details</h3>
                  <PaymentDetails order={order} />
                </div>

                <div className="bg-white rounded-[10px] shadow-1 p-6">
                  <Help />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}