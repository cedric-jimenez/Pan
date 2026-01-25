import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    // Build query filters (same as photos route)
    type WhereClause = {
      userId: string
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" }
        originalName?: { contains: string; mode: "insensitive" }
        description?: { contains: string; mode: "insensitive" }
        cameraMake?: { contains: string; mode: "insensitive" }
        cameraModel?: { contains: string; mode: "insensitive" }
      }>
    }

    const where: WhereClause = {
      userId: user.id,
    }

    // Add search filter
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { originalName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { cameraMake: { contains: search, mode: "insensitive" } },
        { cameraModel: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get all photos with their dates to count by day
    const photos = await prisma.photo.findMany({
      where,
      select: {
        takenAt: true,
        createdAt: true,
      },
    })

    // Group and count by day
    const countsByDay = new Map<string, number>()

    photos.forEach((photo: { takenAt: Date | null; createdAt: Date }) => {
      const photoDate = photo.takenAt ?? photo.createdAt
      // Format as YYYY-MM-DD in local timezone
      const dayKey = photoDate.toISOString().split("T")[0]

      countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1)
    })

    // Convert to array format
    const counts = Array.from(countsByDay.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({ counts })
  } catch (error: unknown) {
    logger.error("Fetch photo counts error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch photo counts" }, { status: 500 })
  }
}
