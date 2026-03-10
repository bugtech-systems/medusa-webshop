import { asValue } from "@medusajs/framework/awilix"
import { webhookQueue, webhookWorker } from "../queques/webhook-queque"
import WebhookManagerService from "../services/webhook-manager"
import { Modules } from "@medusajs/framework/utils"

/**
 * Loader to register the WebhookManagerService dynamically
 */
export default async function webhookLoader({ container, logger }) {
  // Register the queue as a container value
  container.register({
    queueService: asValue(webhookQueue)
  })

  // Register the Webhook Manager Service
  const webhookManager = new WebhookManagerService({
    container,
    eventBusService: container.resolve(Modules.EVENT_BUS),
    logger,
    queueService: webhookQueue
  })

  container.register({
    webhookManagerService: asValue(webhookManager)
  })

  // Optional: load default webhooks from environment
  const defaults = [
    process.env.ORDER_WEBHOOK_URL && 
    { event: "customer.updated", url: process.env.ORDER_WEBHOOK_URL },
    { event: "order.created", url: process.env.ORDER_WEBHOOK_URL },
     {event: "order.updated", url: process.env.ORDER_WEBHOOK_URL },
     { event: "order.placed", url: process.env.ORDER_WEBHOOK_URL }
  ].filter(Boolean) as any;

  webhookManager.loadDefaults(defaults)

  logger?.info("✅ Webhook manager service registered and default webhooks loaded")
}