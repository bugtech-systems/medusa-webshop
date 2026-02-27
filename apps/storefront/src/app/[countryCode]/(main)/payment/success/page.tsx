// app/payment/success/page.tsx
import Link from "next/link"

export default function PaymentSuccess() {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
      <p>Thank you for your order.</p>
      <Link href="/" className="text-blue-600 underline mt-4 inline-block">
        Continue Shopping
      </Link>
    </div>
  )
}