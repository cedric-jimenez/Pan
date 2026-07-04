import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as ASSIGN } from "@/app/api/individuals/[id]/assign/route"
import { POST as UNASSIGN } from "@/app/api/individuals/[id]/unassign/route"
import { createMockIndividual, createMockPhoto } from "../../fixtures/photo"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    individual: {
      findFirst: vi.fn(),
    },
    photo: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

function makeRequest(individualId: string, body: unknown) {
  return new Request(`http://localhost:3000/api/individuals/${individualId}/assign`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/individuals/[id]/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await ASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects a request with no photoId", async () => {
    const response = await ASSIGN(makeRequest("ind-1", {}), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("returns 404 when the individual does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)

    const response = await ASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Individual not found")
    expect(prisma.photo.findFirst).not.toHaveBeenCalled()
  })

  it("returns 404 when the photo does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(createMockIndividual())
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    const response = await ASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
    expect(prisma.photo.update).not.toHaveBeenCalled()
  })

  it("assigns the photo to the individual", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(createMockIndividual())
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(createMockPhoto({ id: "photo-1" }))
    vi.mocked(prisma.photo.update).mockResolvedValue(
      createMockPhoto({ id: "photo-1", individualId: "ind-1" })
    )

    const response = await ASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, photo: { id: "photo-1", individualId: "ind-1" } })
    expect(prisma.photo.update).toHaveBeenCalledWith({
      where: { id: "photo-1" },
      data: { individualId: "ind-1" },
    })
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.individual.findFirst).mockRejectedValue(new Error("DB down"))

    const response = await ASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to assign photo")
  })
})

describe("POST /api/individuals/[id]/unassign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 404 when the individual does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)

    const response = await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Individual not found")
  })

  it("returns 404 when the photo is not assigned to this individual", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(createMockIndividual())
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    const response = await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found or not assigned to this individual")
    expect(prisma.photo.update).not.toHaveBeenCalled()
  })

  it("scopes the photo lookup to the target individual", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(createMockIndividual())
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", individualId: "ind-1" })
    )
    vi.mocked(prisma.photo.update).mockResolvedValue(
      createMockPhoto({ id: "photo-1", individualId: null })
    )

    await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })

    expect(prisma.photo.findFirst).toHaveBeenCalledWith({
      where: { id: "photo-1", userId: "user-123", individualId: "ind-1" },
    })
  })

  it("unassigns the photo from the individual", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(createMockIndividual())
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", individualId: "ind-1" })
    )
    vi.mocked(prisma.photo.update).mockResolvedValue(
      createMockPhoto({ id: "photo-1", individualId: null })
    )

    const response = await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, photo: { id: "photo-1", individualId: null } })
    expect(prisma.photo.update).toHaveBeenCalledWith({
      where: { id: "photo-1" },
      data: { individualId: null },
    })
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.individual.findFirst).mockRejectedValue(new Error("DB down"))

    const response = await UNASSIGN(makeRequest("ind-1", { photoId: "photo-1" }), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to unassign photo")
  })
})
