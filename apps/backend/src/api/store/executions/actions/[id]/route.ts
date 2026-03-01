// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../../modules/action-engine"
import { parseTemplateData, serializeTemplateData } from "../../../../../utils/helpers";

// POST - Create new action template
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const data = req.body as any;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE)
    
    if(!id){
     return res.status(401).json({
      success: false,
      error: "Id is required"
    })
    
    }
    
    let oldTemplate = await actionEngine.retrieveActionTemplate(id);
        if(!oldTemplate){
     return res.status(401).json({
      success: false,
      error: "Template not exist"
    })
    
    }
    
    
    
    // Add audit metadata
    const templateData = {
      id,
      ...data,
    }
    
    // Ensure timestamps
    const now = new Date()
    templateData.updated_at = now

    


    const template = await actionEngine.updateActionTemplates(templateData)
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

    const templateId = req.params.id;
    
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE)
    
    
    
    let template = await actionEngine.retrieveActionTemplate(templateId);
    
    let parsedTemplate = parseTemplateData(template);
     
     


    return res.json({
      success: true,
      data: parsedTemplate
    })

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}