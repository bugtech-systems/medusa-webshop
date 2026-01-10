import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const isProduction = process.env.NODE_ENV === "production";

  try {
    const { code, state, error, error_description } = req.query as Record<string, string>

    let redirectTo = process.env.STORE_FRONTEND_URL || "/"

    /* ---------------------- OAuth Error Handling ---------------------- */
    if (error) {
      console.error("Salesforce OAuth error:", error, error_description)

      const errorUrl = new URL(redirectTo)
      errorUrl.searchParams.set("error", "oauth_error")
      errorUrl.searchParams.set("error_code", error)

      return res.redirect(errorUrl.toString())
    }

    if (!code) {
      return res.status(400).json({ message: "Missing authorization code" })
    }

    /* ---------------------- Parse State ---------------------- */
    if (state) {
      try {
        const decoded = JSON.parse(
          Buffer.from(state, "base64").toString("utf8")
        )
        if (decoded?.redirectTo) {
          redirectTo = decoded.redirectTo
        }
      } catch {
        console.warn("Invalid OAuth state payload")
      }
    }

    /* ---------------------- PKCE Verifier ---------------------- */
    const codeVerifier = req.cookies?.sf_code_verifier
    if (!codeVerifier) {
      return res.status(400).json({ message: "Authentication session expired" })
    }

    /* ---------------------- Resolve Services ---------------------- */
    const salesforceService = req.scope.resolve("Salesforce_Auth") as any
    const customerService = req.scope.resolve("customer")
    const authIdentityService = req.scope.resolve("auth")

    if (!salesforceService) {
      throw new Error("Salesforce service not registered")
    }

    /* ---------------------- Authenticate ---------------------- */
    const authResult = await salesforceService.authenticate(
      code,
      codeVerifier,
      customerService,
      authIdentityService
    )

    if (!authResult?.success) {
      const failUrl = new URL(redirectTo)
      failUrl.searchParams.set("error", "auth_failed")
      return res.redirect(failUrl.toString())
    }

    /* ---------------------- JWT Creation ---------------------- */
    const jwtSecret =
      process.env.MEDUSA_JWT_SECRET || process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error("JWT secret not configured")
    }

    const token = jwt.sign(
      {
        actor_id: authResult.customer.id,
        actor_type: "customer",
        auth_identity_id: authResult.authIdentity.id,
      },
      jwtSecret,
      { expiresIn: "7d" }
    )

    /* ---------------------- Cookies ---------------------- */
    res.clearCookie("sf_code_verifier", {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    })

    res.cookie("_medusa_jwt", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })

    /* ---------------------- Redirect Success ---------------------- */
    const successUrl = new URL(redirectTo)
    successUrl.searchParams.set("auth", "success")
    successUrl.searchParams.set("provider", "salesforce")

    return res.redirect(successUrl.toString())

  } catch (err: any) {
    console.error("Salesforce callback error:", err)

    res.clearCookie("sf_code_verifier", { path: "/" })

    const frontend = process.env.STORE_FRONTEND_URL || "/"
    const errorUrl = new URL(frontend)
    errorUrl.searchParams.set("error", "callback_error")

    return res.redirect(errorUrl.toString())
  }
}
