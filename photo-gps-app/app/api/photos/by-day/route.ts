import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { logger } from "@/lib/logger"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

// Returns every photo for a single day (no pagination — a day is bounded), with
// the same day-grouping logic as counts-by-day / ids-by-day so the photos shown
// match the count displayed in the day header. Used for per-day lazy loading in
// the gallery: a day's photos are only fetched once it is expanded and visible.
export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const sortBy = (searchParams.get("sortBy") || "date") as SortBy
    const sortOrder = (searchParams.get("sortOrder") || "desc") as SortOrder
    const search = searchParams.get("search")

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date parameter (YYYY-MM-DD) is required" },
        { status: 400 }
      )
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd = new Date(`${date}T23:59:59.999Z`)

    // A photo belongs to the day if its takenAt falls in the day, or — when it
    // has no takenAt — its createdAt does (mirrors ids-by-day).
    const dayFilter: Prisma.PhotoWhereInput[] = [
      { takenAt: { gte: dayStart, lte: dayEnd } },
      { takenAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
    ]

    const where: Prisma.PhotoWhereInput = { userId: user.id }
    if (search && search.trim()) {
      where.AND = [
        { OR: dayFilter },
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { originalName: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { cameraMake: { contains: search, mode: "insensitive" } },
            { cameraModel: { contains: search, mode: "insensitive" } },
          ],
        },
      ]
    } else {
      where.OR = dayFilter
    }

    // Mirror the ordering options exposed by /api/photos so within-day sorting is
    // consistent with the rest of the gallery.
    let orderBy:
      | Prisma.PhotoOrderByWithRelationInput
      | Prisma.PhotoOrderByWithRelationInput[]

    switch (sortBy) {
      case "title":
        orderBy = [{ title: sortOrder }, { originalName: sortOrder }]
        break
      case "size":
        orderBy = { fileSize: sortOrder }
        break
      case "camera":
        orderBy = [{ cameraModel: sortOrder }, { cameraMake: sortOrder }]
        break
      case "date":
      default:
        orderBy = [{ takenAt: sortOrder }, { createdAt: sortOrder }]
        break
    }

    const photos = await prisma.photo.findMany({
      where,
      orderBy,
      include: {
        individual: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ photos })
  } catch (error: unknown) {
    logger.error("Fetch photos by day error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
  }
}
