"use client"

import { formatPrice } from "@lib/formatters/prices"
import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  return (
    <>
    <div className="flex items-center justify-between py-3 border-b border-gray-3" >

          <span className="text-dark-5 text-sm">Subtotal (excl. shipping and taxes)</span>
          <span 
            className="font-medium" 
            data-testid="cart-subtotal" 
            data-value={item_subtotal || 0}
          >
            {formatPrice(item_subtotal ?? 0, currency_code )}
          </span>
        </div>
        <div className="flex items-center justify-between text-dark pt-2">
          <span className="text-dark-5 text-sm">Shipping</span>
          <span 
            className="font-medium" 
            data-testid="cart-shipping" 
            data-value={shipping_subtotal || 0}
          >
            {formatPrice(shipping_subtotal ?? 0, currency_code)}
          </span>
        </div>
        
        {!!discount_subtotal && (
          <div className="flex items-center justify-between text-dark">
            <span className="text-dark-5 text-sm">Discount</span>
            <span
              className="font-medium text-green-600"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{formatPrice(
                discount_subtotal ?? 0,
                currency_code)}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-dark">
          <span className="text-dark-5 text-sm">Taxes</span>
          <span 
            className="font-medium" 
            data-testid="cart-taxes" 
            data-value={tax_total || 0}
          >
            {formatPrice(tax_total ?? 0, currency_code)}
          </span>
        </div>
      
      <div className="h-px w-full bg-gray-3 mt-2" />
      
      <div className="flex items-center justify-between mt-2">
        <span className="font-medium text-md text-dark">Total</span>
        <span
          className="font-bold text-2xl text-dark"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {formatPrice( total ?? 0, currency_code)}
        </span>
      </div>
      
      {/* <div className="h-px w-full bg-gray-3 mt-6" /> */}
    </>
  )
}

export default CartTotals