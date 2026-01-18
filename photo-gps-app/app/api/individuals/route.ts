import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { individualCreateSchema, individualQuerySchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

// GET all individuals for current user
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    // Validate query parameters
    const queryValidation = validateSafe(individualQuerySchema, {
      search: searchParams.get("search"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryValidation.errors.format(),
        },
        { status: 400 }
      )
    }

    const { search, page, limit } = queryValidation.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.IndividualWhereInput = {
      userId: user.id,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }),
    }

    // Get individuals with photo count
    const [individuals, total] = await Promise.all([
      prisma.individual.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: "asc",
        },
        include: {
          _count: {
            select: {
              photos: true,
            },
          },
        },
      }),
      prisma.individual.count({ where }),
    ])

    return NextResponse.json({
      individuals: individuals.map((ind) => ({
        id: ind.id,
        name: ind.name,
        photoCount: ind._count.photos,
        createdAt: ind.createdAt,
        updatedAt: ind.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to fetch individuals" }, { status: 500 })
  }
}

// POST create new individual
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validation = validateSafe(individualCreateSchema, body)
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

    // Check if name already exists for this user
    const existing = await prisma.individual.findFirst({
      where: {
        userId: user.id,
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "An individual with this name already exists" },
        { status: 409 }
      )
    }

    // Create individual
    const individual = await prisma.individual.create({
      data: {
        name,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        individual: {
          id: individual.id,
          name: individual.name,
          photoCount: individual._count.photos,
          createdAt: individual.createdAt,
          updatedAt: individual.updatedAt,
        },
      },
      { status: 201 }
    )
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

    return NextResponse.json({ error: "Failed to create individual" }, { status: 500 })
  }
}
