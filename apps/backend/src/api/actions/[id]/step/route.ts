// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"
import { AI_MODULE } from "../../../../modules/ai"
import { languages } from "monaco-editor";
import AiClassService from "../../../../modules/ai/ai-service";


// POST - Create new action template
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const body = req.body as any;
    const {session_id} = req.body as any;
    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let session: any;
    if(!session_id){
        session = await aiService.createSession({language: 'eng'});
    } else {
        session = await aiService.retrieveConversation(session_id);
    }

    if(!session){
        session = await aiService.createSession({language: 'eng'});
    }

      if(session) {
          await actionService.setSession(session.id, session)
      }   


   

    let actionEngine = new AiClassService({actionService, aiService})


    let response = await actionEngine.stepAction(id, body, session)
   console.log(response, 'STEP ROUTE RESPONSE')
    return res.json(response)

  } catch (error: any) {
  console.log(error, 'ERROR')
    return res.status(500).json({
      status: 'error',
      status_code: 500,
      error: error.message
    })
  }
}
