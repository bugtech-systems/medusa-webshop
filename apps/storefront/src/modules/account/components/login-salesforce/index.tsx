"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { authUser } from "@lib/data/customer"

export default function LoginPage({ setCurrentView }: any) {
  const router = useRouter()
  const searchParams = useSearchParams() // ✅ Next.js 13 App Router way
  const token = searchParams.get("token")
  const [loading, setLoading] = useState(true);

  // Handle redirect with token from Medusa callback
  useEffect(() => {
    if (token) {
      setLoading(true)
      // Store JWT
      localStorage.setItem("medusa_token", token)
      authUser(token)
      // Redirect to home or dashboard
      router.replace("/")
    } else {
      setLoading(false)
    }
  }, [searchParams, router])

  // PKCE + Salesforce login
  const loginWithSalesforce = async (e) => {
  e.preventDefault( )
    // 1️⃣ Generate code_verifier
 /*    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    const code_verifier = Array.from(array, (dec) =>
      ("0" + dec.toString(16)).slice(-2)
    ).join("")

    // 2️⃣ SHA256 → code_challenge
    const encoder = new TextEncoder()
    const data = encoder.encode(code_verifier)
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const base64String = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
    const code_challenge = base64String */

    // 3️⃣ Set code_verifier in cookie (for Medusa callback)
    // document.cookie = `sf_code_verifier=${code_verifier}; path=/; samesite=lax`

    // // 4️⃣ Redirect to Salesforce authorize endpoint
    // const params = new URLSearchParams({
    //   response_type: "code",
    //   client_id: process.env.NEXT_PUBLIC_SF_CLIENT_ID!,
    //   redirect_uri: process.env.NEXT_PUBLIC_SF_REDIRECT_URI!,
    //   scope: "openid email profile",
    //   code_challenge,
    //   code_challenge_method: "S256",
    // })

    // window.location.href = `https://test.salesforce.com/services/oauth2/authorize?${params.toString()}`
    window.location.href =
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/salesforce/start?redirect_to=/account`
  }

  if(loading) return (
   <div className="flex min-h-fit items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-xl font-semibold mb-2">
          Signing you in…
        </h1>
        <p className="text-gray-600">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  );
  
  return (
  <>
      <div className="max-w-sm w-full flex flex-col items-center" data-testid="login-page">
      <h1 className="text-large-semi uppercase mb-6">Welcome back</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Sign in to access an enhanced shopping experience.
      </p>

  
        <form className="w-full" onSubmit={loginWithSalesforce}>
    {/*     <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div> */}

        {/* <ErrorMessage error={message} data-testid="login-error-message" /> */}
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          Sign in
        </SubmitButton>
      </form>
   {/*  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Login to Store</h1>
      <button
        onClick={loginWithSalesforce}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Login with Salesforce
      </button>
    </div> */}
    </div>
  </>
    
  )
}
