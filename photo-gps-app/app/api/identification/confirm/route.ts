import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { identificationConfirmSchema, validateSafe } from "@/lib/validations"
import { logger } from "@/lib/logger"
import { Prisma } from "@prisma/client"

/**
 * Confirm that a set of photos belongs to the same individual and assign them
 * all in a single transaction.
 *
 * Target individual resolution (server-authoritative):
 *  - body.individualId provided  -> use it (must belong to the user). This is
 *    how the client resolves the multi-individual conflict case below.
 *  - photos already share exactly one individual -> reuse it.
 *  - photos span several individuals -> 409 with the conflicting individuals so
 *    the client can ask the human which one to keep.
 *  - no photo has an individual yet -> create one from body.newName.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validation = validateSafe(identificationConfirmSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors.format() },
        { status: 400 }
      )
    }

    const { photoIds, individualId, newName } = validation.data
    const uniquePhotoIds = [...new Set(photoIds)]

    // Load the photos the user is trying to assign and confirm ownership.
    const photos = await prisma.photo.findMany({
      where: { id: { in: uniquePhotoIds }, userId: user.id },
      select: { id: true, individualId: true },
    })

    if (photos.length !== uniquePhotoIds.length) {
      return NextResponse.json(
        { error: "One or more photos were not found" },
        { status: 404 }
      )
    }

    const distinctIndividualIds = [
      ...new Set(photos.map((p) => p.individualId).filter((id): id is string => Boolean(id))),
    ]

    let targetIndividualId: string

    if (individualId) {
      // Explicit choice (conflict resolution). Verify it belongs to the user.
      const chosen = await prisma.individual.findFirst({
        where: { id: individualId, userId: user.id },
        select: { id: true },
      })
      if (!chosen) {
        return NextResponse.json({ error: "Individual not found" }, { status: 404 })
      }
      targetIndividualId = chosen.id
    } else if (distinctIndividualIds.length > 1) {
      // Conflict: the selection spans multiple individuals. Let the human pick.
      const conflicting = await prisma.individual.findMany({
        where: { id: { in: distinctIndividualIds }, userId: user.id },
        select: {
          id: true,
          name: true,
          _count: { select: { photos: true } },
        },
      })
      return NextResponse.json(
        {
          error: "conflict",
          conflict: true,
          individuals: conflicting.map((i) => ({
            id: i.id,
            name: i.name,
            photoCount: i._count.photos,
          })),
        },
        { status: 409 }
      )
    } else if (distinctIndividualIds.length === 1) {
      // Exactly one existing individual among the photos: reuse it.
      targetIndividualId = distinctIndividualIds[0]
    } else {
      // No existing individual: create one from the (suggested, editable) name.
      if (!newName) {
        return NextResponse.json(
          { error: "A name is required to create a new individual" },
          { status: 400 }
        )
      }
      try {
        const created = await prisma.individual.create({
          data: { name: newName, userId: user.id },
          select: { id: true },
        })
        targetIndividualId = created.id
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return NextResponse.json(
            { error: "An individual with this name already exists" },
            { status: 409 }
          )
        }
        throw error
      }
    }

    // Assign every photo to the resolved individual atomically.
    const result = await prisma.photo.updateMany({
      where: { id: { in: uniquePhotoIds }, userId: user.id },
      data: { individualId: targetIndividualId },
    })

    const individual = await prisma.individual.findUnique({
      where: { id: targetIndividualId },
      select: {
        id: true,
        name: true,
        _count: { select: { photos: true } },
      },
    })

    logger.log({
      action: "identification_confirm",
      userId: user.id,
      individualId: targetIndividualId,
      assignedCount: result.count,
    })

    return NextResponse.json({
      success: true,
      assignedCount: result.count,
      individual: individual
        ? { id: individual.id, name: individual.name, photoCount: individual._count.photos }
        : null,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    logger.error("Identification confirm error:", error)
    return NextResponse.json({ error: "Failed to confirm identification" }, { status: 500 })
  }
}
