"use server";

import { UpsertAddressDTO } from "@medusajs/types";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sdk } from "../config";
import { retrieveCart } from "../data";
import { DeliveryDTO } from "@/lib/types";
import { getCartId, removeCartId, getAuthHeaders, getCacheTag } from "../data/cookies";

export async function updateCart(data: Record<string, unknown>) {
  const cartId = await (await getCartId());

  if (!cartId) {
    throw new Error("No cart found");
  }

  const response = await sdk.store.cart.update(
    cartId,
    data,
    {},
    {
      ...(await getAuthHeaders()),
    }
  );

  revalidateTag(await getCacheTag("carts"));

  return response;
}

export async function completeCart() {
  const cartId = (await getCartId())

  if (!cartId) {
    throw new Error("No cart found");
  }

  const response = await sdk.store.cart.complete(
    cartId,
    {},
    {
      ...(await getAuthHeaders()),
    }
  );

  revalidateTag(await getCacheTag("carts"));

  return response;
}

export async function addPaymentSession(cartId: string) {
  const cart = await retrieveCart(cartId);

  const res = await sdk.store.payment.initiatePaymentSession(
    cart,
    {provider_id: 'pp_system_default'},
    undefined,
    {
      ...(await getAuthHeaders()),
    }
  );

  return res;
}

export async function prepareCart(cartId: string, customer: any) {
  const { cart } = await sdk.client.fetch<{
    cart: DeliveryDTO;
  }>("/store/checkout/prepare", {
    method: "POST",
    body: { cart_id: cartId, ...customer },
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
  });

  
  
  

  revalidateTag(await getCacheTag("carts"));

  return cart;
}


export async function createDelivery(cartId: string, companyId: string) {
  const { delivery } = await sdk.client.fetch<{
    delivery: DeliveryDTO;
  }>("/store/deliveries", {
    method: "POST",
    body: { cart_id: cartId, company_id: companyId },
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
  });

  revalidateTag(await getCacheTag("deliveries"));

  return delivery;
}

export async function placeOrder(prevState: any, data: FormData) {
  const cartId = (await getCartId())

  if (!cartId) {
    return { message: "No cart found" };
  }
  
  
  let cart = await retrieveCart(cartId);

  const firstName = data.get("first-name")?.toString();
  const lastName = data.get("last-name")?.toString();
  const address = data.get("address")?.toString();
  const city = data.get("city")?.toString();
  const zip = data.get("zip")?.toString();
  const phone = data.get("phone")?.toString();
  const email = data.get("email")?.toString();
  const companyId = data.get("company-id")?.toString();

  if (
    !firstName ||
    !lastName ||
    !address ||
    !city ||
    !zip ||
    !phone ||
    !companyId
  ) {
    return { message: "Please fill in all fields" };
  }

  const shippingAddress: UpsertAddressDTO = {
    first_name: firstName,
    last_name: lastName,
    address_1: address,
    city,
    postal_code: zip,
    phone,
  };

  try {
    const updatedCart = await updateCart({
      shipping_address: shippingAddress,
    });

    if (!updatedCart) {
      return { message: "Error updating cart" };
    }
    
    let cartPrep = await prepareCart(cartId, {email, phone, firstName, lastName, companyId})
    
    
      const headers = {
        ...(await getAuthHeaders()),
      }
    
      const cartsTag = await getCacheTag("carts")
      const ordersTag = await getCacheTag("orders")
      const approvalsTag = await getCacheTag("approvals")
    
    
     
      if(!cart?.payment_collection?.payment_sessions?.length){
        await addPaymentSession(cartId);
      }
        
    
    
    
      await completeCart()
    

    
      const delivery = await createDelivery(cartId, companyId);

    
      revalidateTag(cartsTag)
      revalidateTag(ordersTag)
      revalidateTag(approvalsTag)
    
      await removeCartId()
    
    
    
    
    




    // await setDeliveryId(delivery.id)
  } catch (error) {
    return { message: "Error placing order" };
  }
  redirect("/your-order");
}
