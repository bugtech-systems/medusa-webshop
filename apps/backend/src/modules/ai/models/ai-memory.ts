import { model } from "@medusajs/framework/utils"

export const AiMemory = model.define("ai_memory", {
  id: model.id({ prefix: "aimem" }).primaryKey(),

  scope: model.text(), 
  // examples: "product", "faq", "policy"

  scope_id: model.text(), 
  // product_id, faq_id, etc.

  content: model.text(),

  // pgvector-compatible embedding
  // stored as JSON → mapped to VECTOR in Postgres
  embedding: model.json() as any,

  language: model.text().nullable(),
})
