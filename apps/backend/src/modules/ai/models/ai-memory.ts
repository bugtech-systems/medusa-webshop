import { model } from "@medusajs/framework/utils"

export const AiMemory = model.define("ai_memory", {
  id: model.id({ prefix: "aimem" }).primaryKey(),

  scope: model.text().nullable(), 
  // examples: "product", "faq", "policy"

  scope_id: model.text().nullable(), 
  // product_id, faq_id, etc.

  content: model.text().nullable(),

  // pgvector-compatible embedding
  // stored as JSON → mapped to VECTOR in Postgres
  embedding: model.json().nullable() as any,

  language: model.text().nullable(),
  metadata: model.json().nullable() as any,

})
