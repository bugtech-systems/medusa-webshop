// src/app/[countryCode]/pay/draft-order/[id]/page.tsx
"use client"

import { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import PaymentWrapper, { StripeContext } from "@modules/checkout/components/payment-wrapper"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { CardElement, useStripe, useElements,  Elements } from "@stripe/react-stripe-js"
import { isStripeLike } from "@lib/constants"
import { loadStripe } from "@stripe/stripe-js"
import PaymentButton from "@modules/checkout/components/payment-button"
import { initiatePaymentSession } from "@lib/data"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!)


type DraftOrderPaymentPageProps = {
  draftOrder: any
}

export default  function DraftOrderPaymentPage({ draftOrder }: DraftOrderPaymentPageProps) {
  return (
    <PaymentWrapper cart={draftOrder}>
        <DraftOrderStripeWrapper draftOrder={draftOrder} />
      </PaymentWrapper>
  )
}

// ------------------------
// Wrapper that injects Elements if Stripe is available
// ------------------------
function DraftOrderStripeWrapper ({ draftOrder }: { draftOrder: any }) {
//   const stripeContext = useContext(StripeContext)

    return (
      <Elements stripe={stripePromise!}>
        <StripeForm order={draftOrder} />
  </Elements> 
    )

}

// ------------------------
// Payment form
// ------------------------
function StripeForm({ order }: any) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The order's payment collection (assumes first one)
  const paymentCollection = order.payment_collections?.[0]
  if (!paymentCollection) {
    return <div className="text-red-600">No payment collection found for this order.</div>
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setProcessing(true)
    setError(null)

    if (!stripe || !elements) {
      setError("Stripe not initialized")
      setProcessing(false)
      return
    }

    try {
      // 1. Create a payment session (Stripe) via Medusa store API
      const sessionResponse = await initiatePaymentSession(order, {provider_id: 'pp-stripe-stripe'});
      console.log(sessionResponse, 'SESSION RESP')
    //   if (!sessionResponse.ok) throw new Error("Failed to create payment session")
    //   const { payment_session } = await sessionResponse.json()
      const clientSecret = sessionResponse.data.client_secret

      // 2. Confirm the payment with Stripe Elements
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }


    //  let heads = await getCookieData();

     console.log(paymentCollection, payment_session, 'hees')

      // 3. Authorize the payment session in Medusa
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/payment-collections/${paymentCollection.id}/authorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-publishable-api-key": "pk_788bfa948c71bd7bb00d6f78d3f48e36e5b0b9d2037330e3539b471b22f879a5" },
          body: JSON.stringify({ session_id: payment_session.id }),
        }
      )
      if (!authResponse.ok) throw new Error("Failed to authorize payment")

      // 4. Redirect to success page
      router.push(`/payment/success?order_id=${order.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement
        options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#424770",
              "::placeholder": { color: "#aab7c4" },
            },
          },
        }}
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {processing ? "Processing..." : `Pay ${paymentCollection.amount / 100} ${paymentCollection.currency_code.toUpperCase()}`}
      </button>
              <PaymentButton cart={order} data-testid="submit-order-button" />

    </form>
  )
}