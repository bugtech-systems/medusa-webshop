import { isOutputType, model } from "@medusajs/framework/utils"

export const AiMemory = model.define("ai_memory", {
  id: model.id({ prefix: "aimem" }).primaryKey(),

  scope: model.text().nullable(),
  // examples: "product", "faq", "policy"

  scope_id: model.text().nullable(),
  // product_id, faq_id, etc.

  content: model.text().nullable(),

  action: model.text().nullable(),
  // optional: intent/action mapping

  embedding: model.json().nullable() as any,
  // stored as JSON, converted to VECTOR in DB layer

  usage_count: model.number().default(0),
  success_rate: model.number().default(0),

  examples: model.array().default([]),
  negative_examples: model.array().default([]),

  language: model.text().nullable(),

  metadata: model.json().nullable() as any,

})



