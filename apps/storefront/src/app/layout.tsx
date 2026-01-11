import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { ModalProvider } from "@/lib/context/QuickViewModalContext";
import { CartModalProvider } from "@/lib/context/CartSidebarModalContext";
import { ReduxProvider } from "@/redux/provider";

import { PreviewSliderProvider } from "@/lib/context/PreviewSliderContext";


import "styles/globals.css"
// import "styles/css/euclid-circular-a-font.css";
// import "styles/css/style.css";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {

  return (
    <html lang="en" data-mode="light">
      <body>
               <ReduxProvider>
              <CartModalProvider>
                <ModalProvider>
                  <PreviewSliderProvider>
                    {props.children}
                  </PreviewSliderProvider>
                </ModalProvider>
              </CartModalProvider>
            </ReduxProvider>
      </body>
    </html>
  )
}
