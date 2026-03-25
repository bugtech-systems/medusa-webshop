// app/pay/draft-order/[id]/page.tsx
import { Metadata } from "next"
import { retrieveDraftOrder } from "../../../../../lib/data/cart"
import { notFound } from "next/navigation"
import  DraftOrderPaymentWrapper  from "../../../../../modules/checkout/draft/page"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"

export const metadata: Metadata = {
  title: "Pay Draft Order",
}

type DraftOrderPaymentPageProps = {
  params: { id: string }
}

export default async function DraftOrderPaymentPage(props: any) {
      const params = await props.params


  const draftOrder = await retrieveDraftOrder(params.id) as any


  if (!draftOrder) {
    return notFound()
  }

  return  <DraftOrderPaymentWrapper draftOrder={draftOrder} />
}

