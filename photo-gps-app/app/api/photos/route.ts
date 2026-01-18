import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { PAGINATION } from "@/lib/constants"
import { logger } from "@/lib/logger"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const sortBy = (searchParams.get("sortBy") || "date") as SortBy
    const sortOrder = (searchParams.get("sortOrder") || "desc") as SortOrder
    const search = searchParams.get("search")

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || PAGINATION.PHOTOS_PER_PAGE.toString(), 10)
    const skip = (page - 1) * limit

    // Build query filters
    type WhereClause = {
      userId: string
      takenAt?: { gte?: Date; lte?: Date }
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

    if (startDate || endDate) {
      where.takenAt = {}
      if (startDate) {
        where.takenAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.takenAt.lte = new Date(endDate)
      }
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

    // Build orderBy based on sortBy parameter
    let orderBy: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]

    switch (sortBy) {
      case "date":
        // Sort by takenAt if available, otherwise by createdAt
        orderBy = [
          { takenAt: sortOrder === "asc" ? "asc" : "desc" },
          { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        ]
        break

      case "title":
        // Sort by title if available, otherwise by originalName
        orderBy = [
          { title: sortOrder === "asc" ? "asc" : "desc" },
          { originalName: sortOrder === "asc" ? "asc" : "desc" },
        ]
        break

      case "size":
        orderBy = { fileSize: sortOrder === "asc" ? "asc" : "desc" }
        break

      case "camera":
        // Sort by cameraModel if available, otherwise by cameraMake
        orderBy = [
          { cameraModel: sortOrder === "asc" ? "asc" : "desc" },
          { cameraMake: sortOrder === "asc" ? "asc" : "desc" },
        ]
        break

      default:
        orderBy = { takenAt: "desc" }
    }

    // Get total count for pagination metadata
    const total = await prisma.photo.count({ where })

    // Fetch paginated photos
    const photos = await prisma.photo.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    })

    // Calculate if there are more pages
    const hasMore = skip + photos.length < total

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    })
  } catch (error: unknown) {
    logger.error("Fetch photos error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
  }
}
