// app/payment/[orderId]/page.tsx
import { notFound } from "next/navigation"
import { PaymentForm } from "./payment-form"
import { retrieveOrder } from "@lib/data/orders"

interface PageProps {
  params: { orderId: string }
}



async function getOrder(orderId: string) {
  // Use Medusa's store API to fetch the order
  const response = await retrieveOrder(orderId);
  console.log(response, 'RESPP')
  // if (!response.ok) return null
  // const { order } = await response.json()
  return response 
}

export default async function PaymentPage({ params }: PageProps) {
  const order = await getOrder(params.orderId)

  if (!order) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Complete Your Payment</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <OrderSummary order={order} />
        <PaymentForm order={order} />
      </div>
    </div>
  )
}

function OrderSummary({ order }) {
  return (
    <div className="border-b pb-4 mb-4">
      <p className="text-lg font-semibold">Order #{order.display_id}</p>
      <p>Total: {order.total / 100} {order.currency_code.toUpperCase()}</p>
      {/* List items if needed */}
    </div>
  )
}