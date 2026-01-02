import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { deleteFromBlob } from "@/lib/blob"

export const maxDuration = 60 // Allow up to 60 seconds for bulk deletion

// POST bulk delete photos
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { photoIds } = await request.json()

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "photoIds doit être un tableau non vide" }, { status: 400 })
    }

    // Fetch all photos that belong to the user
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        userId: user.id,
      },
    })

    // Check if all requested photos were found and belong to user
    if (photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: "Certaines photos n'ont pas été trouvées ou ne vous appartiennent pas" },
        { status: 403 }
      )
    }

    // Delete files from Vercel Blob Storage
    const deletionResults = await Promise.allSettled(
      photos.map((photo) => deleteFromBlob(photo.url))
    )

    // Log any blob deletion errors, but continue with database deletion
    deletionResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to delete blob for photo ${photos[index].id}:`, result.reason)
      }
    })

    // Delete all photos from database
    const deleteResult = await prisma.photo.deleteMany({
      where: {
        id: { in: photoIds },
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("Bulk delete error:", error)
    return NextResponse.json({ error: "Échec de la suppression des photos" }, { status: 500 })
  }
}
