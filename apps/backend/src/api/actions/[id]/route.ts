// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACTION_ENGINE_MODULE } from "../../../modules/action-engine"
// import { parseTemplateData } from "@/utils/helpers";

// POST - Create new action template
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    const data = req.body as any;
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any;

    if (!id) {
      return res.status(401).json({ success: false, error: "Id is required" });
    }

    const oldTemplate = await actionEngine.retrieveActionTemplate(id);
    if (!oldTemplate) {
      return res.status(401).json({ success: false, error: "Template not exist" });
    }

    // Build update payload: only fields that are allowed to change
    const updateData: any = {
      id,                      // identifier (required by batch update)
      ...data,                 // new values from request body
      // updated_at: new Date(),  // manually set updated_at
    };

    // Remove immutable fields if they accidentally came from the request
    // delete updateData.created_at;
    // delete updateData.deleted_at;
    // Also remove any other fields that should never be updated directly
    // e.g., id is kept as identifier but not as a field to update

    // Now call the update method
    // Check the method signature: if it expects a single update object, you may need:
    // const template = await actionEngine.updateActionTemplates(id, updateData);
    // But based on your code, it expects an array of updates.
    
    const template = await actionEngine.updateActionTemplates(updateData);

    return res.json({
      success: true,
      data: template,
      message: "Action template updated successfully"
    });

  } catch (error: any) {
    console.log(error, 'ERROR');
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {

    const templateId = req.params.id;
    
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    
    let template = await actionEngine.listActionTemplates({  $or: [
        {
          id: {
            $eq: templateId,
          },
        },
        {
          handle: {
            $eq: templateId,
          },
        },
      ]});
          


    return res.json({
      success: true,
      data: template[0]
    })

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}



export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {

    const templateId = req.params.id;
    
    const actionEngine = req.scope.resolve(ACTION_ENGINE_MODULE) as any
    
    
    
    let template = await actionEngine.listActionTemplates({  $or: [
        {
          id: {
            $eq: templateId,
          },
        },
        {
          handle: {
            $eq: templateId,
          },
        },
      ]});
    
    
    if(!template[0]){
     return res.status(404).json({
      success: false,
      error: "Template not found!"
    })
    }
    
    await actionEngine.deleteActionTemplates(template[0].id);
     
     


    return res.json({
      success: true,
      message: 'Delete Successfully'
    })

  } catch (error: any) {
    console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}