// app/api/auth/exchange/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { login_token } = await req.json()


  if (!login_token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  // Call Medusa backend to exchange login_token for JWT
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { token } = await res.json()

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: "_medusa_jwt",
    value: token,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}


export async function GET(req: NextRequest) {
  const { login_token } = await req.json()


  if (!login_token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  // Call Medusa backend to exchange login_token for JWT
  const res = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login_token }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const { token } = await res.json()

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: "_medusa_jwt",
    value: token,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
