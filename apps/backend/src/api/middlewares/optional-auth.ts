import { NextFunction, Request, Response } from "express"
import { authenticate } from "@medusajs/medusa"
import { MedusaContainer } from "@medusajs/framework/types"

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
      role: string
      type?: string
    }
    isAuthenticated?: boolean
  }
}

export const optionalAuthMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Flag to track if authentication was attempted
    req.isAuthenticated = false
    
    // Check if there are credentials
    const hasAuthHeader = req.headers.authorization?.startsWith('Bearer ')
    const hasSessionCookie = req.headers.cookie?.includes('connect.sid')
    
    if (!hasAuthHeader && !hasSessionCookie) {
      // No credentials, proceed as unauthenticated
      return next()
    }
    
    try {
      // Use Medusa's built-in authenticate middleware
      const authMiddleware = authenticate(['customer', 'user', 'api-key'], ['session', 'bearer'])
      
      // Create a promise to handle the authentication result
      await new Promise<void>((resolve, reject) => {
        authMiddleware(req, res, (err: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
      
      // If we get here, authentication succeeded
      req.isAuthenticated = true
      
      // Additional user enrichment if needed
      if (req.user) {
        await enrichUserData(req.user, req.scope)
      }
      
      next()
    } catch (error) {
      // Authentication failed, but we don't block
      console.debug("Optional authentication failed:", error.message)
      req.isAuthenticated = false
      req.user = undefined
      next()
    }
  }
}

async function enrichUserData(user: any, scope: MedusaContainer) {
  try {
    if (user.role === 'admin' || user.type === 'user') {
      const userService = scope.resolve("user")
      const enrichedUser = await userService.retrieveUser(user.id, {
        select: ["id", "email", "first_name", "last_name", "role", "api_token"]
      })
      
      user.first_name = enrichedUser.first_name
      user.last_name = enrichedUser.last_name
      user.full_name = `${enrichedUser.first_name || ''} ${enrichedUser.last_name || ''}`.trim()
    } else if (user.customer_id || user.type === 'customer') {
      const customerService = scope.resolve("customer")
      const customer = await customerService.retrieveCustomer(user.id, {
        select: ["id", "email", "first_name", "last_name", "phone"]
      })
      
      user.first_name = customer.first_name
      user.last_name = customer.last_name
      user.full_name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      user.phone = customer.phone
    }
  } catch (error) {
    console.debug("Failed to enrich user data:", error)
  }
}