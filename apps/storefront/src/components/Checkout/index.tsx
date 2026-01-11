import { HttpTypes } from "@medusajs/types"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import Shipping from "./Shipping"
// import Payment from "./payment"
import Review from "./review"
import Billing from "./Billing"
import Payment from "./payment"
// import Payment from "@modules/checkout/components/payment"


export default async function CheckoutPage({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !paymentMethods) {
    return null
  }


console.log(cart, shippingMethods, paymentMethods, 'CART1')



  return (
              <div className="lg:max-w-[670px] w-full">
                {/* <!-- login box --> */}
                {/* <Login /> */}

                {/* <!-- billing details --> */}
                <Billing cart={cart} customer={customer}/>

                {/* <!-- address box two --> */}
                {/* <Shipping /> */}
                <Shipping cart={cart} availableShippingMethods={shippingMethods} />
                
                 <Payment cart={cart} availablePaymentMethods={paymentMethods} />
                <Review cart={cart} />
              </div>

           
  )
}
