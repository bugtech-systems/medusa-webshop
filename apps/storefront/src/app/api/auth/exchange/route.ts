import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache";
import { getCacheTag } from "@lib/data/cookies";

export async function GET(req: NextRequest) {
  const login_token = req.nextUrl.searchParams.get("login_token")
  if (!login_token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", req.url))
  }



  // Exchange login_token with Medusa backend
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token }),
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", req.url))
  }

  const { token } = await res.json()

  const response = NextResponse.redirect(new URL("/account", req.url)) // ✅ absolute URL
  response.cookies.set({
    name: "_medusa_jwt",
    value: token,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    sameSite: "lax",
  })

    revalidateTag(await getCacheTag("carts"));



  return response
}
