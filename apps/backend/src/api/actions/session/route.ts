// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai";
import { ACTION_ENGINE_MODULE } from "../../../modules/action-engine"

// POST - Create new action template
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const aiService = req.scope.resolve(AI_MODULE) as any
    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    let session = await aiService.createSession();
    await actionService.setSession(session.id, session);

    return res.json({
      success: true,
      session_id: session.id,
      data: session,
      message: "Session Generated"
    });

  } catch (error: any) {
    console.log(error, 'ERROR');
    return res.status(500).json({ success: false, error: error.message });
  }
}
