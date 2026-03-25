import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_API_KEY as string)

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  const actionService: any = req.scope.resolve("actionEngine");
  const orderService: any = req.scope.resolve(Modules.ORDER)
  const paymentService: any = req.scope.resolve(Modules.PAYMENT)
  const query = req.scope.resolve("query")

  let event: Stripe.Event

  try {
    event = req.body as any // ⚠️ use signature verification in prod
  } catch (err: any) {
    return res.status(400).send(err.message)
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.order_id
        const session_id = paymentIntent.metadata?.session_id

        console.log(paymentIntent, 'EVENT DATAA')
        if (!orderId || !session_id) break

        /**
         * ✅ Fetch order
         */
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "*",
            "payment_collections.*",
            "payment_collections.payment_sessions.*",
          ],
          filters: { id: orderId },
        })

        const order = orders[0]
        if (!order) break

        const paymentCollection = order?.payment_collections?.[0]
        if (!paymentCollection) break

        /**
         * ✅ Create session ONLY for record (no provider actions)
         */
        let session = paymentCollection.payment_sessions?.find(
          (s: any) => s.status == "pending"
        )
        
      
        if (session) {
          let {data: sessionData} = await actionService.stepAction(
            'authorize-payment-session',
            { 
              "id": session_id,
              amount: paymentCollection.amount,
              status: "authorized",
              provider_id: "pp_stripe_stripe",
              payment_collection_id: paymentCollection.id,
              raw_amount: paymentCollection.raw_amount,
              currency_code: paymentCollection.currency_code,
              data: paymentIntent,
            }
          )

          session = sessionData;
          console.log(sessionData, JSON.stringify(paymentCollection), 'NEW SESSION')
           
        }







        

        let authorizedPayment = await paymentService.authorizePaymentSession(
               session_id,
            {
                stripe_payment_intent: paymentIntent.id,
                stripe_payment_method: paymentIntent.payment_method,
                // stripe_payment_intent_status: body.status,
            }
          )



                console.log(session, authorizedPayment, 'OLD SESSION')

        /**
         * ✅ NO AUTHORIZE
         * ✅ NO CAPTURE
         */

        // if (session?.status !== "authorized") {
        //   currentSession = await paymentService.authorizePaymentSession(
        //     session?.id,
        //     {
        //       id: paymentIntent.id,
        //     }
        //   )

        //   logger.info("Session authorized", {
        //     sessionId: currentSession?.id,
        //   })
        // }

        /**
         * ✅ 6. CAPTURE PAYMENT
         */
        // if (session?.status === "authorized") {
        //   await paymentService.capturePayment(currentSession?.id)

        //   logger.info("Payment captured", {
        //     sessionId: currentSession?.id,
        //   })
        // }
        console.log(JSON.stringify(event), 'EVENT')


        /**
         * ✅ Complete payment collection
         */
        // if (paymentCollection.status !== "completed") {
        //   await paymentService.completePaymentCollections(
        //     paymentCollection.id
        //   )

        //   logger.info("Payment collection completed")
        // }

        /**
         * ✅ Complete order
         */
        if (order.status === "draft") {
          // await orderService.completeDraftOrder(orderId)

          logger.info("Order completed", { orderId })
        }

        break
      }
      
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.order_id

        if (!orderId) break

        await orderService.updateOrder(orderId, {
          metadata: {
            payment_failed: true,
            reason:
              paymentIntent.last_payment_error?.message ||
              "unknown",
          },
        })

        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (err: any) {
    logger.error(err)

    return res.status(200).json({
      received: true,
      error: err.message,
    })
  }
}

// export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
//   const logger = req.scope.resolve("logger") as any
//   const params = req.query;
//   const body = req.body as any;
//   const actionService: any = req.scope.resolve("actionEngine");
//   const orderService: any = req.scope.resolve(Modules.ORDER)
//   const paymentService: any = req.scope.resolve(Modules.PAYMENT)
//   const query = req.scope.resolve("query")

//   let event: Stripe.Event
//   let session_id = params?.session_id
//   let payment_id = params?.payment_id
//   let payment_collection_id = params?.paycol_id;
  

//   try {
//     let result;

//         if (session_id && params.type == "authorize") {
//           result = await paymentService.authorizePaymentSession(
//                session_id,
//             {
//                 stripe_payment_intent: body.payment_intent,
//                 stripe_payment_method: body.payment_method,
//                 // stripe_payment_intent_status: body.status,
//             }
//           )
//         }

//         if (session_id && params.type == "create-payment-session") {
//                       // Create payment session
//             result = await paymentService.createPaymentSession(
//               payment_collection_id,
//               {
//                 provider_id: "pp_stripe_stripe",
//                 amount: body.amount_total,
//                 currency_code: body.currency,
//                 data: {
//                   stripe_session_id: body.id,
//                   stripe_payment_intent: body.payment_intent,
//                   stripe_customer_details: body.customer_details,
//                   stripe_payment_method_types: body.payment_method_types,
//                   // event_type: body.type,
//                   order_id: body.orderId,
//                 },
//               }
//             );










//         }

//         /**
//          * ✅ 6. CAPTURE PAYMENT
//          */
//         if (payment_id && params.type == "capture") {

//          result = await paymentService.capturePayment({payment_id})

//           logger.info("Payment captured", {
//             payment_id,
//           })
//         }



//         /**
//          * ✅ Complete payment collection
//          */
//         // if (paymentCollection.status !== "completed") {
//         //   await paymentService.completePaymentCollections(
//         //     paymentCollection.id
//         //   )

//         //   logger.info("Payment collection completed")
//         // }
//     return res.status(200).json({ params, result, received: true })
//   } catch (err: any) {
//     logger.error(err)

//     return res.status(200).json({
//       received: true,
//       error: err.message,
//     })
//   }
// }