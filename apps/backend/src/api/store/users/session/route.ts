import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiService = req.scope.resolve("aiModuleService")

  const { customer_id, cart_id, language } = req.body || {} as any;

  const session = await aiService.createSession({
    customer_id,
    cart_id,
    language: language || "en",
  })

  res.status(201).json(session)
}
