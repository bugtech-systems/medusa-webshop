// src/modules/action-engine/models/action-execution.ts
import { model } from "@medusajs/framework/utils"

export const ActionConnection = model.define("action_connection", {
  id: model.id().primaryKey(),
  source: model.text(),
  target: model.text(),
  metadata: model.json().nullable(),
})