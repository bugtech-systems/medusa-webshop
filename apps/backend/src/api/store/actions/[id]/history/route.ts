// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../../modules/action-engine"
import { parseTemplateData, serializeTemplateData } from "../../../../../utils/helpers";
import { parseActionInput, validateActionInput } from "../../../../../utils/validators";

// POST - Create new action template
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const body = req.body as any;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    if(!id){
     return res.status(401).json({
      success: false,
      error: "Id is required"
    })
    
    }
    
    let oldTemps = await actionEngine.listActionTemplates({  $or: [
        {
          id: {
            $eq: id,
          },
        },
        {
          handle: {
            $eq: id,
          },
        },
      ]});
      
      let oldTemplate = oldTemps[0]
      
      
        if(!oldTemplate){
     return res.status(401).json({
      success: false,
      error: "Template not exist"
    })
    
    }
    
    
    
    // Add audit metadata
    let templateData = {
      id,
      ...body,
      ...(body.parameters ? body.parameters : {})
    }
    
    let payload = {} as any;
    let errors = [] as any;
    // Ensure timestamps
    const now = new Date()
    templateData.updated_at = now

    

    if(oldTemplate.parameters && oldTemplate.parameters.length){
      errors = validateActionInput(oldTemplate.parameters || [], templateData)
    }

if (errors.length > 0) {
  console.log("Validation failed:", errors)
   return res.status(400).json({
      success: false,
      error: "Validation failed",
      errors
    })
} 


    if(oldTemplate.parameters){
     payload  = parseActionInput(oldTemplate.parameters || [], templateData)
    }
  // console.log("Ready to execute:", payload)
    
    
    
    
    
    
    

    const template = await actionEngine.execute(oldTemplate?.id, {...templateData, ...payload});
    return res.json({
      success: true,
      data: parseTemplateData(template),
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

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {

    const id = req.params.id;
    
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    
    let histories = await actionEngine.listExecutions({workflow_id: [id]}, {
      order: {
         created_at: "DESC",
      }
    });
    


    return res.json(histories)

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}