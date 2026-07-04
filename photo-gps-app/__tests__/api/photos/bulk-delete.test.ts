import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/photos/bulk-delete/route"
import { createMockPhoto } from "../../fixtures/photo"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/blob", () => ({
  deleteFromBlob: vi.fn(),
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { deleteFromBlob } from "@/lib/blob"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/photos/bulk-delete", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/photos/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    vi.mocked(deleteFromBlob).mockResolvedValue()
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects an empty photoIds array", async () => {
    const response = await POST(makeRequest({ photoIds: [] }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("rejects more than 100 photo ids", async () => {
    const photoIds = Array.from({ length: 101 }, (_, i) => `photo-${i}`)

    const response = await POST(makeRequest({ photoIds }))

    expect(response.status).toBe(400)
  })

  it("rejects when some photos don't belong to the user (or don't exist)", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      createMockPhoto({ id: "photo-1" }),
    ])

    const response = await POST(makeRequest({ photoIds: ["photo-1", "photo-2"] }))
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toMatch(/n'ont pas été trouvées/)
    expect(prisma.photo.deleteMany).not.toHaveBeenCalled()
  })

  it("deletes original, cropped, and segmented blobs plus the DB rows", async () => {
    const photos = [
      createMockPhoto({
        id: "photo-1",
        url: "https://r2/photo1.jpg",
        croppedUrl: "https://r2/photo1-cropped.jpg",
        segmentedUrl: "https://r2/photo1-segmented.jpg",
      }),
      createMockPhoto({ id: "photo-2", url: "https://r2/photo2.jpg", croppedUrl: null, segmentedUrl: null }),
    ]
    vi.mocked(prisma.photo.findMany).mockResolvedValue(photos)
    vi.mocked(prisma.photo.deleteMany).mockResolvedValue({ count: 2 })

    const response = await POST(makeRequest({ photoIds: ["photo-1", "photo-2"] }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, deletedCount: 2 })
    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2/photo1.jpg")
    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2/photo1-cropped.jpg")
    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2/photo1-segmented.jpg")
    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2/photo2.jpg")
    expect(deleteFromBlob).toHaveBeenCalledTimes(4)
    expect(prisma.photo.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["photo-1", "photo-2"] }, userId: "user-123" },
    })
  })

  it("still deletes the DB rows even when a blob deletion fails", async () => {
    const photos = [createMockPhoto({ id: "photo-1", url: "https://r2/photo1.jpg" })]
    vi.mocked(prisma.photo.findMany).mockResolvedValue(photos)
    vi.mocked(deleteFromBlob).mockRejectedValue(new Error("blob gone"))
    vi.mocked(prisma.photo.deleteMany).mockResolvedValue({ count: 1 })

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.photo.deleteMany).toHaveBeenCalled()
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.photo.findMany).mockRejectedValue(new Error("DB down"))

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toMatch(/Échec/)
  })
})
