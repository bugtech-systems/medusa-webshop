import ProductActions from "@modules/products/components/product-actions";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductActionsWrapper from "@modules/products/templates/product-actions-wrapper";
import React, { Suspense } from "react";
import { HttpTypes } from "@medusajs/types"


type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  customer?: any
}

const ProductActionForm: React.FC<ProductTemplateProps> = ({
  product,
  region,
  customer
}) => {

  return (
    <div className="flex justify-center items-center shadow-1 bg-white rounded-xl px-5 py-5">
        <div className="small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full">
          {/* <ProductOnboardingCta /> */}
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
                customer={customer}
              />
            }
          >
            <ProductActionsWrapper id={product?.id} region={region}/>
          </Suspense>
        </div>
    </div>
  );
};

export default ProductActionForm;
