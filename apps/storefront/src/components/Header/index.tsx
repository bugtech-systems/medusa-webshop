import { retrieveCart } from "@lib/data/cart"
import AppHeader from "./Header"
import { getCustomer, retrieveCustomer } from "@lib/data/customer"

export default async function Header() {
  const cart = await retrieveCart().catch(() => null)
    const customer = await retrieveCustomer().catch(() => null)

  return <AppHeader cart={cart} customer={customer}/>
}
