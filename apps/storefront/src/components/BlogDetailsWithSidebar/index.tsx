import React from "react";
import Breadcrumb from "../Common/Breadcrumb";
import SearchForm from "../Blog/SearchForm";
import LatestPosts from "../Blog/LatestPosts";
import LatestProducts from "../Blog/LatestProducts";
import blogData from "../BlogGrid/blogData";
import shopData from "../Shop/shopData"; 
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail";
import { Text } from "@medusajs/ui";
import ProductActionForm from "../Blog/ProductActionForm";
import CategoryDropdown from "../ShopWithSidebar/CategoryDropdown";

type ProductTemplateProps = {
  product?: HttpTypes.StoreProduct | any
  region: HttpTypes.StoreRegion
  countryCode: string
  customer?: any
  categories?: any
}

const ProductDetailsPage: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  customer,
  categories
}) => {



console.log(product, 'product2')

  return (
    <>
      <Breadcrumb
        title={[product?.title]}
        titles={[product?.categories[0]?.name, product?.title]}
        pages={[`/categories/${product?.categories[0]?.handle}`, `/products/${product?.handle}`]}
      />
      
      <section className="overflow-hidden py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="flex flex-col lg:flex-row gap-7.5 xl:gap-12.5">
            
            {/* <!-- Left Column: Product Content --> */}
            <div className="lg:max-w-[750px] w-full">
              {/* <!-- Product Image --> */}
              <div className="rounded-[10px] overflow-hidden mb-7.5">
                <Thumbnail
                  thumbnail={product?.thumbnail}
                  images={product?.images}
                  size="square"
                  width={750}
                  height={477}
                  className="rounded-[10px] w-full h-auto"
                />
              </div>

              {/* <!-- Mobile Product Action Form - Visible on mobile only --> */}
              <div className="block lg:hidden mb-7.5">
                <div className="bg-white shadow-1 rounded-xl p-6">
                  <ProductActionForm
                    product={product}
                    region={region}
                    countryCode={countryCode}
                    customer={customer}
                  />
                </div>
              </div>

              {/* <!-- Product Description --> */}
              <div className="bg-white shadow-1 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-medium text-lg text-dark">
                    Description
                  </h2>
                  {/* <!-- divider --> */}
                  <span className="block w-px h-4 bg-gray-4"></span>
                <span className="text-gray-500 ease-out duration-200">
                    {product?.views ? product?.views : 0} Views
                  </span>
                </div>

                <Text
                  className="text-medium text-ui-fg-subtle whitespace-pre-line"
                  data-testid="product-description"
                >
                  {product?.description}
                </Text>

                {/* <!-- Additional Product Details --> */}
                {/* {product.metadata && Object.keys(product.metadata).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-3">
                    <h3 className="font-medium text-dark mb-4">Additional Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="flex items-center">
                          <span className="text-sm text-gray-600 capitalize mr-2">
                             Sku
                          </span>
                          <span className="text-dark">{String(product.sku)}</span>
                        </div>
                                             <div className="flex items-center">
                          <span className="text-sm text-gray-600 capitalize mr-2">
                             Category
                          </span>
                          <span className="text-dark">{String(product.category)}</span>
                        </div>
                  
                    </div>
                  </div>
                )} */}

                {/* <!-- Product Specifications --> */}
                {product?.variants?.[0]?.options && product?.variants[0].options.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-3">
                    <h3 className="font-medium text-dark mb-4">Specifications</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {product?.variants[0].options.map((option: any) => (
                        <div key={option.id} className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            {option.option?.title || option.option?.value || 'Option'}:
                          </span>
                          <span className="text-dark font-medium">{option.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* <!-- Right Column: Sidebar (Desktop) --> */}
            <div className="lg:max-w-[370px] w-full">
              {/* <!-- Desktop Product Action Form - Hidden on mobile --> */}
              <div className="hidden lg:block mb-7.5">
                <div className="bg-white shadow-1 rounded-xl p-6 sticky top-6">
                  <ProductActionForm
                    product={product}
                    region={region}
                    countryCode={countryCode}
                  />
                </div>
              </div>

              {/* <!-- Recent Posts --> */}
              <LatestPosts  countryCode={countryCode} categoryId={product?.categories[0]?.id} productId={product?.id}/>

              {/* <!-- Latest Products --> */}
              <LatestProducts  countryCode={countryCode} categoryId={product?.categories[0]?.id}/>

              {/* <!-- Popular Categories --> */}
              <div className="shadow-1 bg-white rounded-xl mt-7.5">
              <CategoryDropdown categories={categories} />
              </div>
              {/* <div className="shadow-1 bg-white rounded-xl mt-7.5">
                <div className="px-4 sm:px-6 py-4.5 border-b border-gray-3">
                  <h2 className="font-medium text-lg text-dark">
                    Popular Category
                  </h2>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3">
                    {[
                      { name: "Desktop", count: 12 },
                      { name: "Laptop", count: 25 },
                      { name: "Monitor", count: 23 },
                      { name: "UPS", count: 9 },
                      { name: "Phone", count: 54 },
                      { name: "Tablet", count: 21 },
                      { name: "Watch", count: 17 },
                      { name: "Mouse", count: 8 }
                    ].map((category, index) => (
                      <button
                        key={index}
                        className="group flex items-center justify-between ease-out duration-200 text-dark hover:text-blue"
                      >
                        {category.name}
                        <span className="inline-flex rounded-[30px] bg-gray-2 text-custom-xs px-1.5 ease-out duration-200 group-hover:text-white group-hover:bg-blue">
                          {category.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div> */}

            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductDetailsPage;