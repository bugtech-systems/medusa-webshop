import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const code = req.query.code as string
    const state = req.query.state as string
    const error = req.query.error as string
    
    // Default redirect
    let redirectTo = process.env.STORE_FRONTEND_URL || "/"

    // Check for OAuth errors
    if (error) {
      console.error("Salesforce OAuth error:", error, req.query.error_description)
      const errorUrl = new URL(redirectTo)
      errorUrl.searchParams.set("error", "oauth_error")
      errorUrl.searchParams.set("error_code", error)
      return res.redirect(errorUrl.toString())
    }

    if (!code) {
      return res.status(400).json({ message: "Missing authorization code" })
    }

    // Parse state for redirect
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString())
        redirectTo = stateData.redirectTo || redirectTo
      } catch (e) {
        console.warn("Failed to parse state:", e)
      }
    }

    // Get code verifier
    const codeVerifier = req.cookies?.sf_code_verifier
    if (!codeVerifier) {
      return res.status(400).json({ message: "Missing authentication session" })
    }

    // Clear PKCE cookie immediately
    res.clearCookie("sf_code_verifier", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    })

    // Use the Salesforce service directly
    const salesforceService = req.scope.resolve("Salesforce_Auth") as any;
        const customerService = req.scope.resolve("customer")
    const authIdentityService = req.scope.resolve("auth")

    
    
    if (!salesforceService) {
      throw new Error("Salesforce service not available")
    }



    // Authenticate
    const authResult = await salesforceService.authenticate(code, codeVerifier, customerService, authIdentityService)

    if (!authResult.success) {
      console.error("Authentication failed:", authResult.error)
      const errorUrl = new URL(redirectTo)
      errorUrl.searchParams.set("error", "auth_failed")
      if (authResult.error) {
        errorUrl.searchParams.set("error_message", encodeURIComponent(authResult.error))
      }
      return res.redirect(errorUrl.toString())
    }

    // Generate session token
    const jwtSecret = process.env.JWT_SECRET || process.env.MEDUSA_JWT_SECRET
    if (!jwtSecret) {
      throw new Error("JWT secret not configured")
    }


    const sessionToken = jwt.sign(
      {
        actor_id: authResult.customer.id,
        auth_identity_id: authResult.authIdentity.id,
        actor_type: "customer",
        app_metadata: {
          customer_id: authResult.customer.id
        }
      },
      jwtSecret,
      { expiresIn: "7d" }
    )

    // Set session cookie
    const isProduction = process.env.NODE_ENV === "production"
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ("none" as const) : ("lax" as const),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    }

    if (isProduction && process.env.COOKIE_DOMAIN) {
      Object.assign(cookieOptions, { domain: process.env.COOKIE_DOMAIN })
    }

    res.cookie("_medusa_jwt", sessionToken, cookieOptions)

    // Redirect with success
    const successUrl = new URL(redirectTo)
    successUrl.searchParams.set("auth", "success")
    successUrl.searchParams.set("provider", "salesforce")
    
    if (authResult.customer) {
      successUrl.searchParams.set("customer_id", authResult.customer.id)
    }

    return res.redirect(successUrl.toString())

  } catch (error: any) {
    console.error("Salesforce callback error:", error)
    
    // Clear cookies on error
    res.clearCookie("sf_code_verifier", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    })

    const frontendUrl = process.env.STORE_FRONTEND_URL || "/"
    const errorUrl = new URL(frontendUrl)
    errorUrl.searchParams.set("error", "callback_error")
    errorUrl.searchParams.set("message", encodeURIComponent(error.message))

    return res.redirect(errorUrl.toString())
  }
}