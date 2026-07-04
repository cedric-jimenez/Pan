import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as BY_DAY } from "@/app/api/photos/by-day/route"
import { GET as COUNTS_BY_DAY } from "@/app/api/photos/counts-by-day/route"
import { GET as IDS_BY_DAY } from "@/app/api/photos/ids-by-day/route"
import { GET as STATS } from "@/app/api/photos/stats/route"
import { createMockPhoto } from "../../fixtures/photo"

function makeAggregateResult(sums: {
  fileSize: number | null
  croppedFileSize: number | null
  segmentedFileSize: number | null
}) {
  return {
    _sum: sums,
    _count: {},
    _avg: {},
    _min: {},
    _max: {},
  } as Awaited<ReturnType<typeof prisma.photo.aggregate>>
}

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(mockUser)
})

describe("GET /api/photos/by-day", () => {
  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await BY_DAY(new Request("http://localhost:3000/api/photos/by-day?date=2024-01-15"))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects a missing date", async () => {
    const response = await BY_DAY(new Request("http://localhost:3000/api/photos/by-day"))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/date parameter/)
  })

  it("rejects a malformed date", async () => {
    const response = await BY_DAY(
      new Request("http://localhost:3000/api/photos/by-day?date=15-01-2024")
    )

    expect(response.status).toBe(400)
  })

  it("returns photos for the requested day scoped to the user", async () => {
    const photos = [createMockPhoto({ id: "photo-1" })]
    vi.mocked(prisma.photo.findMany).mockResolvedValue(photos)

    const response = await BY_DAY(
      new Request("http://localhost:3000/api/photos/by-day?date=2024-01-15")
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.photos).toHaveLength(1)
    expect(prisma.photo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-123" }) })
    )
  })

  it("combines the day filter with a search filter using AND", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    await BY_DAY(
      new Request("http://localhost:3000/api/photos/by-day?date=2024-01-15&search=canon")
    )

    expect(prisma.photo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.anything() }),
      })
    )
    expect(prisma.photo.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.anything() }) })
    )
  })

  it("sorts by title when requested", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    await BY_DAY(
      new Request("http://localhost:3000/api/photos/by-day?date=2024-01-15&sortBy=title&sortOrder=asc")
    )

    expect(prisma.photo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "asc" }, { originalName: "asc" }] })
    )
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.photo.findMany).mockRejectedValue(new Error("DB down"))

    const response = await BY_DAY(
      new Request("http://localhost:3000/api/photos/by-day?date=2024-01-15")
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch photos")
  })
})

describe("GET /api/photos/counts-by-day", () => {
  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await COUNTS_BY_DAY(new Request("http://localhost:3000/api/photos/counts-by-day"))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("groups photos by day, preferring takenAt over createdAt", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      createMockPhoto({
        takenAt: new Date("2024-01-15T10:00:00Z"),
        createdAt: new Date("2024-01-20T00:00:00Z"),
      }),
      createMockPhoto({
        takenAt: new Date("2024-01-15T18:00:00Z"),
        createdAt: new Date("2024-01-20T00:00:00Z"),
      }),
      createMockPhoto({ takenAt: null, createdAt: new Date("2024-01-16T00:00:00Z") }),
    ])

    const response = await COUNTS_BY_DAY(new Request("http://localhost:3000/api/photos/counts-by-day"))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.counts).toEqual(
      expect.arrayContaining([
        { date: "2024-01-15", count: 2 },
        { date: "2024-01-16", count: 1 },
      ])
    )
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.photo.findMany).mockRejectedValue(new Error("DB down"))

    const response = await COUNTS_BY_DAY(new Request("http://localhost:3000/api/photos/counts-by-day"))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch photo counts")
  })
})

describe("GET /api/photos/ids-by-day", () => {
  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await IDS_BY_DAY(
      new Request("http://localhost:3000/api/photos/ids-by-day?date=2024-01-15")
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects a missing or malformed date", async () => {
    const response = await IDS_BY_DAY(new Request("http://localhost:3000/api/photos/ids-by-day"))

    expect(response.status).toBe(400)
  })

  it("returns matching photo ids and count", async () => {
    vi.mocked(prisma.photo.findMany).mockResolvedValue([
      createMockPhoto({ id: "photo-1" }),
      createMockPhoto({ id: "photo-2" }),
    ])

    const response = await IDS_BY_DAY(
      new Request("http://localhost:3000/api/photos/ids-by-day?date=2024-01-15")
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ photoIds: ["photo-1", "photo-2"], count: 2 })
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.photo.findMany).mockRejectedValue(new Error("DB down"))

    const response = await IDS_BY_DAY(
      new Request("http://localhost:3000/api/photos/ids-by-day?date=2024-01-15")
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch photo IDs")
  })
})

describe("GET /api/photos/stats", () => {
  beforeEach(() => {
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.aggregate).mockResolvedValue(
      makeAggregateResult({ fileSize: null, croppedFileSize: null, segmentedFileSize: null })
    )
  })

  it("requires authentication", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await STATS(new Request("http://localhost:3000/api/photos/stats"))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("aggregates totals scoped to the current user", async () => {
    vi.mocked(prisma.photo.count)
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(6) // withGPS
      .mockResolvedValueOnce(4) // withEXIF
      .mockResolvedValueOnce(3) // cropped
    vi.mocked(prisma.photo.aggregate).mockResolvedValue(
      makeAggregateResult({ fileSize: 1000, croppedFileSize: 200, segmentedFileSize: 100 })
    )

    const response = await STATS(new Request("http://localhost:3000/api/photos/stats"))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ total: 10, withGPS: 6, withEXIF: 4, cropped: 3, totalStorage: 1300 })
  })

  it("treats missing storage sums as zero", async () => {
    const response = await STATS(new Request("http://localhost:3000/api/photos/stats"))
    const data = await response.json()

    expect(data.totalStorage).toBe(0)
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.photo.count).mockRejectedValue(new Error("DB down"))

    const response = await STATS(new Request("http://localhost:3000/api/photos/stats"))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to fetch photo stats")
  })
})
