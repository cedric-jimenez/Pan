import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/individuals/suggest-name/route"
import { createMockIndividual } from "../../fixtures/photo"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    individual: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/suggest-individual-name", () => ({
  suggestIndividualName: vi.fn(),
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { suggestIndividualName } from "@/lib/suggest-individual-name"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

describe("GET /api/individuals/suggest-name", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("suggests a name based on the user's existing individuals", async () => {
    vi.mocked(prisma.individual.findMany).mockResolvedValue([
      createMockIndividual({ name: "Alpha" }),
      createMockIndividual({ name: "Beta" }),
    ])
    vi.mocked(suggestIndividualName).mockResolvedValue("Gamma")

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe("Gamma")
    expect(prisma.individual.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      select: { name: true },
    })
    expect(suggestIndividualName).toHaveBeenCalledWith(["Alpha", "Beta"])
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.individual.findMany).mockRejectedValue(new Error("DB down"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to suggest name")
  })
})
