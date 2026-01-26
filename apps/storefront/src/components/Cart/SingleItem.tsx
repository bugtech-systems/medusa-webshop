import React, { useState } from "react";
import { AppDispatch } from "@/redux/store";
import { useDispatch } from "react-redux";
import {
  removeItemFromCart,
  updateCartItemQuantity,
} from "@/redux/features/cart-slice";

import Image from "next/image";
import Thumbnail from "@modules/products/components/thumbnail";
import { updateLineItem } from "@lib/data/cart";
import ErrorMessage from "@modules/checkout/components/error-message";
import Spinner from "@modules/common/icons/spinner";
import DeleteButton from "../Common/DeleteButton";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

const SingleItem = ({ item }) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dispatch = useDispatch<AppDispatch>();

  const handleRemoveFromCart = () => {
    dispatch(removeItemFromCart(item.id));
  };

  const handleIncreaseQuantity = async () => {
    setUpdating(true)
  let newQuantity = quantity + 1;

    // dispatch(updateCartItemQuantity({ id: item.id, quantity: quantity + 1 }));
    await updateLineItem({
            lineId: item.id,
            quantity: newQuantity,
          })
          .then(() => {
              setQuantity(newQuantity);
          })
            .catch((err) => {
              setError(err.message)
            })
            .finally(() => {
              setUpdating(false)
            })
            
            
  };

  const handleDecreaseQuantity = async () => {
  setUpdating(true)
  let newQuantity = quantity - 1;
    if (quantity > 1) {
      // dispatch(updateCartItemQuantity({ id: item.id, quantity: quantity - 1 }));
          await updateLineItem({
            lineId: item.id,
            quantity: newQuantity,
          })
          .then(() => {
              setQuantity(newQuantity);
          })
            .catch((err) => {
              setError(err.message)
            })
            .finally(() => {
              setUpdating(false)
            })
            
    } else {
      setUpdating(false)
      return;
    }
  };

  return (
    <div className="flex items-center border-t border-gray-3 py-5 px-7.5">
      <div className="min-w-[400px]">
        <div className="flex items-center justify-between gap-5">
          <div className="w-full flex items-center gap-5.5">
            <div className="flex items-center justify-center rounded-[5px] bg-gray-2 max-w-[80px] w-full h-17.5">
               <Thumbnail
            thumbnail={item?.thumbnail}
            images={[item.thumbnail]}
            size="square"
          />
            </div>

            <div>
              <h3 className="text-dark ease-out duration-200 hover:text-blue">
               <LocalizedClientLink href={`/products/${item.product_handle}`} >
                {item.title}
                </LocalizedClientLink>
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-[180px]">
        <p className="text-dark">${item.unit_price}</p>
      </div>

      <div className="min-w-[275px]">
        <div className="w-max flex items-center rounded-md border border-gray-3">
          <button
            onClick={() => handleDecreaseQuantity()}
            aria-label="button for remove product"
            className="flex items-center justify-center w-11.5 h-11.5 ease-out duration-200 hover:text-blue"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.33301 10.0001C3.33301 9.53984 3.7061 9.16675 4.16634 9.16675H15.833C16.2932 9.16675 16.6663 9.53984 16.6663 10.0001C16.6663 10.4603 16.2932 10.8334 15.833 10.8334H4.16634C3.7061 10.8334 3.33301 10.4603 3.33301 10.0001Z"
                fill=""
              />
            </svg>
          </button>
                

          <span className="flex items-center justify-center w-16 h-11.5 border-x border-gray-4">
             {updating ? <Spinner /> :  quantity}
          </span>

          <button
            onClick={() => handleIncreaseQuantity()}
            aria-label="button for add product"
            className="flex items-center justify-center w-11.5 h-11.5 ease-out duration-200 hover:text-blue"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.33301 10C3.33301 9.5398 3.7061 9.16671 4.16634 9.16671H15.833C16.2932 9.16671 16.6663 9.5398 16.6663 10C16.6663 10.4603 16.2932 10.8334 15.833 10.8334H4.16634C3.7061 10.8334 3.33301 10.4603 3.33301 10Z"
                fill=""
              />
              <path
                d="M9.99967 16.6667C9.53944 16.6667 9.16634 16.2936 9.16634 15.8334L9.16634 4.16671C9.16634 3.70647 9.53944 3.33337 9.99967 3.33337C10.4599 3.33337 10.833 3.70647 10.833 4.16671L10.833 15.8334C10.833 16.2936 10.4599 16.6667 9.99967 16.6667Z"
                fill=""
              />
            </svg>
          </button>
        </div>
        <ErrorMessage error={error} data-testid="product-error-message" />

      </div>

      <div className="min-w-[200px]">
        <p className="text-dark">${item.subtotal}</p>
      </div>

      <div className="min-w-[50px] flex justify-end">

                    <DeleteButton id={item.id} data-testid="product-delete-button" />

      </div>
    </div>
  );
};

export default SingleItem;
