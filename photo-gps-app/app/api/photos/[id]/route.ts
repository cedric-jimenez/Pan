import { NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET single photo
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const photo = await prisma.photo.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ photo })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    )
  }
}

// PATCH update photo
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { title, description } = await request.json()

    // Check if photo belongs to user
    const existingPhoto = await prisma.photo.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingPhoto) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      )
    }

    // Update photo
    const photo = await prisma.photo.update({
      where: {
        id: params.id,
      },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
      },
    })

    return NextResponse.json({ photo })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    )
  }
}

// DELETE photo
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    // Check if photo belongs to user
    const photo = await prisma.photo.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      )
    }

    // Delete file from filesystem
    try {
      const filepath = join(process.cwd(), "public", photo.url)
      await unlink(filepath)
    } catch (error) {
      console.error("Failed to delete file:", error)
    }

    // Delete from database
    await prisma.photo.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    )
  }
}
