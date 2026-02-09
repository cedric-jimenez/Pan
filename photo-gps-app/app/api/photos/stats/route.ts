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

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { originalName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { cameraMake: { contains: search, mode: "insensitive" } },
        { cameraModel: { contains: search, mode: "insensitive" } },
      ]
    }

    // Run all queries in parallel for efficiency
    const [total, withGPS, withEXIF, cropped, storage] = await Promise.all([
      // Total photos
      prisma.photo.count({ where }),

      // Photos with GPS coordinates
      prisma.photo.count({
        where: {
          ...where,
          latitude: { not: null },
          longitude: { not: null },
        },
      }),

      // Photos with EXIF data (use AND to avoid overwriting search OR)
      prisma.photo.count({
        where: {
          AND: [
            where,
            {
              OR: [
                { aperture: { not: null } },
                { shutterSpeed: { not: null } },
                { iso: { not: null } },
                { focalLength: { not: null } },
              ],
            },
          ],
        },
      }),

      // Cropped photos
      prisma.photo.count({
        where: {
          ...where,
          croppedUrl: { not: null },
        },
      }),

      // Total storage (sum of all file sizes)
      prisma.photo.aggregate({
        where,
        _sum: {
          fileSize: true,
          croppedFileSize: true,
          segmentedFileSize: true,
        },
      }),
    ])

    const totalStorage =
      (storage._sum.fileSize || 0) +
      (storage._sum.croppedFileSize || 0) +
      (storage._sum.segmentedFileSize || 0)

    return NextResponse.json({
      total,
      withGPS,
      withEXIF,
      cropped,
      totalStorage,
    })
  } catch (error: unknown) {
    logger.error("Fetch photo stats error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch photo stats" }, { status: 500 })
  }
}
