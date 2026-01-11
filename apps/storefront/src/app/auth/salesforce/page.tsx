"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SalesforceAuthPage() {
  const router = useRouter()

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/auth`, { credentials: "include",  headers: {
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!
  } })
        if (!res.ok) throw new Error()
        router.replace("/account")
      } catch { router.replace("/login?error=auth_failed") }
    }
    validate()
  }, [])
  

  return (
     <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-xl font-semibold mb-2">
          Signing you in… 
        </h1>
        <p className="text-gray-600">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  )
}
