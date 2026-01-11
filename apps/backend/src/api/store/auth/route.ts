import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const token = req.cookies?._medusa_jwt
    if (!token) return res.status(401).json({ message: "Not authenticated" })

    const payload: any = jwt.verify(token, process.env.MEDUSA_JWT_SECRET!)
    const customerService = req.scope.resolve("customer")
    const customer = await customerService.retrieveCustomer(payload.actor_id)

    return res.json({
      authenticated: true,
      customer: { id: customer.id, email: customer.email, first_name: customer.first_name, last_name: customer.last_name }
    })
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}
