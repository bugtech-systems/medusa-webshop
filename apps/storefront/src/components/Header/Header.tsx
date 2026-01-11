"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CustomSelect from "./CustomSelect";
import { menuData } from "./menuData";
import Dropdown from "./Dropdown";
import { useAppSelector } from "@/redux/store";
import { useSelector } from "react-redux";
import { selectTotalPrice } from "@/redux/features/cart-slice";
import { useCartModalContext } from "@/lib/context/CartSidebarModalContext";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import CartDropdown from "./cart-dropdown";
import { authUser } from "@lib/data/customer";

const Header = ({cart, customer} : any) => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams() // ✅ Next.js 13 App Router way
  const [searchQuery, setSearchQuery] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [stickyMenu, setStickyMenu] = useState(false);


 
 
 
 
  // Sticky menu
  const handleStickyMenu = () => {
    if (window.scrollY >= 80) {
      setStickyMenu(true);
    } else {
      setStickyMenu(false);
    }
  };
  
  const handleSubmit = (e: any) => {
    e.preventDefault()
    router.push(`/products?q=${searchQuery}`)
  }  
    // Function to check if link is active (with nested path support)
  const isActiveLink = (path: any) => {
    if (path === "/") {
      return pathname === "/"
    }
    
    // For exact match
    // return pathname === path
    
    // For nested path matching (e.g., /products matches /products/123)
    return pathname.startsWith(path)
  }

  // Get link classes based on active state
  const getLinkClasses = (path: any) => {
    const baseClasses = `hover:text-blue text-custom-sm font-medium flex relative ${
      stickyMenu ? "xl:py-4" : "xl:py-6"
    }`
    
    const activeClasses = isActiveLink(path)
      ? "text-blue before:absolute before:left-0 before:bottom-0 before:w-full before:h-[3px] before:bg-blue before:rounded-b-[3px]"
      : "text-dark before:absolute before:left-0 before:bottom-0 before:w-0 before:h-[3px] before:bg-blue before:rounded-b-[3px] before:ease-out before:duration-200 hover:before:w-full"
    
    return `${baseClasses} ${activeClasses}`
  }

  useEffect(() => {
    window.addEventListener("scroll", handleStickyMenu);
  });




  return (
    <header
      className={`fixed left-0 top-0 w-full z-9999 bg-white transition-all ease-in-out duration-300 ${
        stickyMenu && "shadow"
      }`}
    >
      <div className="max-w-[1170px] mx-auto px-4 sm:px-7.5 xl:px-0">
        {/* <!-- header top start --> */}
        <div
          className={`flex flex-col lg:flex-row gap-5 items-end lg:items-center xl:justify-between ease-out duration-200 ${
            stickyMenu ? "py-4" : "py-6"
          }`}
        >
          {/* <!-- header top left --> */}
          <div className="xl:w-auto sm:flex-row w-full flex sm:justify-between sm:items-end gap-5 sm:gap-10">
            <Link className="flex-shrink-0 mr-auto" href="/">
              <Image
                src="/images/psa-logo.png"
                alt="Logo"
                width={219}
                height={36}
              />
            </Link>
       {/* <!-- Hamburger Toggle BTN --> */}
              <button
                id="Toggle"
                aria-label="Toggler"
                className="xl:hidden block"
                onClick={() => setNavigationOpen(!navigationOpen)}
              >
                <span className="block relative cursor-pointer w-5.5 h-5.5">
                  <span className="du-block absolute right-0 w-full h-full">
                    <span
                      className={`block relative top-0 left-0 bg-dark rounded-sm w-0 h-0.5 my-1 ease-in-out duration-200 delay-[0] ${
                        !navigationOpen && "!w-full delay-300"
                      }`}
                    ></span>
                    <span
                      className={`block relative top-0 left-0 bg-dark rounded-sm w-0 h-0.5 my-1 ease-in-out duration-200 delay-150 ${
                        !navigationOpen && "!w-full delay-400"
                      }`}
                    ></span>
                    <span
                      className={`block relative top-0 left-0 bg-dark rounded-sm w-0 h-0.5 my-1 ease-in-out duration-200 delay-200 ${
                        !navigationOpen && "!w-full delay-500"
                      }`}
                    ></span>
                  </span>

                  <span className="block absolute right-0 w-full h-full rotate-45">
                    <span
                      className={`block bg-dark rounded-sm ease-in-out duration-200 delay-300 absolute left-2.5 top-0 w-0.5 h-full ${
                        !navigationOpen && "!h-0 delay-[0] "
                      }`}
                    ></span>
                    <span
                      className={`block bg-dark rounded-sm ease-in-out duration-200 delay-400 absolute left-0 top-2.5 w-full h-0.5 ${
                        !navigationOpen && "!h-0 dealy-200"
                      }`}
                    ></span>
                  </span>
                </span>
              </button>
       

          </div>

          {/* <!-- header top right --> */}
          <div className="flex w-full lg:w-auto items-center gap-7.5">


            {/* <!-- divider --> */}
            <span className="hidden xl:block w-px h-7.5 bg-gray-4"></span>

            <div className="flex w-full lg:w-auto justify-between items-center gap-5">
              <div className="flex items-center gap-5">
                <Link href="/account" className="flex items-center gap-2.5">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 1.25C9.37666 1.25 7.25001 3.37665 7.25001 6C7.25001 8.62335 9.37666 10.75 12 10.75C14.6234 10.75 16.75 8.62335 16.75 6C16.75 3.37665 14.6234 1.25 12 1.25ZM8.75001 6C8.75001 4.20507 10.2051 2.75 12 2.75C13.7949 2.75 15.25 4.20507 15.25 6C15.25 7.79493 13.7949 9.25 12 9.25C10.2051 9.25 8.75001 7.79493 8.75001 6Z"
                      fill="#003d79"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 12.25C9.68646 12.25 7.55494 12.7759 5.97546 13.6643C4.4195 14.5396 3.25001 15.8661 3.25001 17.5L3.24995 17.602C3.24882 18.7638 3.2474 20.222 4.52642 21.2635C5.15589 21.7761 6.03649 22.1406 7.22622 22.3815C8.41927 22.6229 9.97424 22.75 12 22.75C14.0258 22.75 15.5808 22.6229 16.7738 22.3815C17.9635 22.1406 18.8441 21.7761 19.4736 21.2635C20.7526 20.222 20.7512 18.7638 20.7501 17.602L20.75 17.5C20.75 15.8661 19.5805 14.5396 18.0246 13.6643C16.4451 12.7759 14.3136 12.25 12 12.25ZM4.75001 17.5C4.75001 16.6487 5.37139 15.7251 6.71085 14.9717C8.02681 14.2315 9.89529 13.75 12 13.75C14.1047 13.75 15.9732 14.2315 17.2892 14.9717C18.6286 15.7251 19.25 16.6487 19.25 17.5C19.25 18.8078 19.2097 19.544 18.5264 20.1004C18.1559 20.4022 17.5365 20.6967 16.4762 20.9113C15.4193 21.1252 13.9742 21.25 12 21.25C10.0258 21.25 8.58075 21.1252 7.5238 20.9113C6.46354 20.6967 5.84413 20.4022 5.4736 20.1004C4.79033 19.544 4.75001 18.8078 4.75001 17.5Z"
                      fill="#003d79"
                    />
                  </svg>

                  <div>
                    <span className="block text-2xs text-dark-4 uppercase">
                      account
                    </span>
                    
                    <p className="font-medium text-custom-sm text-dark">
                        {customer ? customer.first_name + ' ' + customer.last_name : "Sign in"}
                    </p>
                  </div>
                </Link>

               <CartDropdown cart={cart}/>
              </div>

              {/* //   <!-- Hamburger Toggle BTN --> */}
            </div>
          </div>
        </div>
        {/* <!-- header top end --> */}
      </div>

     <div className="border-t border-gray-3">
      <div className="max-w-[1170px] mx-auto px-4 sm:px-7.5 xl:px-0">
        <div className="flex items-center justify-between">
          {/* <!--=== Main Nav Start ===--> */}
          <div
            className={`w-[288px] absolute right-4 top-full xl:static xl:w-auto h-0 xl:h-auto invisible xl:visible xl:flex items-center justify-between ${
              navigationOpen &&
              `!visible bg-white shadow-lg border border-gray-3 !h-auto max-h-[400px] overflow-y-scroll rounded-md p-5`
            }`}
          >
            {/* <!-- Main Nav Start --> */}
            <nav>
              <ul className="flex xl:items-center flex-col xl:flex-row gap-5 xl:gap-6">
                {menuData.map((menuItem, i) =>
                  menuItem.submenu ? (
                    <Dropdown
                      key={i}
                      menuItem={menuItem}
                      stickyMenu={stickyMenu}
                      isActive={isActiveLink(menuItem.path)}
                    />
                  ) : (
                    <li
                      key={i}
                      className="group relative"
                    >
                      <Link
                        href={menuItem.path}
                        className={getLinkClasses(menuItem.path)}
                      >
                        {menuItem.title}
                        {/* Optional: Add active indicator dot */}
                        {isActiveLink(menuItem.path) && (
                          <span className="sr-only">(current)</span>
                        )}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </nav>
            {/* <!-- Main Nav End --> */}
          </div>
          {/* <!--=== Main Nav End ===--> */}

          {/* <!--=== Nav Right Start ===--> */}
          <div className="hidden xl:block max-w-[475px] w-full">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-end items-center gap-5.5">
                {/* <CustomSelect options={options} /> */}
                <div className="relative max-w-[333px] sm:min-w-[333px] w-full">
                  {/* <!-- divider --> */}
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 inline-block w-px h-5.5 bg-gray-4"></span>
                  <input
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                    type="search"
                    name="search"
                    id="search"
                    placeholder="I am shopping for..."
                    autoComplete="off"
                    className="custom-search w-full rounded-r-[5px] bg-gray-1 !border-l-0 border border-gray-3 py-2.5 pl-4 pr-10 outline-none ease-in duration-200 focus:border-blue focus:bg-white"
                  />

                  <button
                    type="button"
                    id="search-btn"
                    aria-label="Search"
                    className="flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 ease-in duration-200 hover:text-blue"
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17.2687 15.6656L12.6281 11.8969C14.5406 9.28123 14.3437 5.5406 11.9531 3.1781C10.6875 1.91248 8.99995 1.20935 7.19995 1.20935C5.39995 1.20935 3.71245 1.91248 2.44683 3.1781C-0.168799 5.79373 -0.168799 10.0687 2.44683 12.6844C3.71245 13.95 5.39995 14.6531 7.19995 14.6531C8.91558 14.6531 10.5187 14.0062 11.7843 12.8531L16.4812 16.65C16.5937 16.7344 16.7343 16.7906 16.875 16.7906C17.0718 16.7906 17.2406 16.7062 17.3531 16.5656C17.5781 16.2844 17.55 15.8906 17.2687 15.6656ZM7.19995 13.3875C5.73745 13.3875 4.38745 12.825 3.34683 11.7844C1.20933 9.64685 1.20933 6.18748 3.34683 4.0781C4.38745 3.03748 5.73745 2.47498 7.19995 2.47498C8.66245 2.47498 10.0125 3.03748 11.0531 4.0781C13.1906 6.2156 13.1906 9.67498 11.0531 11.7844C10.0406 12.825 8.66245 13.3875 7.19995 13.3875Z"
                        fill=""
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
          {/* <!--=== Nav Right End ===--> */}
        </div>
      </div>
    </div>
    </header>
  );
};

export default Header;
