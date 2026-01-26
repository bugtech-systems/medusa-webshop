import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (

  <PaymentWrapper cart={cart}>
      <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-2 py-24 h-full">
        <CheckoutForm cart={cart} customer={customer} />
                <div className="relative">
         <CheckoutSummary cart={cart} /> 
                 </div>
            </div>
      </PaymentWrapper>
    
  )
}
