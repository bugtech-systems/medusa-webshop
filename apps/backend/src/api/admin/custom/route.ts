import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const regionModule = req.scope.resolve("region")
      
      
  let region = await regionModule.listRegions();


  console.log('TRIGGERED', region)

  res.status(200).json({data: region[0]});
}
