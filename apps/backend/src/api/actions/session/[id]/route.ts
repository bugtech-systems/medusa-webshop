// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { parseTemplateData } from "@/utils/helpers";
import AiClassService from "../../../../modules/ai/ai-service";
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"
import { AI_MODULE } from "../../../../modules/ai"


// POST - Create new action template
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse | any
) {
  try {
    const id = req.params.id;
    const data = req.body as any;

    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let actionEngine = new AiClassService({ actionService, aiService, session_id: id });

    // Remove immutable fields if they accidentally came from the request
    // delete updateData.created_at;
    // delete updateData.deleted_at;
    // Also remove any other fields that should never be updated directly
    // e.g., id is kept as identifier but not as a field to update

    // Now call the update method
    // Check the method signature: if it expects a single update object, you may need:
    // const template = await actionEngine.updateActionTemplates(id, updateData);
    // But based on your code, it expects an array of updates.

    const session = await actionEngine.updateSession({ id, ...data });

    return res.json(session);

  } catch (error: any) {
    console.log(error, 'ERROR');
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {

    const session_id = req.params.id;
    const aiService = req.scope.resolve(AI_MODULE) as any
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any

    let newSession = await actionEngine.getSession(session_id);
    if (!newSession?.id) {
      let session = await aiService.createSession(session_id ? { id: session_id } : {});
      await actionEngine.setSession(session.id, session);
      newSession = session;
    }

    return res.json(newSession)

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}



export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {

    const templateId = req.params.id;

    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let actionEngine = new AiClassService({ actionService, aiService, session_id: templateId });

    await actionEngine.clearSession();

    return res.json({
      success: true,
      message: 'Delete Session Successfully'
    })

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}