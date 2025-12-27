import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build query filters
    const where: any = {
      userId: user.id,
    }

    if (startDate || endDate) {
      where.takenAt = {}
      if (startDate) {
        where.takenAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.takenAt.lte = new Date(endDate)
      }
    }

    const photos = await prisma.photo.findMany({
      where,
      orderBy: {
        takenAt: "desc",
      },
    })

    return NextResponse.json({ photos })
  } catch (error: any) {
    console.error("Fetch photos error:", error)

    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    )
  }
}
