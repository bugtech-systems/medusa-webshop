"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SalesforceAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loginToken = searchParams.get("login_token")
    if (!loginToken) {
      router.replace("/login?error=missing_token")
      return
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login_token: loginToken }),
        })
        
        console.log(res, 'ATUH RES')

        if (!res.ok) throw new Error("Exchange failed")

        // Clean URL
        window.history.replaceState({}, "", "/auth/salesforce")
        router.replace("/account")
      } catch(err) {
      console.log(err, "ERRR")
        router.replace("/login?error=auth_failed")
      }
    }

    exchangeToken()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-2 text-xl font-semibold">Signing you in…</h1>
        <p className="text-gray-600">Please wait while we complete your login.</p>
      </div>
    </div>
  )
}
