// src/modules/action-engine/models/action-execution.ts
import { model } from "@medusajs/framework/utils"

export const ActionView = model.define("action_view", {
  id: model.id().primaryKey(),
  label: model.text(),
  description: model.text().nullable(),
  parent_id: model.text().nullable(),
  type: model.text().nullable(),
  handle: model.text().nullable(),
  action_id: model.text().nullable(),
  metadata: model.json().nullable(),
  configuration: model.json().nullable(),
})