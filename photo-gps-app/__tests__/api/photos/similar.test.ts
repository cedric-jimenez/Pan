import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GET } from "@/app/api/photos/[id]/similar/route"
import { createMockPhoto } from "../../fixtures/photo"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"

function makeGetRequest(id: string, query = "") {
  const request = new Request(`http://localhost:3000/api/photos/${id}/similar${query}`)
  return GET(request, { params: Promise.resolve({ id }) })
}

function mockImageFetch() {
  return {
    ok: true,
    statusText: "OK",
    arrayBuffer: async () => new ArrayBuffer(8),
  } as Response
}

describe("GET /api/photos/[id]/similar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.RAILWAY_API_URL
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })
    global.fetch = vi.fn()
  })

  afterEach(() => {
    delete process.env.RAILWAY_API_URL
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("returns 404 when the photo does not exist for this user", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    const response = await makeGetRequest("photo-missing")
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
  })

  it("returns 400 when the photo has no embedding vector", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(createMockPhoto({ id: "photo-1" }))
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ has_embedding: false }])

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Photo does not have an embedding vector")
  })

  it("returns 400 when the photo has no segmented image", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: null })
    )
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ has_embedding: true }])

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Photo does not have a segmented image")
  })

  it("returns an empty array when there are no candidate photos", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: "https://r2.example.com/seg1.jpg" })
    )
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ has_embedding: true }])
      .mockResolvedValueOnce([])

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("falls back to vector similarity scores when RAILWAY_API_URL is not configured", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: "https://r2.example.com/seg1.jpg" })
    )
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ has_embedding: true }])
      .mockResolvedValueOnce([
        {
          id: "photo-2",
          filename: "photo2.jpg",
          url: "https://r2.example.com/photo2.jpg",
          croppedUrl: null,
          segmentedUrl: "https://r2.example.com/seg2.jpg",
          title: null,
          description: null,
          takenAt: null,
          latitude: null,
          longitude: null,
          individualId: null,
          individualName: null,
          distance: 0.3,
        },
      ])
    vi.mocked(global.fetch).mockImplementation(async () => mockImageFetch())

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({
      id: "photo-2",
      confidence: "unknown",
      isSame: false,
      similarityScore: 0.7, // 1 - distance(0.3)
    })
    // Only image fetches happened, no call to a Railway /verify endpoint
    expect(vi.mocked(global.fetch).mock.calls.every(([url]) => !String(url).endsWith("/verify"))).toBe(
      true
    )
  })

  it("falls back to vector similarity scores when Railway /verify fails", async () => {
    process.env.RAILWAY_API_URL = "https://railway.example.com"
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: "https://r2.example.com/seg1.jpg" })
    )
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ has_embedding: true }])
      .mockResolvedValueOnce([
        {
          id: "photo-2",
          filename: "photo2.jpg",
          url: "https://r2.example.com/photo2.jpg",
          croppedUrl: null,
          segmentedUrl: "https://r2.example.com/seg2.jpg",
          title: null,
          description: null,
          takenAt: null,
          latitude: null,
          longitude: null,
          individualId: null,
          individualName: null,
          distance: 0.5,
        },
      ])
    vi.mocked(global.fetch).mockImplementation(async (url) => {
      if (String(url).endsWith("/verify")) {
        return { ok: false, status: 500, statusText: "Internal Server Error" } as Response
      }
      return mockImageFetch()
    })

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].confidence).toBe("unknown")
    expect(data[0].similarityScore).toBe(0.5) // 1 - distance(0.5)
  })

  it("returns Railway-verified results sorted by score, descending", async () => {
    process.env.RAILWAY_API_URL = "https://railway.example.com"
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: "https://r2.example.com/seg1.jpg" })
    )
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ has_embedding: true }])
      .mockResolvedValueOnce([
        {
          id: "photo-low",
          filename: "low.jpg",
          url: "https://r2.example.com/low.jpg",
          croppedUrl: null,
          segmentedUrl: "https://r2.example.com/seg-low.jpg",
          title: null,
          description: null,
          takenAt: null,
          latitude: null,
          longitude: null,
          individualId: null,
          individualName: null,
          distance: 0.4,
        },
        {
          id: "photo-high",
          filename: "high.jpg",
          url: "https://r2.example.com/high.jpg",
          croppedUrl: null,
          segmentedUrl: "https://r2.example.com/seg-high.jpg",
          title: null,
          description: null,
          takenAt: null,
          latitude: null,
          longitude: null,
          individualId: null,
          individualName: null,
          distance: 0.6,
        },
      ])
    vi.mocked(global.fetch).mockImplementation(async (url) => {
      if (String(url).endsWith("/verify")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            results: [
              {
                candidate_index: 0,
                is_same: true,
                score: 0.4,
                confidence: "medium",
                cosine_similarity: 0.6,
                matches: 12,
                inliers: 10,
              },
              {
                candidate_index: 1,
                is_same: true,
                score: 0.9,
                confidence: "high",
                cosine_similarity: 0.4,
                matches: 30,
                inliers: 28,
              },
            ],
          }),
        } as Response
      }
      return mockImageFetch()
    })

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    // Sorted by score descending: photo-high (0.9) before photo-low (0.4)
    expect(data[0]).toMatchObject({ id: "photo-high", similarityScore: 0.9, confidence: "high" })
    expect(data[1]).toMatchObject({ id: "photo-low", similarityScore: 0.4, confidence: "medium" })
  })

  it("restricts candidates to photos already linked to an individual when linkedOnly is set", async () => {
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(
      createMockPhoto({ id: "photo-1", segmentedUrl: "https://r2.example.com/seg1.jpg" })
    )
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ has_embedding: true }])
      .mockResolvedValueOnce([])

    const response = await makeGetRequest("photo-1", "?linkedOnly=1")

    expect(response.status).toBe(200)
    const secondCallArg = vi.mocked(prisma.$queryRaw).mock.calls[1][0] as { sql: string }
    expect(secondCallArg.sql).toContain(`"individualId" IS NOT NULL`)
  })

  it("returns 500 when an unexpected error occurs", async () => {
    vi.mocked(prisma.photo.findFirst).mockRejectedValue(new Error("DB connection lost"))

    const response = await makeGetRequest("photo-1")
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to find similar photos")
  })
})
