import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai/index"
import { 
  CreateAiModelInput, 
  UpdateAiModelInput, 
  FilterableAiModelProps 
} from "../../../modules/ai/types"

// POST - Create new AI model
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const data = req.body as CreateAiModelInput
    const aiModelService = req.scope.resolve(AI_MODULE)
    
    // Validate required fields
    if (!data.name) {
      return res.status(400).json({
        message: "Name is required"
      })
    }

    // if (!data.provider) {
    //   return res.status(400).json({
    //     message: "Provider is required"
    //   })
    // }

    // if (!data.model_type) {
    //   return res.status(400).json({
    //     message: "Model type is required"
    //   })
    // }

    // Create AI model
    const aiModel = await aiModelService.createAiModels(data)

    return res.json({
      ai_model: aiModel
    })

  } catch (error: any) {
    console.error("Error creating AI model:", error)
    return res.status(500).json({
      message: error.message || "Failed to create AI model"
    })
  }
}

// GET - List AI models
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { 
      q, 
      provider,
      model_type,
      status,
      limit = 50,
      offset = 0,
      order = "created_at",
      fields
    } = req.query as any;
    
    const aiModelService = req.scope.resolve(AI_MODULE)
    
    // Build filters
    const filter: any = {}
    
    if (q) {
      filter.$or = [
        { name: { $contains: q } },
        { description: { $contains: q } }
      ]
    }
    
    if (provider) filter.provider = { $eq: provider }
    if (model_type) filter.model_type = { $eq: model_type }
    if (status) filter.status = { $eq: status }
    
    // Build query config
    const config: any = {
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
      order: { [order as string]: "desc" }
    }
    
    if (fields) {
      config.select = (fields as string).split(",")
    }
    
    // Get models with pagination
    const [aiModels, count] = await aiModelService.listAndCountAiModels(
      filter,
      config
    )
    
    return res.json({
      ai_models: aiModels,
      count,
      offset: parseInt(offset as string),
      limit: parseInt(limit as string)
    })

  } catch (error: any) {
    console.error("Error listing AI models:", error)
    return res.status(500).json({
      message: error.message || "Failed to list AI models"
    })
  }
}