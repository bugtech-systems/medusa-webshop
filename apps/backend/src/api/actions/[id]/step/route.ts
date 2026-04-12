// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"
import { AI_MODULE } from "../../../../modules/ai"
import { languages } from "monaco-editor";
import AiClassService from "../../../../modules/ai/ai-service";


// POST - Create new action template
export async function POST(
  req: MedusaRequest | any,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const body = req.body as any;
    const { session_id } = req.body as any;
    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let sessionId = req.session_id || session_id;
    let actionEngine = new AiClassService({ actionService, aiService, session_id: sessionId }) as any;

    let session: any;

    session = await actionEngine.getSession();

    let template = await actionService.getActionTemplate(id);
    if (!template) {
      return res.status(200).json({
        success: false,
        status_code: 200,
        error: "Action Not Found!",
        message: "Action not Found!"
      })
    }



    let response = await actionEngine.stepAction(id, { ...body, ...body.parameters }, session)

    return res.json(response?.data ?? response)

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      status: 'error',
      status_code: 500,
      error: error.message
    })
  }
}
