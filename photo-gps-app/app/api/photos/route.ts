import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

type SortBy = 'date' | 'title' | 'size' | 'camera'
type SortOrder = 'asc' | 'desc'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const sortBy = (searchParams.get("sortBy") || 'date') as SortBy
    const sortOrder = (searchParams.get("sortOrder") || 'desc') as SortOrder

    // Build query filters
    const where: { userId: string; takenAt?: { gte?: Date; lte?: Date } } = {
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

    // Build orderBy based on sortBy parameter
    let orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[]

    switch (sortBy) {
      case 'date':
        // Sort by takenAt if available, otherwise by createdAt
        orderBy = [
          { takenAt: sortOrder === 'asc' ? 'asc' : 'desc' },
          { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }
        ]
        break

      case 'title':
        // Sort by title if available, otherwise by originalName
        orderBy = [
          { title: sortOrder === 'asc' ? 'asc' : 'desc' },
          { originalName: sortOrder === 'asc' ? 'asc' : 'desc' }
        ]
        break

      case 'size':
        orderBy = { fileSize: sortOrder === 'asc' ? 'asc' : 'desc' }
        break

      case 'camera':
        // Sort by cameraModel if available, otherwise by cameraMake
        orderBy = [
          { cameraModel: sortOrder === 'asc' ? 'asc' : 'desc' },
          { cameraMake: sortOrder === 'asc' ? 'asc' : 'desc' }
        ]
        break

      default:
        orderBy = { takenAt: 'desc' }
    }

    const photos = await prisma.photo.findMany({
      where,
      orderBy,
    })

    return NextResponse.json({ photos })
  } catch (error: unknown) {
    console.error("Fetch photos error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
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
