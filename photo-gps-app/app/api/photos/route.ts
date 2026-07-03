import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { PAGINATION } from "@/lib/constants"
import { logger } from "@/lib/logger"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

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

type OrderBy = Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]

function buildWhereClause(
  userId: string,
  params: { startDate: string | null; endDate: string | null; search: string | null }
): WhereClause {
  const where: WhereClause = { userId }

  if (params.startDate || params.endDate) {
    where.takenAt = {}
    if (params.startDate) where.takenAt.gte = new Date(params.startDate)
    if (params.endDate) where.takenAt.lte = new Date(params.endDate)
  }

  if (params.search && params.search.trim()) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { originalName: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { cameraMake: { contains: params.search, mode: "insensitive" } },
      { cameraModel: { contains: params.search, mode: "insensitive" } },
    ]
  }

  return where
}

/** Sort by the requested field, falling back to a secondary field when the primary is unset. */
function buildOrderBy(sortBy: SortBy, sortOrder: SortOrder): OrderBy {
  const dir = sortOrder === "asc" ? "asc" : "desc"

  switch (sortBy) {
    case "date":
      return [{ takenAt: dir }, { createdAt: dir }]
    case "title":
      return [{ title: dir }, { originalName: dir }]
    case "size":
      return { fileSize: dir }
    case "camera":
      return [{ cameraModel: dir }, { cameraMake: dir }]
    default:
      return { takenAt: "desc" }
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const sortBy = (searchParams.get("sortBy") || "date") as SortBy
    const sortOrder = (searchParams.get("sortOrder") || "desc") as SortOrder

    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || PAGINATION.PHOTOS_PER_PAGE.toString(), 10)
    const skip = (page - 1) * limit

    const where = buildWhereClause(user.id, {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      search: searchParams.get("search"),
    })
    const orderBy = buildOrderBy(sortBy, sortOrder)

    const total = await prisma.photo.count({ where })

    const photos = await prisma.photo.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        individual: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

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
