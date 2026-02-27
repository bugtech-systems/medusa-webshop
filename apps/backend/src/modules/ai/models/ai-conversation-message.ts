import { model } from "@medusajs/framework/utils"
import { AiConversationSession } from "./ai-conversation-session";


export const AiConversationMessage = model.define(
  "ai_conversation_message",
  {
    id: model.id({ prefix: "aimsg" }).primaryKey(),
    session_id: model.text().nullable(),
    model_id: model.text().nullable(),
    role: model.enum(["system", "user", "assistant", "tool"]),
    content: model.text(),
    metadata: model.json().nullable(),
    ai_conversation_session: model.belongsTo(() => AiConversationSession, {
        mappedBy: "ai_conversation_messages",
      }),
  }
)
