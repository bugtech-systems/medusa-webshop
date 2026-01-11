// server component, static-export safe
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function SalesforceAuthPage({ searchParams }: { searchParams: Record<string, string> }) {
  const token = searchParams.login_token

  if (!token) {
    redirect("/account?error=missing_token")
  }

  /* // Exchange token server-side
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token: token }),
  })

  if (!res.ok) redirect("/login?error=auth_failed")

  const { token: jwtToken } = await res.json()

  // Set cookie server-side
  cookies().set({
    name: "_medusa_jwt",
    value: jwtToken,
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  }) */

  redirect(`/api/auth/exchange?login_token=${token}`)
}
