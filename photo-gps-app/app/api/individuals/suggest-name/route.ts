import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { suggestIndividualName } from "@/lib/suggest-individual-name"
import { logger } from "@/lib/logger"

// GET a suggested, collision-free name for a new individual.
export async function GET() {
  try {
    const user = await requireAuth()

    const existing = await prisma.individual.findMany({
      where: { userId: user.id },
      select: { name: true },
    })

    const name = await suggestIndividualName(existing.map((i) => i.name))

    return NextResponse.json({ name })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    logger.error("Failed to suggest individual name:", error)
    return NextResponse.json({ error: "Failed to suggest name" }, { status: 500 })
  }
}
