// src/api/admin/draft-orders/payment-link.ts
import Stripe from "stripe"
// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// POST - Create new action template
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
const { id } = req.params
  const container = req.scope

  const draftOrderService = container.resolve("order")
  const paymentModuleService = container.resolve("payment")

  try {
    // 1️⃣ Retrieve the draft order with items
    const draftOrder = await draftOrderService.retrieveOrder(id, {
      relations: ["items"],
    })
  const queryEntity = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await queryEntity.graph({
    entity: "order",
    filters: {"id": id},
    fields: [
    // "*",
    "currency_code",
    "payment_collections.*",
    "items.*",
    "item_total",
    "raw_total",
    "items.unit_price",
    "items.quantity",
    "total",
    "subtotal",
    "tax_total",
    "shipping_total",
    "discount_total",
  ],
  }) as any

  let draftOr = orders[0];


    if (!draftOrder) {
      return res.status(404).json({ error: "Draft order not found" })
    }

    // 2️⃣ Create payment collection
    // const paymentCollection = await paymentModuleService.createPaymentCollections({
    //   amount: draftOrder.total,
    //   currency_code: draftOrder.currency_code,
    // })

    // // 3️⃣ Create Stripe payment session
    // const paymentSession = await paymentModuleService.createPaymentSession(paymentCollection.id, {
    //   provider_id: "pp_stripe_stripe",
    //   currency_code: draftOrder.currency_code,
    //   amount: draftOrder.total
    // })


    // 4️⃣ Generate Stripe Checkout Session
    const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: "2023-10-16" })
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: draftOrder.items.map((item) => ({
        price_data: {
          currency: draftOrder.currency_code,
          product_data: { name: item.title },
          unit_amount: item.unit_price * 100,
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.STORE_FRONTEND_URL}/au/order/${draftOrder.id}/confirmed`,
      cancel_url: `${process.env.STORE_FRONTEND_URL}/au/order/${draftOrder.id}/cancelled`,
      metadata: { draft_order_id: draftOrder.id },
    })

  


    // 5️⃣ Return payment link
    return res.status(200).json({ payment_link: session.url, session })
  } catch (err: any) {
    console.error("Error generating draft order payment link:", err)
    return res.status(500).json({ error: err.message || "Internal server error" })
  }
}

