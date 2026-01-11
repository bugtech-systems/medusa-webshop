import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { code, state, error } = req.query as Record<string, string>

    let redirectTo = process.env.STORE_FRONTEND_URL + "/auth/salesforce" || "/auth/salesforce"

    /* ---------------- OAuth Errors ---------------- */
    if (error) {
      return res.redirect(`${redirectTo}/login?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return res.redirect(`${redirectTo}/login?error=missing_code`)
    }

    /* ---------------- Parse state ---------------- */
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, "base64").toString())
        if (parsed?.redirectTo) redirectTo = parsed.redirectTo
      } catch {
        // ignore malformed state
      }
    }

    /* ---------------- PKCE ---------------- */
    const codeVerifier = req.cookies?.sf_code_verifier
    if (!codeVerifier) {
      return res.redirect(`${redirectTo}/login?error=session_expired`)
    }

    /* Clear PKCE cookie immediately */
    res.clearCookie("sf_code_verifier", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    })

    /* ---------------- Authenticate ---------------- */
    const salesforceService = req.scope.resolve("Salesforce_Auth") as any
    const customerService = req.scope.resolve("customer")
    const authIdentityService = req.scope.resolve("auth")

    const authResult = await salesforceService.authenticate(
      code,
      codeVerifier,
      customerService,
      authIdentityService
    )

    if (!authResult?.success) {
      return res.redirect(`${redirectTo}/login?error=auth_failed`)
    }

    /* ---------------- Create Medusa JWT ---------------- */
    const token = jwt.sign(
      {
        actor_id: authResult.customer.id,
        actor_type: "customer",
        auth_identity_id: authResult.authIdentity.id,
      },
      process.env.MEDUSA_JWT_SECRET!,
      { expiresIn: "7d" }
    )

    /* ---------------- Redirect with token ---------------- */
    const successUrl = new URL(redirectTo)
    successUrl.searchParams.set("token", token)
    successUrl.searchParams.set("provider", "salesforce")

    return res.redirect(successUrl.toString())
  } catch (err) {
    console.error("Salesforce callback error:", err)
    return res.redirect(
      `${process.env.STORE_FRONTEND_URL}/login?error=callback_error`
    )
  }
}
