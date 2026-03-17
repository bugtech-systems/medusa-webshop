import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import Stripe from "stripe";
import { Modules } from "@medusajs/framework/utils";

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: "2023-10-16",
});

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const paymentModuleService = req.scope.resolve(Modules.PAYMENT) as any;

  try {
    switch (event.type) {

      /* ----------------------------
       * 1. Payment authorized → CAPTURE
       * ---------------------------- */
      case "payment_intent.amount_capturable_updated": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log("💰 Capturable amount detected:", paymentIntent.id);

        // Capture payment via Medusa
        await paymentModuleService.capturePayment({
          payment_id: paymentIntent.metadata.payment_id,
        }) as any;

        break;
      }

      /* ----------------------------
       * 2. Payment succeeded (fallback)
       * ---------------------------- */
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log("✅ Payment succeeded:", paymentIntent.id);

        // Optional: mark payment captured if needed
        await paymentModuleService.capturePayment({
          payment_id: paymentIntent.metadata.payment_id,
        }) as any;

        break;
      }

      /* ----------------------------
       * 3. Payment failed
       * ---------------------------- */
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        console.log("❌ Payment failed:", paymentIntent.id);

        // Optional: cancel order or mark failed
        await paymentModuleService.cancelPayment({
          payment_id: paymentIntent.metadata.payment_id,
        });

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error: any) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: error.message });
  }
};