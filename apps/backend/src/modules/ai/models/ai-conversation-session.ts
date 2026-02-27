import { model } from "@medusajs/framework/utils"
import { AiConversationMessage } from "./ai-conversation-message";

export const AiConversationSession = model.define(
  "ai_conversation_session",
  {
    id: model.id({ prefix: "aisess" }).primaryKey(),
    customer_id: model.text().nullable(),
    cart_id: model.text().nullable(),
    language: model.text().default("en"),
    metadata: model.json().nullable(),
    context: model.json().nullable(),
    ai_conversation_messages: model.hasMany(() => AiConversationMessage),
    
  }
)
