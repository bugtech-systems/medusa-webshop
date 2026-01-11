import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {


        const salesforceAuthService = req.scope.resolve("Salesforce_Auth")
    
    // Get where to redirect after successful login
    const redirectTo = req.query.redirect_to?.toString() || "/account"
    
    // Generate the authorization URL
    const { url, codeVerifier, state } = salesforceAuthService.generateAuthorizationUrl(redirectTo)
    
    // SECURITY: Store codeVerifier in session or Redis
    // Option A: Session (simpler)
    req.session.salesforceAuth = { 
      codeVerifier, 
      state,
      redirectTo,
      timestamp: Date.now()
    }
    
    
    
    // Option B: Redis (more scalable)
    // await req.scope.resolve("redisService").set(
    //   `salesforce:${state}`,
    //   JSON.stringify({ codeVerifier, redirectTo }),
    //   { EX: 600 } // 10 minute expiry
    // )
    
    
    console.log(url, codeVerifier, state, redirectTo, 'redirection')
    // Redirect user to Salesforce
    return res.redirect(url)
 
}
