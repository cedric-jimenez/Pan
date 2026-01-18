import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { deleteFromBlob } from "@/lib/blob"
import { logger } from "@/lib/logger"
import { photoUpdateSchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"

// GET single photo
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const photo = await prisma.photo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    return NextResponse.json({ photo })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 })
  }
}

// PATCH update photo
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Validate input with Zod
    const validation = validateSafe(photoUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors.format(),
        },
        { status: 400 }
      )
    }

    const { title, description } = validation.data

    // Check if photo belongs to user
    const existingPhoto = await prisma.photo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingPhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Update photo
    const photo = await prisma.photo.update({
      where: {
        id,
      },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
      },
    })

    return NextResponse.json({ photo })
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

    return NextResponse.json({ error: "Failed to update photo" }, { status: 500 })
  }
}

// DELETE photo
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check if photo belongs to user
    const photo = await prisma.photo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Delete files from Vercel Blob Storage
    try {
      await deleteFromBlob(photo.url)
    } catch (error) {
      logger.error("Failed to delete blob:", error)
    }

    // Also delete cropped image if it exists
    if (photo.croppedUrl) {
      try {
        await deleteFromBlob(photo.croppedUrl)
      } catch (error) {
        logger.error("Failed to delete cropped blob:", error)
      }
    }

    // Also delete segmented image if it exists
    if (photo.segmentedUrl) {
      try {
        await deleteFromBlob(photo.segmentedUrl)
      } catch (error) {
        logger.error("Failed to delete segmented blob:", error)
      }
    }

    // Delete from database
    await prisma.photo.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
