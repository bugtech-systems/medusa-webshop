import { MedusaError } from "@medusajs/framework/utils"

import {
  createCustomersWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"
import axios from "axios"
import crypto from "crypto"
import { URLSearchParams } from "url"

export default class SalesforceAuthService {
  static identifier = "salesforce_service"

  private readonly container_: any
  private readonly config_: any

  constructor(container: any, config: any) {
    this.container_ = container
    this.config_ = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      callbackUrl: config.callbackUrl,
      loginUrl: config.sandbox
        ? "https://test.salesforce.com"
        : "https://login.salesforce.com",
      scopes: config.scopes ?? ["openid", "profile", "email"],
    }
  }

  async authenticate(
    code: string,
    codeVerifier: string | undefined,
    customerService: any,
    authService: any
  ) {
    /** 1️⃣ Exchange OAuth code for tokens */
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier)

    /** 2️⃣ Fetch Salesforce user profile */
    const user = await this.getUserProfile(tokens.access_token)

    if (!user.email || !user.email_verified) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Salesforce email is not verified"
      )
    }


    /** 3️⃣ Find or create customer */
    const [existingCustomer] = await customerService.listCustomers({ email: user.email })
    let customer = existingCustomer

    if (!customer) {
      const { result } = await createCustomersWorkflow(this.container_).run({
        input: {
          customersData: [
            {
              email: user.email,
              first_name: user.given_name ?? "",
              last_name: user.family_name ?? "",
              has_account: true,
              metadata: {
                salesforce_user_id: user.user_id,
                salesforce_username: user.username,
                salesforce_org_id: user.organization_id,
                salesforce_created_at: new Date().toISOString(),
              },
            },
          ],
        },
      })
      customer = result[0]
    } else {
      await updateCustomersWorkflow(this.container_).run({
        input: {
          selector: { id: [customer.id] },
          update: {
            metadata: {
              ...(customer.metadata ?? {}),
              salesforce_user_id: user.user_id,
              salesforce_username: user.username,
              salesforce_last_login: new Date().toISOString(),
            },
          },
        },
      })
    }

    /** 4️⃣ Find or create AuthIdentity */
    const [existingIdentity] = await authService.listAuthIdentities({
      provider_identities: { provider: "salesforce", entity_id: user.user_id },
    })
    let authIdentity = existingIdentity

console.log(authIdentity, 'auth identity')

    if (!authIdentity) {
const [createdIdentity] = await authService.createAuthIdentities([
  {
    provider_identities: [{
      provider: "salesforce",
      entity_id: user.user_id, // ✅ must not be undefined
      provider_metadata: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        instance_url: tokens.instance_url,
        issued_at: tokens.issued_at,
        profile: {
          email: user.email,
          name: user.name,
          username: user.username,
          organization_id: user.organization_id,
        },
      },
    }],
    app_metadata: {
      user_id: customer.id,
      integration: "salesforce",
      first_login: new Date().toISOString(),
    },
  },
])

      authIdentity = createdIdentity
    } else {
      // Update provider metadata and link customer if not linked
      const updatePayload: any = {
        id: authIdentity.id,
        provider_identities: [{
          provider: "salesforce",
          entity_id: user.user_id, // ✅ must not be undefined
          // ...authIdentity.provider_identities,
          provider_metadata: {
            // ...authIdentity.provider_identities?.provider_metadata,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            instance_url: tokens.instance_url,
            issued_at: tokens.issued_at,
          },
        }],
        app_metadata: {
          user_id: customer.id,
          ...(authIdentity.app_metadata ?? {}),
          last_login: new Date().toISOString(),
        },
      }

      if (!authIdentity?.app_metadata?.user_id) {
        updatePayload.app_metadata.user_id = customer.id
      }

      // await authService.updateAuthIdentities([updatePayload])
    }

    /** 5️⃣ Return results */
    return {
      success: true,
      customer,
      authIdentity,
      user,
      tokens,
    }
  }

  /* -------------------------- OAuth Helpers -------------------------- */

  async exchangeCodeForTokens(code: string, codeVerifier?: string) {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config_.clientId,
      client_secret: this.config_.clientSecret,
      redirect_uri: this.config_.callbackUrl,
    })
    if (codeVerifier) params.append("code_verifier", codeVerifier)

    const { data } = await axios.post(
      `${this.config_.loginUrl}/services/oauth2/token`,
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data
  }

  async getUserProfile(accessToken: string) {
    const { data } = await axios.get(
      `${this.config_.loginUrl}/services/oauth2/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    return data
  }

  generateAuthorizationUrl(redirectTo = "/") {
const codeVerifier = crypto.randomBytes(32).toString("hex")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

    const state = Buffer.from(JSON.stringify({ redirectTo, ts: Date.now() })).toString("base64")

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config_.clientId,
      redirect_uri: this.config_.callbackUrl,
      scope: "openid profile email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    return {
      url: `${this.config_.loginUrl}/services/oauth2/authorize?${params}`,
      codeVerifier,
      state,
    }
  }
}
