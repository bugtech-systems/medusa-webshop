// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"
import { AI_MODULE } from "../../../../modules/ai"

import {  refineObjectByFields } from "../../../../utils/helpers";
import { validateActionInput, validateAndRefineParameters } from "../../../../utils/validators";
import AiClassService from "../../../../modules/ai/ai-service";

// POST - Create new action template
export async function POST(
  req: MedusaRequest | any,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const body = req.body as any;
    const actionService = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    const aiService = req.scope.resolve(AI_MODULE) as any
    let actionEngine = new AiClassService({actionService, aiService});


    if(!id){
     return res.status(401).json({
      success: false,
      error: "Id is required"
    })
    
    }
    
    let oldTemps = await actionService.listActionTemplates({  $or: [
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
      ...(body.parameters ? body.parameters : {})
    }
    
    let payload = {} as any;
    let errors = [] as any;
    let context = {} as any;
    // Ensure timestamps
    const now = new Date()
    templateData.updated_at = now

    let validInput =  validateAndRefineParameters({...body, ...body.parameters}, oldTemplate.parameters || []);
    
    if(oldTemplate.parameters && oldTemplate.parameters.length){
      errors = validInput.errors;
     }

if (errors.length > 0) {
  console.log("Validation failed:", errors)
   return res.status(400).json({
      success: false,
      status_code: 400,
      status: 'error',
      error: "Validation failed",
      errors
    })
} 


    if(oldTemplate.parameters){
        payload = validInput.refinedData;
    }
  // console.log("Ready to execute:", payload, oldTemplate.parameters, refineObjectByFields(payload, oldTemplate.parameters || []))
    
    context = { headers: body.headers, ...body.context, timeout: body.timeout};

    

    let sessionId = req.sessionId || payload.session_id || body.sessionId || body.session_id;
   
    let template = await actionEngine.execute(oldTemplate?.id, {...body.parameters, ...payload}, {id: sessionId, context});
    
     
    return res.json({...template, sessionId: req.sessionId})

  } catch (error: any) {
  console.log(error, 'ERROR')
    return res.status(500).json({
      status: 'error',
      status_code: 500,
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
     
    let template = await actionEngine.execute(oldTemplate?.id, {}, { headers: body.headers, ...body.context, timeout: body.timeout});


    return res.json(template)


  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}