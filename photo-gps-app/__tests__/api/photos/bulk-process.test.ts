import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/photos/bulk-process/route"
import { createMockPhoto } from "../../fixtures/photo"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/blob", () => ({
  deleteFromBlob: vi.fn(),
}))

vi.mock("@/lib/photo-pipeline", () => ({
  compressImage: vi.fn(),
  processCropAndUpload: vi.fn(),
  processSegmentAndEmbed: vi.fn(),
  storeEmbedding: vi.fn(),
  clearEmbedding: vi.fn(),
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { deleteFromBlob } from "@/lib/blob"
import {
  compressImage,
  processCropAndUpload,
  processSegmentAndEmbed,
  storeEmbedding,
  clearEmbedding,
} from "@/lib/photo-pipeline"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

function makePhoto(overrides: Parameters<typeof createMockPhoto>[0] = {}) {
  return createMockPhoto({
    id: "photo-1",
    url: "https://r2.example.com/photo1.jpg",
    originalName: "photo1.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    ...overrides,
  })
}

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/photos/bulk-process", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/photos/bulk-process", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response)
    vi.mocked(compressImage).mockResolvedValue(Buffer.from("compressed"))
    vi.mocked(processCropAndUpload).mockResolvedValue({
      croppedBlobUrl: "https://r2.example.com/photo1-cropped.jpg",
      croppedFileSize: 100,
      isCropped: true,
      cropConfidence: 0.9,
      salamanderDetected: true,
    })
    vi.mocked(processSegmentAndEmbed).mockResolvedValue({
      segmentedBlobUrl: "https://r2.example.com/photo1-segmented.jpg",
      segmentedFileSize: 80,
      segmentedEmbedding: new Array(384).fill(0.1),
      embeddingDim: 384,
      embedModel: "dinov2",
    })
    vi.mocked(storeEmbedding).mockResolvedValue(true)
    vi.mocked(clearEmbedding).mockResolvedValue()
    vi.mocked(prisma.photo.update).mockResolvedValue(makePhoto())
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

  it("rejects more than 50 photo ids", async () => {
    const photoIds = Array.from({ length: 51 }, (_, i) => `photo-${i}`)

    const response = await POST(makeRequest({ photoIds }))

    expect(response.status).toBe(400)
  })

  it("rejects when some photos don't belong to the user", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([makePhoto()])

    const response = await POST(makeRequest({ photoIds: ["photo-1", "photo-2"] }))
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toMatch(/n'ont pas été trouvées/)
  })

  it("reprocesses a photo end-to-end and stores the embedding", async () => {
    const photo = makePhoto()
    vi.mocked(prisma.photo.findMany).mockResolvedValue([photo])

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processedCount).toBe(1)
    expect(data.failedCount).toBe(0)
    expect(data.results[0]).toMatchObject({
      photoId: "photo-1",
      success: true,
      salamanderDetected: true,
      hasCropped: true,
      hasSegmented: true,
      hasEmbedding: true,
    })
    expect(prisma.photo.update).toHaveBeenCalledWith({
      where: { id: "photo-1" },
      data: expect.objectContaining({
        croppedUrl: "https://r2.example.com/photo1-cropped.jpg",
        segmentedUrl: "https://r2.example.com/photo1-segmented.jpg",
        salamanderDetected: true,
      }),
    })
    expect(storeEmbedding).toHaveBeenCalled()
    expect(clearEmbedding).not.toHaveBeenCalled()
  })

  it("deletes previous derived images before reprocessing", async () => {
    const photo = makePhoto({
      croppedUrl: "https://r2.example.com/old-cropped.jpg",
      segmentedUrl: "https://r2.example.com/old-segmented.jpg",
    })
    vi.mocked(prisma.photo.findMany).mockResolvedValue([photo])

    await POST(makeRequest({ photoIds: ["photo-1"] }))

    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2.example.com/old-cropped.jpg")
    expect(deleteFromBlob).toHaveBeenCalledWith("https://r2.example.com/old-segmented.jpg")
  })

  it("clears the embedding when storage fails (dimension mismatch)", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([makePhoto()])
    vi.mocked(storeEmbedding).mockResolvedValue(false)

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(data.results[0].success).toBe(true)
    expect(clearEmbedding).toHaveBeenCalledWith("photo-1")
  })

  it("marks a photo as failed when the original image can't be fetched", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([makePhoto()])
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response)

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processedCount).toBe(0)
    expect(data.failedCount).toBe(1)
    expect(data.results[0]).toMatchObject({
      photoId: "photo-1",
      success: false,
      error: "Failed to fetch original image",
    })
    expect(prisma.photo.update).not.toHaveBeenCalled()
  })

  it("catches an unexpected per-photo error and still processes the rest", async () => {
    const photoA = makePhoto({ id: "photo-a" })
    const photoB = makePhoto({ id: "photo-b" })
    vi.mocked(prisma.photo.findMany).mockResolvedValue([photoA, photoB])
    vi.mocked(compressImage)
      .mockRejectedValueOnce(new Error("sharp exploded"))
      .mockResolvedValueOnce(Buffer.from("compressed"))

    const response = await POST(makeRequest({ photoIds: ["photo-a", "photo-b"] }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processedCount).toBe(1)
    expect(data.failedCount).toBe(1)
    expect(data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ photoId: "photo-a", success: false, error: "sharp exploded" }),
        expect.objectContaining({ photoId: "photo-b", success: true }),
      ])
    )
  })

  it("returns 500 on unexpected top-level errors", async () => {
    vi.mocked(prisma.photo.findMany).mockRejectedValue(new Error("DB down"))

    const response = await POST(makeRequest({ photoIds: ["photo-1"] }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toMatch(/Échec/)
  })
})
