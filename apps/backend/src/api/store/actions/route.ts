// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../modules/action-engine"

// POST - Create new action template
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    let data = req.body as any;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    // Add audit metadata
  
    
    // Ensure timestamps
    const now = new Date()
    data.created_at = now
    data.updated_at = now

    
    console.log(data, 'DATAAAA')
    

    const template = await actionEngine.createActionTemplates(data)

    return res.json({
      success: true,
      action_template: template,
      message: "Action template created successfully"
    })

  } catch (error: any) {
  console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

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
      actionEngine.listActionTemplates(filters, {
        skip,
        take: parseInt(limit as string),
        order: { created_at: "desc" }
      }),
      actionEngine.listAndCountActionTemplates(filters)
    ])
    
     
     


    return res.json({
      success: true,
      actions: templates,
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

