import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { assignPhotoSchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"

// POST unassign photo from individual
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validation = validateSafe(assignPhotoSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors.format(),
        },
        { status: 400 }
      )
    }

    const { photoId } = validation.data

    // Check if individual exists and belongs to user
    const individual = await prisma.individual.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!individual) {
      return NextResponse.json({ error: "Individual not found" }, { status: 404 })
    }

    // Check if photo exists, belongs to user, and is assigned to this individual
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id,
        individualId: id,
      },
    })

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found or not assigned to this individual" },
        { status: 404 }
      )
    }

    // Unassign photo from individual
    const updatedPhoto = await prisma.photo.update({
      where: {
        id: photoId,
      },
      data: {
        individualId: null,
      },
    })

    return NextResponse.json({
      success: true,
      photo: {
        id: updatedPhoto.id,
        individualId: updatedPhoto.individualId,
      },
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.format(),
        },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to unassign photo" }, { status: 500 })
  }
}
