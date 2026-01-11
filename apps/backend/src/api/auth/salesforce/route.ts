// modules/store-api/src/api/store/auth/decode-token/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Get token from query, header, or cookie
    const token =
      req.query.token?.toString() ||
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?._medusa_jwt

    if (!token) {
      return res.status(400).json({ message: "JWT token not provided" })
    }

    const jwtSecret = process.env.MEDUSA_JWT_SECRET || process.env.JWT_SECRET

    let payload: any

    if (jwtSecret) {
      // Verify token if secret available
      try {
        payload = jwt.verify(token, jwtSecret)
      } catch (err: any) {
        return res.status(401).json({ message: "Invalid token", error: err.message })
      }
    } else {
      // Decode without verification
      payload = jwt.decode(token)
    }

    return res.status(200).json({
      success: true,
      payload,
    })
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to decode token", error: err.message })
  }
}
