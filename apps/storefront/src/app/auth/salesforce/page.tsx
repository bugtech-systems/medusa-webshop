"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCustomer } from "@lib/data/customer"

export default function SalesforceAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")

    /* ---------------- Missing token ---------------- */
    if (!token) {
      router.replace("/login?error=missing_token")
      return
    }

    /* ---------------- Save Medusa JWT cookie ---------------- */
    document.cookie = `_medusa_jwt=${token}; path=/; secure; samesite=lax`

    /* ---------------- Validate session ---------------- */
    const validate = async () => {
      try {
        const res = await getCustomer();

        // if (!res.ok) throw new Error("Invalid session")
        if(res){
          console.log(res)
        router.replace("/account")
        }
      } catch {
        router.replace("/login?error=auth_failed")
      }
    }

    validate()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-2 text-xl font-semibold">
          Signing you in…
        </h1>
        <p className="text-gray-600">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  )
}
