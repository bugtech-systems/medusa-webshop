import React from "react";
import Cart from "@/components/Cart";

import { Metadata } from "next";
import { retrieveCart } from "@lib/data/cart";
import { notFound } from "next/navigation";
import { retrieveCustomer } from "@lib/data/customer";
export const metadata: Metadata = {
  title: "Cart Page | PSA Web shop",
  description: "This is Cart Page for PSA Web shop",
  // other metadata
};

const CartPage = async () => {

  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return (
    <>
      <Cart cart={cart} customer={customer}/>
    </>
  );
};

export default CartPage;
