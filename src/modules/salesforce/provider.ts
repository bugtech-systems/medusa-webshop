import { AbstractAuthModuleProvider } from '@medusajs/framework/utils';
import { 
  AuthIdentityProviderService,
  AuthenticationInput, 
  AuthenticationResponse 
} from "@medusajs/types"

export class SalesforceAuthProvider {
  static identifier = "salesforce"
  static DISPLAY_NAME = "Salesforce"

  protected container_: any
  protected config_: any

  constructor(container: any, config: any) {
    this.container_ = container
    this.config_ = config
  }

  async authenticate(
    reqData: AuthenticationInput,
    authScope: "store" | "admin"
  ): Promise<AuthenticationResponse> {
    try {
      const { code, code_verifier } = reqData.body || {}

      if (!code) {
        return {
          success: false,
          error: "Authorization code is required",
          authIdentity: null,
          body: null
        }
      }

      // Get the Salesforce auth service
      const salesforceService = this.container_.resolve("salesforce_auth_service")

      // Authenticate the user
      const result = await salesforceService.authenticate(code, code_verifier)

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          authIdentity: null,
          body: null
        }
      }

      return {
        success: true,
        authIdentity: result.authIdentity,
        body: {
          customer: result.customer,
          user: result.user,
          tokens: result.tokens
        }
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Authentication failed",
        authIdentity: null,
        body: null
      }
    }
  }

  async validateCallback(
    reqData: AuthenticationInput,
    authScope: "store" | "admin"
  ): Promise<AuthenticationResponse> {
    return this.authenticate(reqData, authScope)
  }
}