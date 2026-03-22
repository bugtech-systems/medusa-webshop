// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai"


//
// POST /ai/chat - send a chat message
//
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const data = req.body as any;

    const result = await aiModule.chat({
      session_id: data.session_id,
      message: data.message,
      language: data.language,
      model_id: data.model_id,
      use_rag: data.use_rag,
      memory_limit: data.memory_limit,
      onToken: data.onToken ? (token: string) => console.log(token) : undefined,
      context: data.context
    });

    return res.json({
      success: true,
      chat: result
    });
  } catch (error: any) {
    console.error(error, "AI_CHAT_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}