import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { Modules } from "@medusajs/utils"
import type { CartDTO, CustomerDTO } from "@medusajs/types"

/* ---------------------------------
   Request body type
----------------------------------*/
type CheckoutPrepareBody = {
  cart_id: string
  email?: string
  first_name?: string
  last_name?: string
  company_id?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CheckoutPrepareBody> | any,
  res: MedusaResponse
) => {
  const { cart_id, email, first_name, last_name } = req.body

  if (!cart_id) {
    return res.status(400).json({
      message: "cart_id is required",
    })
  }

  /* ---------------------------------
     Resolve typed services
  ----------------------------------*/
  const cartService = req.scope.resolve(Modules.CART)
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const isAuthenticated = Boolean(req.auth_context?.actor_id)

  let customer: CustomerDTO | null | any = null 

  /* ---------------------------------
     LOGGED-IN USER
  ----------------------------------*/
  if (isAuthenticated) {
    customer = await customerService.retrieveCustomer(
      req.auth_context!.actor_id
    )

    // Optional safety check
    if (email && customer.email !== email) {
      return res.status(400).json({
        message: "Email does not match logged-in customer",
      })
    }
  }

  /* ---------------------------------
     GUEST USER
  ----------------------------------*/
  if (!customer) {
    if (!email) {
      return res.status(400).json({
        message: "Email is required for guest checkout",
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existingCustomers = await customerService.listCustomers(
      { email: normalizedEmail },
      { take: 1 }
    )

    customer = existingCustomers[0] ?? null

    if (!customer) {
      customer = await customerService.createCustomers({
        email: normalizedEmail,
        first_name,
        last_name,
      })
    }
  }

  /* ---------------------------------
     CART SAFETY CHECK
  ----------------------------------*/
  const cart: CartDTO = await cartService.retrieveCart(cart_id)

  if (
    cart.customer_id &&
    cart.customer_id !== customer.id
  ) {
    return res.status(409).json({
      message: "Cart already belongs to another customer",
    })
  }

  /* ---------------------------------
     ASSIGN CUSTOMER TO CART
  ----------------------------------*/
  await cartService.updateCarts(cart_id, {
    customer_id: customer.id,
    email: customer.email,
  })

  /* ---------------------------------
     OPTIONAL: ATTACH COMPANY (B2B)
  ----------------------------------*/
  if (req.auth_context?.company_id) {
    await cartService.updateCarts(cart_id, {
      metadata: {
        ...(cart.metadata ?? {}),
        company_id: req.auth_context.company_id,
      },
    })
  }

  const updatedCart = await cartService.retrieveCart(cart_id)

  return res.status(200).json({
    cart: updatedCart,
    checkout_mode: isAuthenticated ? "logged-in" : "guest",
  })
}
