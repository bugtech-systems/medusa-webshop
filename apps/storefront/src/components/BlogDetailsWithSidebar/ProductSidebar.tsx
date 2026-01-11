// components/ProductSidebar.tsx
import React from "react";
import LatestPosts from "../Blog/LatestPosts";
import LatestProducts from "../Blog/LatestProducts";
import blogData from "../BlogGrid/blogData";
import shopData from "../Shop/shopData";

interface ProductSidebarProps {
  product?: any
  region?: any
  isMobile?: boolean
}

const ProductSidebar: React.FC<ProductSidebarProps> = ({
  product,
  region,
  isMobile = false
}) => {
  return (
    <>
      {/* Recent Posts */}
      {!isMobile && <LatestPosts blogs={blogData} />}

      {/* Latest Products */}
      <LatestProducts products={shopData} />

      {/* Popular Categories */}
      <div className="bg-white rounded-xl shadow-lg mt-7.5">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-dark">
            Popular Categories
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { name: "Desktop", count: 12 },
              { name: "Laptop", count: 25 },
              { name: "Monitor", count: 23 },
              { name: "Phone", count: 54 },
              { name: "Tablet", count: 21 },
              { name: "Watch", count: 17 },
            ].map((category, index) => (
              <a
                key={index}
                href={`/categories/${category.name.toLowerCase()}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-gray-700 group-hover:text-blue-600">
                  {category.name}
                </span>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600">
                  {category.count}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductSidebar;