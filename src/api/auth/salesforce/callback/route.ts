import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { code, state, error } = req.query as Record<string, string>
    let redirectTo = process.env.STORE_FRONTEND_URL || "/"

    if (error) return res.redirect(`${redirectTo}/login?error=${error}`)
    if (!code) return res.status(400).json({ message: "Missing authorization code" })

    if (state) {
      try { redirectTo = JSON.parse(Buffer.from(state, "base64").toString()).redirectTo || redirectTo } catch {}
    }

    const codeVerifier = req.cookies?.sf_code_verifier
    if (!codeVerifier) return res.status(400).json({ message: "Authentication session expired" })

    res.clearCookie("sf_code_verifier", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined
    })

    const salesforceService = req.scope.resolve("Salesforce_Auth") as any
    const customerService = req.scope.resolve("customer")
    const authIdentityService = req.scope.resolve("auth")

    const authResult = await salesforceService.authenticate(code, codeVerifier, customerService, authIdentityService)
    if (!authResult.success) return res.redirect(`${redirectTo}/login?error=auth_failed`)

    const token = jwt.sign(
      { actor_id: authResult.customer.id, actor_type: "customer", auth_identity_id: authResult.authIdentity.id },
      process.env.MEDUSA_JWT_SECRET!,
      { expiresIn: "7d" }
    )

    res.cookie("_medusa_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.redirect(redirectTo)
  } catch {
    return res.redirect(`${process.env.STORE_FRONTEND_URL}/login?error=callback_error`)
  }
}
