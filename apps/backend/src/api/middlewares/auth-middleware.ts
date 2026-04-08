import { NextFunction, Request, Response } from "express"
import { MedusaContainer } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/framework/utils"

interface AuthenticatedRequest extends Request {
  user?: any
}

export const authMiddleware = () => {
  return async (
    req: AuthenticatedRequest | any,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get token from header
    //   const authHeader = req.headers.authorization
          const sessionHeader = req.headers.session_id
      const aiService: any = req.scope.resolve(
        "aiModuleService"
      )

            // Get token from header
      // let token = req.headers.authorization?.split(" ")[1]
      // const sessionCookie = req.cookies['connect.sid']
      
      // // Also check for token in cookies (common for admin panels)
      // if (!token && req.cookies?.medusa_admin_token) {
      //   token = req.cookies.medusa_admin_token
      // }

      // if(sessionCookie){
      //           const authService: any = req.scope.resolve("")
      //         authService.
        
      // }

      
      // console.log(req, sessionCookie, 'SESS')

      
      
    //   if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //     return res.status(401).json({
    //       message: "No token provided",
    //     })
    //   }

       

    //   const token = authHeader.split(" ")[1]
      // console.log(token, 'TOKEN')
          const decoded = req.auth_context;

      let user = null;


      if(decoded){
    if(decoded.actor_type == 'customer'){
      // Get customer service from container
      const customerService: any = req.scope.resolve(
        "customer"
      )

      // Get customer from database
      const customer = await customerService.retrieveCustomer(decoded.app_metadata.customer_id, {
        relations: ["groups"],
      })

      if (!customer) {
        return res.status(401).json({
          message: "Invalid token",
        })
          }
        user = customer
     }

   if(decoded.actor_type == 'user'){
      // Get customer service from container
      const userService: any = req.scope.resolve(
        "user"
      )

      // Get customer from database
      const userData = await userService.retrieveUser(decoded.app_metadata.user_id, {
        // relations: [""],
      })

      if (!userData) {
        return res.status(401).json({
          message: "Invalid token",
        })
          }
        user = userData
     }
           req.user = user
           req.session_id = sessionHeader 
      } else {
           req.session_id = sessionHeader;
      }

      


      // Attach user to request
      next()
    } catch (error) {
      console.log(error, 'ERR')
      return res.status(401).json({
        message: "Authentication failed",
        error: error.message,
      })
    }
  }
}