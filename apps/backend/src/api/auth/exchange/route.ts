import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { } from "@medusajs/types"

import jwt from "jsonwebtoken"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { login_token } = req.body as any;

    if (!login_token) {
      return res.status(400).json({ message: "Missing login token" })
    }

    // Resolve Medusa auth service
    const authService = req.scope.resolve("auth");

    // Verify the login token and get customer
   const jwtSecret = process.env.MEDUSA_JWT_SECRET || process.env.JWT_SECRET

    let payload: any

    if (jwtSecret) {
      // Verify token if secret available
      try {
        payload = jwt.verify(login_token, jwtSecret)
      } catch (err: any) {
        return res.status(401).json({ message: "Invalid token", error: err.message })
      }
    } else {
      // Decode without verification
      payload = jwt.decode(login_token)
    }

    // return res.status(200).json({
    //   success: true,
    //   payload,
    // })
    let loginData = payload;

    if (!loginData || !loginData.actor_id) {
      return res.status(401).json({ message: "Invalid or expired login token" })
    }

    const customerService = req.scope.resolve("customer")
    const customer = await customerService.retrieveCustomer(loginData.actor_id)

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    // Generate Medusa JWT
    const token = jwt.sign(
      {
        actor_id: customer.id,
        actor_type: "customer",
        auth_identity_id: loginData.auth_identity_id,
      },
      process.env.MEDUSA_JWT_SECRET!,
      { expiresIn: "7d" }
    )

    return res.status(200).json({ token })
  } catch (err: any) {
    console.error("Auth exchange error:", err)
    return res.status(500).json({ message: "Failed to exchange token" })
  }
}
