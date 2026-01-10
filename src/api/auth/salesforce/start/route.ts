import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const isProd = process.env.NODE_ENV === "production"

  // -------- PKCE ----------
  const codeVerifier = crypto.randomBytes(32).toString("hex")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

  // -------- Store PKCE cookie ----------
  res.cookie("sf_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: isProd,                                 // HTTPS in production
    sameSite: isProd ? "none" : "lax",             // cross-site in prod
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    path: "/",
    maxAge: 10 * 60 * 1000,                        // 10 min
  })

  // -------- State ----------
  const statePayload = {
    redirectTo: `${process.env.STORE_FRONTEND_URL}/auth/salesforce`,
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64")

  // -------- Salesforce endpoint ----------
  const salesforceBase = isProd
    ? "https://login.salesforce.com"
    : "https://test.salesforce.com"

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_CALLBACK_URL!,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  return res.redirect(`${salesforceBase}/services/oauth2/authorize?${params}`)
}
