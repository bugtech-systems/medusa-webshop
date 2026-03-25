// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../../modules/action-engine"

// POST - Create new action template
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    let data = req.body as any;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    // Add audit metadata
  let updateValid = data.filter((a: any) => String(a.id).includes('action_view'));
  // let createValid = data.filter((a: any) => String(a.id).includes('tab')).map((a) => {
  //   let {id, ...validData} = a;
  //   return {...validData, type: 'tab'};
  // });
    
    // Ensure timestamps
    
    
    
    if(updateValid && updateValid.length){
     await actionEngine.updateActionViews(updateValid)
    } 

    // if(createValid && createValid.length){
    //  await actionEngine.createActionViews(createValid)
    // }

    return res.json({
      success: true,
      message: "Action View template created successfully"
    })

  } catch (error: any) {
  console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}


