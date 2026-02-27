import { model } from "@medusajs/framework/utils"

export const AiToolExecution = model.define("ai_tool_execution", {
  id: model.id({ prefix: "aitool" }).primaryKey(),

  session_id: model.text(),
  tool_name: model.text(),

  input: model.json(),
  output: model.json()
})
