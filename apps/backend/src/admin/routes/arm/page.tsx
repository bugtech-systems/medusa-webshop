import Sidebar from "./components/Sidebar"
import ChatInput from "./components/ChatInput"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SidebarProvider } from "../../lib/context/sidebar-context"


import { 
  AiAssistent, 
} from "@medusajs/icons"

export default function Home() {
  return (
  <SidebarProvider >
    <main className="relative min-h-screen flex flex-col items-center justify-center">
      {/* <Sidebar/> */}

      {/* Title */}
      <div className="mb-10 flex items-center gap-2 text-xl font-semibold">
        <span className="text-blue-600">
        <div className="relative h-9 w-9 overflow-hidden rounded-full">
          <img 
            src="/static/alayon.jpg" // 👈 change to your actual path
            alt="Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        </span>
        How can I help you?
      </div>

      {/* Chat Input */}
            <div className="w-full max-w-2xl">

      <ChatInput />
    </div>
    </main>
    </SidebarProvider>
  )
}


export const config = defineRouteConfig({
  label: "ARM",
  icon: AiAssistent,
   
})