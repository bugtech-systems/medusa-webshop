// components/Header.tsx
import { Suspense } from "react"
import Link from "next/link";
import SearchBar from "./searchBar";
import LOGO from './psa-logo.png';
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import { retrieveStore } from "@lib/data/store"



export default async function Header() {

let storeData = await retrieveStore().catch(() => null);

  return (
    <header className="bg-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-6 px-6">
        <div className="flex items-center gap-6">
          <Link href="/">
              <img src="http://localhost:8000/psa-logo.png" alt="Logo" className="h-10" />
              <span className="sr-only">Home</span>
          </Link>
        </div>

        {/* <div className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/cart">Cart</Link>
          <Link href="/account/login">Login</Link>
        </div> */}
          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
      </div>

      <nav className="bg-[#063b66] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <ul className="flex gap-8 uppercase tracking-wide text-sm">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/store">Shop</Link></li>
            <li><Link href="https://shop.psa.org.au/faq">FAQ</Link></li>
          </ul>
          <div className="ml-auto w-80">
            <SearchBar />
          </div>
        </div>
          
      </nav>
    </header>
  );
}
