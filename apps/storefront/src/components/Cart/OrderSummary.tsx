import { selectTotalPrice } from "@/redux/features/cart-slice";
import { useAppSelector } from "@/redux/store";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import React from "react";
import { useSelector } from "react-redux";
import CartTotals from "../Common/cart-totals";
import { getCheckoutStep } from "@lib/util/get-checkout-step";

const OrderSummary = ({cart}: any) => {
  const checkoutStep = getCheckoutStep(cart)

  const cartItems = cart.items
  const totalPrice = cart.total;

  const checkoutPath = checkoutStep
    ? `/checkout?step=${checkoutStep}`
    : "/checkout"

  // const checkoutButtonLink = customer ? checkoutPath : "/account"




  return (
    <div className="lg:max-w-[455px] w-full">
      {/* <!-- order list box --> */}
      <div className="bg-white shadow-1 rounded-[10px]">
        <div className="border-b border-gray-3 py-5 px-4 sm:px-8.5">
          <h3 className="font-medium text-xl text-dark">Order Summary</h3>
        </div>

        <div className="pt-2.5 pb-8.5 px-4 sm:px-8.5">
          {/* <!-- title --> */}
          <div className="flex items-center justify-between py-5 border-b border-gray-3">
            <div>
              <h4 className="font-medium text-dark">Product</h4>
            </div>
            <div>
              <h4 className="font-medium text-dark text-right">Subtotal</h4>
            </div>
          </div>

          {/* <!-- product item --> */}
          {cartItems.map((item, key) => (
            <div key={key} className="flex items-center justify-between py-5 border-b border-gray-3">
              <div>
                <p className="text-dark">{item.title}</p>
              </div>
              <div>
                <p className="text-dark text-right">
                  ${item.total}
                </p>
              </div>
            </div>
          ))}


          <CartTotals totals={cart}/>
          {/* <!-- total --> */}
          {/* <div className="flex items-center justify-between pt-5">
            <div>
              <p className="font-medium text-lg text-dark">Total</p>
            </div>
            <div>
              <p className="font-medium text-lg text-dark text-right">
                ${totalPrice}
              </p>
            </div>
          </div> */}

          {/* <!-- checkout button --> */}
      <LocalizedClientLink href={checkoutPath} >
          <button
            className="w-full flex justify-center font-medium text-white bg-blue py-3 px-6 rounded-md ease-out duration-200 hover:bg-blue-dark mt-7.5"
          >
            Process to Checkout
          </button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
