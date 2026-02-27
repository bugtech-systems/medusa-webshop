// Start execution
// src/modules/action-engine/api/store/execute/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"

export async function POST(
  req: MedusaRequest | any,
  res: MedusaResponse
) {
  try {
    const payload = req.body as any
    const templateId = req.params.id
    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: "templateId is required"
      })
    }

    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE)
    
    // Build session from request context
    const session = {
      session_id: req.headers["x-session-id"] || req?.user?.id || `anon_${Date.now()}`,
      user_id: req.user?.id,
      customer_id: req.user?.customer_id,
      context: req.context || {},
      conversation_id: req.headers["x-conversation-id"],
      tenant_id: req.headers["x-tenant-id"] || "default"
    }


      // Execute single action
    let  result = await actionEngine.execute(
        templateId,
        payload,
        session
      )

    return res.json({
      success: true,
      data: result,
      executionId: result.executionId,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: result.duration || 0
      }
    })

  } catch (error: any) {
    console.error("[ActionEngine] API Error:", error)
    
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      code: error.code || "EXECUTION_ERROR"
    })
  }
}

// Get execution status
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const executionId = req.query.executionId
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    const status = await actionEngine.getExecutionStatus(executionId)
    
    return res.json({
      success: true,
      status
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}