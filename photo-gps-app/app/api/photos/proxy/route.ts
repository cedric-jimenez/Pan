import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"

export async function GET(request: Request) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
    }

    // Only allow proxying from our R2 public URL
    const allowedOrigin = process.env.R2_PUBLIC_URL
    if (!allowedOrigin || !imageUrl.startsWith(allowedOrigin)) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 403 })
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status },
      )
    }

    const blob = await response.blob()

    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
