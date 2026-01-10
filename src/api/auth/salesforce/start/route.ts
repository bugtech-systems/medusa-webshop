import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const isProd = process.env.NODE_ENV === "production" 
  const isSandbox = process.env.SALESFORCE_SANDBOX == "false";


  /* ---------------- PKCE ---------------- */
  const codeVerifier = crypto.randomBytes(32).toString("hex")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

  /* ---------------- Store PKCE ---------------- */
  res.cookie("sf_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: isProd,               // HTTPS only in prod
    sameSite: isProd ? "none" : "lax",
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined, // only in prod
    path: "/",
    maxAge: 10 * 60 * 1000,      // 10 min
  })

  /* ---------------- State ---------------- */
  const state = Buffer.from(
    JSON.stringify({
      redirectTo: `${process.env.STORE_FRONTEND_URL}`,
    })
  ).toString("base64")

  /* ---------------- Salesforce OAuth ---------------- */
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_CALLBACK_URL!,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  // Use sandbox for localhost, production otherwise
  const salesforceBase = isSandbox
    ? "https://login.salesforce.com"
    : "https://test.salesforce.com"

  return res.redirect(`${salesforceBase}/services/oauth2/authorize?${params}`)
}
