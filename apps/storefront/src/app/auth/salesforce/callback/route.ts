import { getCacheTag, setAuthToken } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const code = url.searchParams.get("code")

  if (!code) {
    return NextResponse.json({ message: "Missing authorization code" }, { status: 400 })
  }

  // Forward request to Medusa backend callback
  const medusaRes = await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/auth/salesforce/callback?code=${code}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "force-cache",
    }
  )

  if (!medusaRes.ok) {
    const err = await medusaRes.json()
    return NextResponse.json(err, { status: medusaRes.status })
  }

  const data = await medusaRes.json()
  const token = data.token

  console.log(token, 'TOKEENNING')
       setAuthToken(token)
       const customerCacheTag = await getCacheTag("customers")
       revalidateTag(customerCacheTag)
  // Redirect to storefront with token
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_STORE_FRONTEND_URL}/account?token=${token}`)
}
