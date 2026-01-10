import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { code, state, error } = req.query as Record<string, string>
    let redirectTo = process.env.STORE_FRONTEND_URL || "/"

    if (error) {
      return res.redirect(`${redirectTo}/account?error=${error}`)
    }

    if (!code) {
      return res.status(400).json({ message: "Missing authorization code" })
    }

    // Parse state for redirect
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString())
        redirectTo = stateData.redirectTo || redirectTo
      } catch {}
    }

    // Read PKCE cookie
    const codeVerifier = req.cookies?.sf_code_verifier
    if (!codeVerifier) {
      return res.status(400).json({ message: "Authentication session expired" })
    }

    // Clear PKCE cookie immediately
    res.clearCookie("sf_code_verifier", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
    })

    // Resolve services
    const salesforceService = req.scope.resolve("Salesforce_Auth") as any
    const customerService = req.scope.resolve("customer")
    const authIdentityService = req.scope.resolve("auth")

    const authResult = await salesforceService.authenticate(
      code,
      codeVerifier,
      customerService,
      authIdentityService
    )

    if (!authResult.success) {
      return res.redirect(`${redirectTo}/account?error=auth_failed`)
    }

    // Create JWT
    const jwtSecret = process.env.MEDUSA_JWT_SECRET || process.env.JWT_SECRET
    const token = jwt.sign(
      {
        actor_id: authResult.customer.id,
        actor_type: "customer",
        auth_identity_id: authResult.authIdentity.id,
      },
      jwtSecret!,
      { expiresIn: "7d" }
    )

    // Set session cookie
    res.cookie("_medusa_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // Redirect to storefront
    return res.redirect(redirectTo)
  } catch (err) {
    console.error(err)
    return res.redirect(`${process.env.STORE_FRONTEND_URL}/account?error=callback_error`)
  }
}
