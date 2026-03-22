// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../../modules/ai"


//
// POST /ai/sessions - create a conversation session
//
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const data = req.body as any;

    const session = await aiModule.createSession({
      customer_id: data.customer_id,
      cart_id: data.cart_id,
      language: data.language
    });

    return res.json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error(error, "AI_SESSION_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

//
// GET /ai/sessions/:id/messages - get conversation messages
//
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const aiModule = req.scope.resolve(AI_MODULE) as any;
    const sessionId = req.params.id;

    const session = await aiModule.retrieveConversation(sessionId);
    res.json(session);

  } catch (error: any) {
    console.error(error, "AI_MESSAGES_ERROR");
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}