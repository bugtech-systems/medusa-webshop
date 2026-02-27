import { model } from "@medusajs/framework/utils"

export const AiModel = model.define("ai_model", {
  id: model.id({ prefix: "aimodel" }).primaryKey(),
  name: model.text(),
  model_name: model.text(),
  description: model.text().nullable(),
  base_model: model.text().nullable(),
  status: model.text().nullable(), 
  version: model.text().nullable(), 
  handle: model.text().nullable(), 
  provider: model.text().nullable(),
  system: model.text().nullable(),
  metadata: model.json(), 
  config: model.json()
  // temperature, context size, etc.
})
