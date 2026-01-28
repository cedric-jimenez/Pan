import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date parameter (YYYY-MM-DD) is required" },
        { status: 400 }
      )
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)

    const photos = await prisma.photo.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            takenAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          {
            takenAt: null,
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({
      photoIds: photos.map((p) => p.id),
      count: photos.length,
    })
  } catch (error: unknown) {
    logger.error("Fetch photo IDs by day error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      { error: "Failed to fetch photo IDs" },
      { status: 500 }
    )
  }
}
