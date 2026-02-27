// src/modules/action-engine/models/execution.ts
import { model } from "@medusajs/framework/utils"

export const Execution = model.define("execution", {
  id: model.id().primaryKey(),
  workflow_id: model.text(),
  status: model.text().default("pending"), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: model.dateTime(),
  completed_at: model.dateTime().nullable(),
  duration_ms: model.number().nullable(),
  input_data: model.json().nullable(),
  output_data: model.json().nullable(),
  error_message: model.text().nullable(),
  created_by: model.text().nullable(),
  metadata: model.json(), 
})