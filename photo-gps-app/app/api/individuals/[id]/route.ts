import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { individualUpdateSchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"

// GET single individual
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const individual = await prisma.individual.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
        photos: {
          select: {
            id: true,
            url: true,
            croppedUrl: true,
            title: true,
            takenAt: true,
          },
          orderBy: {
            takenAt: "desc",
          },
        },
      },
    })

    if (!individual) {
      return NextResponse.json({ error: "Individual not found" }, { status: 404 })
    }

    return NextResponse.json({
      individual: {
        id: individual.id,
        name: individual.name,
        photoCount: individual._count.photos,
        photos: individual.photos,
        createdAt: individual.createdAt,
        updatedAt: individual.updatedAt,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch individual" }, { status: 500 })
  }
}

// PATCH update individual
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validation = validateSafe(individualUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors.format(),
        },
        { status: 400 }
      )
    }

    const { name } = validation.data

    // Check if individual exists and belongs to user
    const existingIndividual = await prisma.individual.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingIndividual) {
      return NextResponse.json({ error: "Individual not found" }, { status: 404 })
    }

    // If name is being updated, check for duplicates
    if (name && name !== existingIndividual.name) {
      const duplicate = await prisma.individual.findFirst({
        where: {
          userId: user.id,
          name,
          id: {
            not: id,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "An individual with this name already exists" },
          { status: 409 }
        )
      }
    }

    // Update individual
    const individual = await prisma.individual.update({
      where: {
        id,
      },
      data: {
        name,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    })

    return NextResponse.json({
      individual: {
        id: individual.id,
        name: individual.name,
        photoCount: individual._count.photos,
        createdAt: individual.createdAt,
        updatedAt: individual.updatedAt,
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

    return NextResponse.json({ error: "Failed to update individual" }, { status: 500 })
  }
}

// DELETE individual
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await params

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

    // Delete individual (photos will have their individualId set to null due to onDelete: SetNull)
    await prisma.individual.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to delete individual" }, { status: 500 })
  }
}
