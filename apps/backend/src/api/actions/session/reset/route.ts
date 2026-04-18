import { ACTION_ENGINE_MODULE } from "@/modules/action-engine";
import { AI_MODULE } from "@/modules/ai";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    try {

        const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
        const aiService = req.scope.resolve(AI_MODULE) as any
        const session_id = actionEngine.generateId('aisess')


        let dbSession = await aiService.createSession({ id: session_id, relation_id: 'start-node', metadata: { model_id: 'alayon' } });
        await actionEngine.setSession(session_id, dbSession)


        return res.json({ ...dbSession, ...dbSession.metadata, session_id })

    } catch (error: any) {
        console.log(error, 'ERROR')
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
}