import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import fetch from "node-fetch"

export default async function multiEventHandler({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");

  switch (name) {
    case "order.placed":
      logger.info(`Processing order placed: ${JSON.stringify(data)}`)
  const orderRes = await fetch(`${process.env.MEDUSA_BACKEND_URL}/actions/push-order-to-n8n-workflow/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.WEBHOOK_SECRET
      },
      body: JSON.stringify({parameters: data})
    })



    if (!orderRes.ok) throw new Error(`Webhook failed with status ${orderRes.status}`)
      logger.info(`Processing order placed response: ${JSON.stringify(orderRes)}`)
    
      // handle order placed logic
      break
    case "order.canceled":
      logger.info(`Processing order canceled: ${JSON.stringify(data)}`)
  const res = await fetch(`${process.env.MEDUSA_BACKEND_URL}/actions/push-order-to-n8n-workflow/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.WEBHOOK_SECRET
      },
      body: JSON.stringify({parameters: data})
    })



    if (!res.ok) throw new Error(`Webhook failed with status ${res.status}`)
      logger.info(`Processing order placed response: ${JSON.stringify(res)}`)
    


      // handle order canceled logic
      break
    case "customer.created":
      logger.info(`Processing customer created: ${JSON.stringify(data)}`)
      // handle customer created logic
      break
    case "customer.updated":
      logger.info(`Processing customer updated: ${JSON.stringify(data)}`)

      // handle customer created logic
      break
    default:
      logger.warn(`Unhandled event: ${name}`)
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.canceled", "customer.created", "customer.updated"], // array of events
}