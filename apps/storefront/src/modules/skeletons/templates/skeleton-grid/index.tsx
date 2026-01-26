"use client";
import React, { useState, useEffect } from "react";

const SkeletonStoreTemplate = () => {
  const [productStyle, setProductStyle] = useState("grid");
  const [stickyMenu, setStickyMenu] = useState(false);

  const handleStickyMenu = () => {
    if (window.scrollY >= 80) {
      setStickyMenu(true);
    } else {
      setStickyMenu(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleStickyMenu);
    return () => {
      window.removeEventListener("scroll", handleStickyMenu);
    };
  }, []);

  return (
    <>
      <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="flex gap-7.5">
          {/* <!-- Skeleton Sidebar Start --> */}
          <div className="hidden xl:block max-w-[270px] w-full">
            <div className="bg-white shadow-1 rounded-lg">
              {/* Category Dropdown Header */}
              <div className="cursor-pointer flex items-center justify-between py-3 pl-5 pr-5.5 shadow-filter">
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
              </div>

              {/* Skeleton Categories */}
              <div className="flex-col gap-3 py-6 pl-5 pr-5.5 flex">
                {/* All Categories Skeleton */}
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                </div>

                {/* Category Items Skeleton */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* <!-- Skeleton Sidebar End --> */}

          {/* <!-- Skeleton Content Start --> */}
          <div className="xl:max-w-[870px] w-full">
            {/* Skeleton Top Bar */}
            <div className="rounded-lg bg-white shadow-1 pl-3 pr-2.5 py-2.5 mb-6">
              <div className="flex items-center justify-end">
                {/* Skeleton View Toggle Buttons */}
                <div className="flex items-center gap-2.5">
                  <div className="w-10.5 h-9 bg-gray-200 rounded-[5px] animate-pulse"></div>
                  <div className="w-10.5 h-9 bg-gray-200 rounded-[5px] animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* <!-- Skeleton Products Grid/List Start --> */}
            <div
              className={
                productStyle === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7.5 gap-y-9"
                  : "flex flex-col gap-7.5"
              }
            >
              {Array.from({ length: productStyle === "grid" ? 6 : 3 }).map((_, index) => (
                <div key={index}>
                  {productStyle === "grid" ? (
                    // Grid View Skeleton
                    <div className="bg-white rounded-lg shadow-1 overflow-hidden">
                      {/* Image Skeleton */}
                      <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                      
                      {/* Content Skeleton */}
                      <div className="p-4">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-200 rounded mb-3 animate-pulse"></div>
                        
                        {/* Price Skeleton */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        
                        {/* Rating Skeleton */}
                        <div className="flex items-center">
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // List View Skeleton
                    <div className="bg-white rounded-lg shadow-1 overflow-hidden flex">
                      {/* Image Skeleton */}
                      <div className="w-48 h-48 bg-gray-200 animate-pulse"></div>
                      
                      {/* Content Skeleton */}
                      <div className="p-6 flex-1">
                        <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-4 animate-pulse"></div>
                        
                        {/* Price Skeleton */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        
                        {/* Rating & Button Skeleton */}
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* <!-- Skeleton Products Grid/List End --> */}

            {/* <!-- Skeleton Pagination Start --> */}
            <div className="mt-10 flex justify-center">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
            {/* <!-- Skeleton Pagination End --> */}
          </div>
          {/* <!-- Skeleton Content End --> */}
        </div>
      </div>
    </>
  );
};

export default SkeletonStoreTemplate;