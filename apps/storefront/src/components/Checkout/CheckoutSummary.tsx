import { formatPrice } from '@lib/formatters/prices';
import React from 'react'
import Coupon from './Coupon';
import CartTotals from '../Common/cart-totals';

export default function CheckoutSummary({cart}: any) {

    let cartItems = cart?.items;
    let currencyCode = cart?.currency_code
    console.log(cart, 'CART')

  return (
    <>
   <div>
                    <div className="max-w-[455px] w-full">
                {/* <!-- order list box --> */}
   <div className="bg-white shadow-1 rounded-[10px]">
                  <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
                    <h3 className="font-medium text-xl text-dark">
                      Your Order
                    </h3>
                  </div>

                  <div className="pt-2.5 pb-8.5 px-4 sm:px-8.5">
                    {/* <!-- title --> */}
                    <div className="flex items-center justify-between py-5 border-b border-gray-3">
                      <div>
                        <h4 className="font-medium text-dark">Product</h4>
                      </div>
                      <div>
                        <h4 className="font-medium text-dark text-right">
                          Amount
                        </h4>
                      </div>
                    </div>
                    {cartItems.length > 0 &&
                    cartItems.map((item, key) => (
                    <div className="flex items-center justify-between py-5 border-b border-gray-3" key={key}>
                      <div>
                        <p className="text-dark">{item.title}</p>
                      </div>
                      <div>
                        <p className="text-dark text-right">{formatPrice(item.subtotal, currencyCode)}</p>
                      </div>
                    </div>
                    ))}
                    {/* <!-- product item --> */}
                    <div className="flex items-center justify-between border-b-2 border-dark-3"></div>
                    <CartTotals totals={cart}/>
                  </div>
                </div>
                {/* <!-- coupon box --> */}
                <Coupon />

                {/* <!-- shipping box --> */}
                {/* <ShippingMethod /> */}

                {/* <!-- payment box --> */}
                {/* <PaymentMethod /> */}

                {/* <!-- checkout button --> */}
                {/* <button
                  type="submit"
                  className="w-full flex justify-center font-medium text-white bg-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue-dark mt-7.5"
                >
                  Process to Checkout
                </button> */}

              </div>
    </div>
    </>
  )
}
