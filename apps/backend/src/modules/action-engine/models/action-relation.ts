// src/modules/action-engine/models/action-execution.ts
import { model } from "@medusajs/framework/utils"

export const ActionRelation = model.define("action_relation", {
  id: model.id().primaryKey(),
  label: model.text(),
  action_id: model.text(),
  metadata: model.json().nullable(),
})