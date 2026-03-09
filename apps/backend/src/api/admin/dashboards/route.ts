// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../modules/action-engine"


// GET - List action templates
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { 
      type, 
      search, 
      workflow_id,
      page = 1,
      limit = 50 
    } = req.query
    
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    
    // Build filters
    const filters: any = {}
    if (type) filters.tool_type = { $eq: type }
    if (workflow_id) filters.workflow_id = { $eq: workflow_id }
    if (search) {
      filters.$or = [
        { name: { $contains: search } },
        { description: { $contains: search } }
      ]
    }

    // Apply pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    
    const [templates, total] = await Promise.all([
      actionEngine.listActionViews(filters, {
        skip,
        take: parseInt(limit as string),
        order: { created_at: "desc" }
      }),
      actionEngine.listAndCountActionViews(filters)
    ])
    
     
     


    return res.json({
      success: true,
      views: templates,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: total[1],
        totalPages: Math.ceil(total[1] / parseInt(limit as string))
      }
    })

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

