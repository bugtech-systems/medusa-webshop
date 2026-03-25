// src/app/[countryCode]/pay/draft-order/[id]/page.tsx
"use client"

import { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import PaymentWrapper, { StripeContext } from "@modules/checkout/components/payment-wrapper"
import { CardElement, useStripe, useElements,  Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { addStripePaymentSession, authorizePayment, initiatePaymentSession } from "@lib/data/cart"

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

    //   const orderResponse = await fetch(
    //     `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/payment`,
    //     {
    //       method: "POST",
    //       headers: { "Content-Type": "application/json", "x-publishable-api-key": "pk_8e6d57a354bbb7f4e33b7da82ad573bfebb937b47f8fa975aa15711749bf755d" },
    //       body: JSON.stringify({ order_id: order.id }),
    //     }
    //   )


      // 1. Create a payment session (Stripe) via Medusa store API
      const sessionResponse = await addStripePaymentSession(order.id);
    //   if (!sessionResponse.ok) throw new Error("Failed to create payment session")
    //   const { payment_session } = await sessionResponse.json()

    //   const clientSecret = stripePromise.data.client_secret

         const card = elements?.getElement("card");

    //   // 2. Confirm the payment with Stripe Elements
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(sessionResponse?.data.client_secret,  {
        payment_method: {
          card: card,
          billing_details: {
            name:
              order.billing_address?.first_name +
              " " +
              order.billing_address?.last_name,
            address: {
              city: order.billing_address?.city ?? undefined,
              country: order.billing_address?.country_code ?? undefined,
              line1: order.billing_address?.address_1 ?? undefined,
              line2: order.billing_address?.address_2 ?? undefined,
              postal_code: order.billing_address?.postal_code ?? undefined,
              state: order.billing_address?.province ?? undefined,
            },
            email: order.email,
            phone: order.billing_address?.phone ?? undefined,
          },
        },
      })

    //   if (stripeError) {
    //     throw new Error(stripeError.message)
    //   }


    // //  let heads = await getCookieData();


    //   // 3. Authorize the payment session in Medusa
      const authResponse = await authorizePayment(sessionResponse.payment_collection_id, sessionResponse.id)
    //   if (!authResponse.ok) throw new Error("Failed to authorize payment")
      // 4. Redirect to success page
      router.push(`/payment/success?order_id=${order.id}`)
    } catch (err: any) {
        console.log(err, 'ERRR')
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
        className="w-full bg-blue-600 text-blue py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {processing ? "Processing..." : `Pay ${paymentCollection.amount / 100} ${paymentCollection.currency_code.toUpperCase()}`}
      </button>
    </form>
  )
}