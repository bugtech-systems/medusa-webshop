import CartTotals from "@/components/Common/cart-totals"
import { getCustomer } from "@lib/data/customer"
import { checkSpendingLimit } from "@lib/util/check-spending-limit"
import { Container } from "@medusajs/ui"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import Review from "@modules/checkout/components/review"
import Divider from "@modules/common/components/divider"
import { B2BCart } from "types/global"

const CheckoutSummary = async ({ cart }: { cart: B2BCart }) => {
  const customer = await getCustomer()
  const spendLimitExceeded = checkSpendingLimit(cart, customer)

console.log(cart, 'caaar')

  return (
    <Container className="sticky top-2 h-fit w-full flex flex-col small:mt-10">
       <ItemsPreviewTemplate items={cart?.items} /> 
      <Divider className="my-1" />
      <CartTotals totals={cart} />
      <DiscountCode cart={cart} />
      <Review cart={cart} spendLimitExceeded={spendLimitExceeded} />
    </Container>
  )
}

export default CheckoutSummary
