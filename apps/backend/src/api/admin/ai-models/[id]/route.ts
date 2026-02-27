import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "@/modules/ai/index"
import { UpdateAiModelInput } from "@/modules/ai/types"

// GET - Get single AI model by ID
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const { fields } = req.query
    const aiModelService = req.scope.resolve(AI_MODULE)
    
    // Build query config
    const config: any = {}
    if (fields) {
      config.select = (fields as string).split(",")
    }
    
    const aiModel = await aiModelService.retrieveAiModel(id, config)
    
    if (!aiModel) {
      return res.status(404).json({
        message: `AI model with id ${id} not found`
      })
    }
    
    return res.json({
      ai_model: aiModel
    })

  } catch (error: any) {
    console.error("Error retrieving AI model:", error)
    
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        message: error.message
      })
    }
    
    return res.status(500).json({
      message: error.message || "Failed to retrieve AI model"
    })
  }
}

// POST - Update AI model
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const data = req.body as UpdateAiModelInput
    const aiModelService = req.scope.resolve(AI_MODULE)
    
    
    
    console.log(data, 'model data')
    const aiModel = await aiModelService.updateAiModels({id, ...data})
    
    return res.json({
      ai_model: aiModel
    })

  } catch (error: any) {
    console.error("Error updating AI model:", error)
    
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        message: error.message
      })
    }
    
    return res.status(500).json({
      message: error.message || "Failed to update AI model"
    })
  }
}

// DELETE - Delete AI model
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const aiModelService = req.scope.resolve(AI_MODULE)
    
    await aiModelService.delete(id)
    
    return res.status(204).end()

  } catch (error: any) {
    console.error("Error deleting AI model:", error)
    
    if (error.name === "NotFoundError") {
      return res.status(404).json({
        message: error.message
      })
    }
    
    return res.status(500).json({
      message: error.message || "Failed to delete AI model"
    })
  }
}