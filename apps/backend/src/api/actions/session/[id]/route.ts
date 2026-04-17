// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// import { parseTemplateData } from "@/utils/helpers";
import AiClassService from "../../../../modules/ai/ai-service";
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"
import { AI_MODULE } from "../../../../modules/ai"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse | any
) {
  try {
    const id = req.params.id;
    const fields = req.query.fields;
    const data = req.body as any;

    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let actionEngine = new AiClassService({ actionService, aiService, session_id: id });

    if (!id) {
      return res.status(400).json({ message: 'Something went wrong!' })
    }

    let session = await actionEngine.getSession(id);


    // Remove immutable fields if they accidentally came from the request
    // delete updateData.created_at;
    // delete updateData.deleted_at;
    // Also remove any other fields that should never be updated directly
    // e.g., id is kept as identifier but not as a field to update

    // Now call the update method
    // Check the method signature: if it expects a single update object, you may need:
    // const template = await actionEngine.updateActionTemplates(id, updateData);
    // But based on your code, it expects an array of updates.
    let sessionData = await aiService.retrieveConversation(id);
    if (!sessionData?.id) {
      return res.status(400).json({ message: 'Something went wrong!' })
    }

    let { session_id, ...cleanSession } = sessionData;
    let { relation_id, auth_id, context, metadata, ...cleanData } = data;

    let updatedSession = await aiService.updateAiConversationSessions({ id, session_id, ...cleanSession, context, relation_id, metadata: { ...cleanSession.metadata, ...metadata } });
    await actionService.updateSession(session_id, { session_id, ...cleanSession, context, relation_id, metadata: { ...cleanSession.metadata, ...metadata } });
    return res.json(updatedSession);

  } catch (error: any) {
    console.log(error, 'ERROR');
    return res.status(500).json({ success: false, error: error.message });
  }
}

// POST - Create new action template
export async function POST(
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

    let newSession = await aiService.retrieveConversation(session_id);
    if (!newSession?.id || !session_id) {
      return res.status(404).json({
        message: "Session not found"
      })
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