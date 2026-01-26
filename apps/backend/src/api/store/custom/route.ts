import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {

  const storeModule = req.scope.resolve("store");
    
    let lists = await storeModule.listStores();
    let store = await storeModule.retrieveStore(lists[0].id);
    
  res.status(200).json(store);
}
