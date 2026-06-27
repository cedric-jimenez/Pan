import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    individual: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { POST } from "@/app/api/identification/confirm/route"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const user = { id: "user-1", email: "t@e.com", name: "T" }

function req(body: unknown): Request {
  return new Request("http://localhost/api/identification/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/identification/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(user)
  })

  it("creates a new individual when no photo is linked yet", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      { id: "p1", individualId: null },
      { id: "p2", individualId: null },
    ] as never)
    vi.mocked(prisma.individual.create).mockResolvedValue({ id: "ind-new" } as never)
    vi.mocked(prisma.photo.updateMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(prisma.individual.findUnique).mockResolvedValue({
      id: "ind-new",
      name: "Lila",
      _count: { photos: 2 },
    } as never)

    const res = await POST(req({ photoIds: ["p1", "p2"], newName: "Lila" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(prisma.individual.create).toHaveBeenCalled()
    expect(data.assignedCount).toBe(2)
    expect(data.individual.name).toBe("Lila")
  })

  it("reuses the single existing individual among the photos", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      { id: "p1", individualId: "ind-1" },
      { id: "p2", individualId: null },
    ] as never)
    vi.mocked(prisma.photo.updateMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(prisma.individual.findUnique).mockResolvedValue({
      id: "ind-1",
      name: "Hugo",
      _count: { photos: 2 },
    } as never)

    const res = await POST(req({ photoIds: ["p1", "p2"] }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(prisma.individual.create).not.toHaveBeenCalled()
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { individualId: "ind-1" } })
    )
    expect(data.individual.name).toBe("Hugo")
  })

  it("returns 409 with the conflicting individuals when photos span several", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      { id: "p1", individualId: "ind-1" },
      { id: "p2", individualId: "ind-2" },
    ] as never)
    vi.mocked(prisma.individual.findMany).mockResolvedValue([
      { id: "ind-1", name: "Hugo", _count: { photos: 3 } },
      { id: "ind-2", name: "Lila", _count: { photos: 1 } },
    ] as never)

    const res = await POST(req({ photoIds: ["p1", "p2"] }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.conflict).toBe(true)
    expect(data.individuals).toHaveLength(2)
    expect(prisma.photo.updateMany).not.toHaveBeenCalled()
  })

  it("uses the explicitly chosen individual to resolve a conflict", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      { id: "p1", individualId: "ind-1" },
      { id: "p2", individualId: "ind-2" },
    ] as never)
    vi.mocked(prisma.individual.findFirst).mockResolvedValue({ id: "ind-2" } as never)
    vi.mocked(prisma.photo.updateMany).mockResolvedValue({ count: 2 } as never)
    vi.mocked(prisma.individual.findUnique).mockResolvedValue({
      id: "ind-2",
      name: "Lila",
      _count: { photos: 3 },
    } as never)

    const res = await POST(req({ photoIds: ["p1", "p2"], individualId: "ind-2" }))
    expect(res.status).toBe(200)
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { individualId: "ind-2" } })
    )
  })

  it("404s when a photo does not belong to the user", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([{ id: "p1", individualId: null }] as never)

    const res = await POST(req({ photoIds: ["p1", "p2"] }))
    expect(res.status).toBe(404)
  })

  it("400s when creating without a name", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([{ id: "p1", individualId: null }] as never)

    const res = await POST(req({ photoIds: ["p1"] }))
    expect(res.status).toBe(400)
  })
})
