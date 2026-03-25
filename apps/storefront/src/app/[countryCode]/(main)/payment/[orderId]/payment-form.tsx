"use client"

import { useState } from "react"
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"



const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export function PaymentForm({ order }) {
  return (
    <Elements stripe={stripePromise}>
      <StripeForm order={order} />
    </Elements>
  )
}

function StripeForm({ order }) {
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
      const sessionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/payment-collections/${paymentCollection.id}/payment-sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json","x-publishable-api-key": "pk_8e6d57a354bbb7f4e33b7da82ad573bfebb937b47f8fa975aa15711749bf755d" },
          body: JSON.stringify({ provider_id: "pp_stripe_stripe" }),
        }
      )
      if (!sessionResponse.ok) throw new Error("Failed to create payment session")
      const { payment_session } = await sessionResponse.json()
      const clientSecret = payment_session.data.client_secret

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


      // 3. Authorize the payment session in Medusa
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/payment-collections/${paymentCollection.id}/authorize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-publishable-api-key": "pk_8e6d57a354bbb7f4e33b7da82ad573bfebb937b47f8fa975aa15711749bf755d" },
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
    </form>
  )
}