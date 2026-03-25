// Start execution
// src/modules/action-engine/api/store/execute/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../../modules/action-engine"

// Get execution status
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const {id} = req.params;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const report = await actionEngine.retrieveActionView(id)
    
    return res.json(report)
  } catch (error: any) {
    console.log(error, 'EROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}