import React from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import Image from "next/image";
import DeleteButton from "@modules/common/components/delete-button";
import Thumbnail from "@modules/products/components/thumbnail";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { useCartModalContext } from "@lib/context/CartSidebarModalContext";

const SingleItem = ({ item }) => {
  const {  closeCartModal } = useCartModalContext();

  

  return (
    <div className="flex items-center justify-between gap-5">
      <div className="w-full flex items-center gap-6">
        <div className="flex items-center justify-center rounded-[10px] bg-gray-3 max-w-[90px] w-full h-22.5">
          {/* <Image src={item.imgs?.thumbnails[0]} alt="product" width={100} height={100} /> */}
          <Thumbnail
            thumbnail={item?.thumbnail}
            images={item?.images}
            size="square"
          />
          </div>

        <div>
          <h3 className="font-medium text-dark mb-1 ease-out duration-200 hover:text-blue">
               <LocalizedClientLink href={`/products/${item.product_handle}`} onClick={() => closeCartModal()} >
               {item.title}
               </LocalizedClientLink>
          </h3>
          <p className="text-custom-sm">Price: ${item.unit_price}</p>
          <p className="text-custom-sm">Qty: {item.quantity}</p>
        </div>
      </div>
            <DeleteButton id={item.id} data-testid="product-delete-button" />
    </div>
  );
};

export default SingleItem;
