import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/individuals/route"
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/individuals/[id]/route"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    individual: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

function makeIndividual(overrides: Record<string, unknown> = {}) {
  return {
    id: "ind-1",
    name: "Salamandra",
    userId: "user-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    _count: { photos: 3 },
    photos: [],
    ...overrides,
  }
}

describe("GET /api/individuals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await GET(new Request("http://localhost:3000/api/individuals"))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects an invalid page number", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/individuals?page=0")
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid query parameters")
    expect(prisma.individual.findMany).not.toHaveBeenCalled()
  })

  it("lists individuals scoped to the current user with derived cover/lastObservedAt", async () => {
    vi.mocked(prisma.individual.findMany).mockResolvedValue([
      makeIndividual({
        photos: [{ url: "https://r2/orig.jpg", croppedUrl: "https://r2/crop.jpg", takenAt: new Date("2024-02-01") }],
      }),
    ])
    vi.mocked(prisma.individual.count).mockResolvedValue(1)

    const response = await GET(new Request("http://localhost:3000/api/individuals"))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.individual.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-123" }, skip: 0, take: 20 })
    )
    expect(data.individuals[0]).toMatchObject({
      id: "ind-1",
      name: "Salamandra",
      photoCount: 3,
      coverUrl: "https://r2/crop.jpg",
    })
    expect(data.total).toBe(1)
    expect(data.totalPages).toBe(1)
  })

  it("falls back to the original url when there is no cropped url", async () => {
    vi.mocked(prisma.individual.findMany).mockResolvedValue([
      makeIndividual({ photos: [{ url: "https://r2/orig.jpg", croppedUrl: null, takenAt: null }] }),
    ])
    vi.mocked(prisma.individual.count).mockResolvedValue(1)

    const response = await GET(new Request("http://localhost:3000/api/individuals"))
    const data = await response.json()

    expect(data.individuals[0].coverUrl).toBe("https://r2/orig.jpg")
    expect(data.individuals[0].lastObservedAt).toBeNull()
  })

  it("filters by search term case-insensitively", async () => {
    vi.mocked(prisma.individual.findMany).mockResolvedValue([])
    vi.mocked(prisma.individual.count).mockResolvedValue(0)

    await GET(new Request("http://localhost:3000/api/individuals?search=sala"))

    expect(prisma.individual.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123", name: { contains: "sala", mode: "insensitive" } },
      })
    )
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.individual.findMany).mockRejectedValue(new Error("DB down"))

    const response = await GET(new Request("http://localhost:3000/api/individuals"))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch individuals")
  })
})

describe("POST /api/individuals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  function makePostRequest(body: unknown) {
    return new Request("http://localhost:3000/api/individuals", {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await POST(makePostRequest({ name: "Salamandra" }))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects an empty name", async () => {
    const response = await POST(makePostRequest({ name: "" }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("rejects a duplicate name for the same user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(makeIndividual())

    const response = await POST(makePostRequest({ name: "Salamandra" }))
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe("An individual with this name already exists")
    expect(prisma.individual.create).not.toHaveBeenCalled()
  })

  it("creates a new individual scoped to the current user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.individual.create).mockResolvedValue(makeIndividual({ _count: { photos: 0 } }))

    const response = await POST(makePostRequest({ name: "Salamandra" }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(prisma.individual.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Salamandra", userId: "user-123" } })
    )
    expect(data.individual).toMatchObject({ id: "ind-1", name: "Salamandra", photoCount: 0 })
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.individual.findFirst).mockRejectedValue(new Error("DB down"))

    const response = await POST(makePostRequest({ name: "Salamandra" }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to create individual")
  })
})

describe("GET /api/individuals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await GET_BY_ID(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 404 when the individual does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)

    const response = await GET_BY_ID(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Individual not found")
  })

  it("returns the individual with its photos", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(
      makeIndividual({ photos: [{ id: "photo-1" }] })
    )

    const response = await GET_BY_ID(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.individual.photoCount).toBe(3)
    expect(data.individual.photos).toEqual([{ id: "photo-1" }])
  })
})

describe("PATCH /api/individuals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  function makePatchRequest(id: string, body: unknown) {
    return PATCH(
      new Request(`http://localhost:3000/api/individuals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) }
    )
  }

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await makePatchRequest("ind-1", { name: "New Name" })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 404 when the individual does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)

    const response = await makePatchRequest("ind-1", { name: "New Name" })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Individual not found")
  })

  it("rejects a rename to a name already used by another individual", async () => {
    vi.mocked(prisma.individual.findFirst)
      .mockResolvedValueOnce(makeIndividual({ name: "Old Name" })) // existing lookup
      .mockResolvedValueOnce(makeIndividual({ id: "ind-2", name: "New Name" })) // duplicate lookup

    const response = await makePatchRequest("ind-1", { name: "New Name" })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe("An individual with this name already exists")
    expect(prisma.individual.update).not.toHaveBeenCalled()
  })

  it("allows renaming to the same name without a conflict check", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValueOnce(makeIndividual({ name: "Same Name" }))
    vi.mocked(prisma.individual.update).mockResolvedValue(makeIndividual({ name: "Same Name" }))

    const response = await makePatchRequest("ind-1", { name: "Same Name" })

    expect(response.status).toBe(200)
    // No duplicate lookup performed since name is unchanged
    expect(prisma.individual.findFirst).toHaveBeenCalledTimes(1)
  })

  it("updates the individual name", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValueOnce(makeIndividual({ name: "Old Name" }))
    vi.mocked(prisma.individual.findFirst).mockResolvedValueOnce(null) // no duplicate
    vi.mocked(prisma.individual.update).mockResolvedValue(makeIndividual({ name: "New Name" }))

    const response = await makePatchRequest("ind-1", { name: "New Name" })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.individual.name).toBe("New Name")
  })
})

describe("DELETE /api/individuals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await DELETE(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 404 when the individual does not belong to the user", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Individual not found")
    expect(prisma.individual.delete).not.toHaveBeenCalled()
  })

  it("deletes the individual", async () => {
    vi.mocked(prisma.individual.findFirst).mockResolvedValue(makeIndividual())
    vi.mocked(prisma.individual.delete).mockResolvedValue(makeIndividual())

    const response = await DELETE(new Request("http://localhost:3000/api/individuals/ind-1"), {
      params: Promise.resolve({ id: "ind-1" }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.individual.delete).toHaveBeenCalledWith({ where: { id: "ind-1" } })
  })
})
