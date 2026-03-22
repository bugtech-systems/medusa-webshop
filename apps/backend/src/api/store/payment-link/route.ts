import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
try {

  let {order_id} = req.body as any;
  const paymentService = req.scope.resolve("payment");
    const orderService = req.scope.resolve("order");
  const queryEntity = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await queryEntity.graph({
    entity: "order",
    filters: {"id": order_id},
    fields: [
    // "*",
    "currency_code",
    "payment_collections.*",
    "items.*",
    "item_total",
    "raw_total",
    "items.subtotal",
    "total",
    "subtotal",
    "tax_total",
    "shipping_total",
    "discount_total",
  ],
  }) as any

    let draftOrder = orders[0];
    console.log(draftOrder, 'ORDER DATA')
      // 2️⃣ Create payment collection
    // const paymentCollection = await paymentService.createPaymentCollections({
    //   amount: draftOrder.total,
    //   currency_code: draftOrder.currency_code,
    // })

    // 3️⃣ Create Stripe payment session
    const paymentSession = await paymentService.createPaymentSession(draftOrder.payment_collections[0].id, {
      provider_id: "pp_stripe_stripe",
      amount: draftOrder.total,
      currency_code: draftOrder.currency_code,
      data: {}
    })
    // let lists = await paymentService.createPaymentSession(payment_id, {provider_id: 'pp-stripe-stripe'});
    // let store = await storeModule.retrieveStore(lists[0].id);
        console.log(draftOrder, paymentSession, 'ORDER SESSION')

  res.status(200).json(paymentSession);
}catch (err){
    console.log(err)
    res.status(500).json({message: 'Something went wrong!'})

}
}
