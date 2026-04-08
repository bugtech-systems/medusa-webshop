// src/api/store/executions/route.ts (Store API)
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// POST - Create new action template
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const id = req.params.id;
    let {widget, data} = req.body as any;
    let resObject;
    if(data?.data){
  data = data?.data?.data ?? data?.data ?? data
}


if(widget?.metadata?.type == 'table'){
  resObject = {config: widget?.configuration, data, type: widget.metadata.type }
} else if(widget?.metadata?.type == 'stat'){
  let count = data.count ?? data.length
 resObject = {config: {...widget?.configuration, value:count}, data, type: widget.metadata.type }
 } else {

  resObject = {config: widget?.configuration, data, type: widget?.metadata?.type }
 }
 
 

    return res.json(resObject)

  } catch (error: any) {
  console.log(error, 'ERROR')
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
