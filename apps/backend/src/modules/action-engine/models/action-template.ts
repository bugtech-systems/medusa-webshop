// src/modules/action-engine/models/action-template.ts
import { model } from "@medusajs/framework/utils"

export const ActionTemplate = model.define("action_template", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  status: model.text().nullable(),
  handle: model.text().nullable(),
  type: model.text().default(''), // 'database' | 'api' | 'ai' | 'workflow' | 'script'
  config: model.json().nullable(),
  order_index: model.number().nullable(),
  dependencies: model.json().nullable(), // Array of action IDs this action depends on
  conditions: model.json().nullable(),
  output_template: model.json().nullable(),
  parameters: model.json().nullable(),
  output_as: model.text().nullable(),
  context_template: model.json().nullable(),
  timeout_seconds: model.number().default(30),
  retry_count: model.number().default(0),
  fail_fast: model.boolean().default(true),
  pre_hooks: model.json().nullable(),
  post_hooks: model.json().nullable(),
  success_hooks: model.json().nullable(),
  error_hooks: model.json().nullable(),
  metadata: model.json().nullable(),
  ai_action_templates: model.json().nullable(),
})