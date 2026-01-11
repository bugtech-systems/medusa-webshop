import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const isProd = process.env.NODE_ENV === "production"

  /* -------- PKCE -------- */
  const codeVerifier = crypto.randomBytes(32).toString("hex")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

  /* -------- Store PKCE in cookie -------- */
  res.cookie("sf_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 10 * 60 * 1000,
  })

  /* -------- State -------- */
  const state = Buffer.from(
    JSON.stringify({
      redirectTo: process.env.STORE_FRONTEND_URL + "/auth/salesforce",
    })
  ).toString("base64")

  /* -------- Salesforce OAuth -------- */
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_CALLBACK_URL!,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  const baseUrl = process.env.SALESFORCE_SANDBOX === "true"
    ? "https://test.salesforce.com"
    : "https://login.salesforce.com"

  return res.redirect(`${baseUrl}/services/oauth2/authorize?${params}`)
}
