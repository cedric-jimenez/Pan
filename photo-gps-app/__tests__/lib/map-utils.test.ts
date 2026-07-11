import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { distanceKm, withinDateFilter, nameOf } from "@/lib/map-utils"
import type { Photo } from "@/types/photo"

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "p1",
    userId: "u1",
    individualId: null,
    filename: "p1.jpg",
    originalName: "p1.jpg",
    fileSize: 100,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: "u",
    croppedUrl: null,
    segmentedUrl: null,
    latitude: null,
    longitude: null,
    takenAt: null,
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    title: null,
    description: null,
    isCropped: false,
    cropConfidence: null,
    salamanderDetected: false,
    individual: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("distanceKm", () => {
  it("is zero for identical coordinates", () => {
    expect(distanceKm(48, 4, 48, 4)).toBe(0)
  })

  it("approximates a known distance (~1 degree of latitude ≈ 111 km)", () => {
    const d = distanceKm(0, 0, 1, 0)
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })

  it("is symmetric", () => {
    const a = distanceKm(48.1, 4.2, 49.3, 5.1)
    const b = distanceKm(49.3, 5.1, 48.1, 4.2)
    expect(a).toBeCloseTo(b, 10)
  })
})

describe("withinDateFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("always matches when preset is 'all'", () => {
    const photo = makePhoto({ takenAt: null, createdAt: "2000-01-01T00:00:00.000Z" })
    expect(withinDateFilter(photo, "all", "", "")).toBe(true)
  })

  it("returns false when there is no takenAt or createdAt", () => {
    const photo = makePhoto({ takenAt: null, createdAt: null as unknown as string })
    expect(withinDateFilter(photo, "24h", "", "")).toBe(false)
  })

  it("falls back to createdAt when takenAt is missing", () => {
    const photo = makePhoto({ takenAt: null, createdAt: "2026-07-09T10:00:00.000Z" })
    expect(withinDateFilter(photo, "24h", "", "")).toBe(true)
  })

  it("matches within the last 24h and excludes older photos", () => {
    const recent = makePhoto({ takenAt: "2026-07-09T01:00:00.000Z" })
    const old = makePhoto({ takenAt: "2026-07-01T00:00:00.000Z" })
    expect(withinDateFilter(recent, "24h", "", "")).toBe(true)
    expect(withinDateFilter(old, "24h", "", "")).toBe(false)
  })

  it("matches within the last 7d and excludes older photos", () => {
    const recent = makePhoto({ takenAt: "2026-07-03T12:00:00.000Z" })
    const old = makePhoto({ takenAt: "2026-06-01T00:00:00.000Z" })
    expect(withinDateFilter(recent, "7d", "", "")).toBe(true)
    expect(withinDateFilter(old, "7d", "", "")).toBe(false)
  })

  it("matches within the last 30d and excludes older photos", () => {
    const recent = makePhoto({ takenAt: "2026-06-15T12:00:00.000Z" })
    const old = makePhoto({ takenAt: "2026-01-01T00:00:00.000Z" })
    expect(withinDateFilter(recent, "30d", "", "")).toBe(true)
    expect(withinDateFilter(old, "30d", "", "")).toBe(false)
  })

  describe("custom range", () => {
    it("matches a date within an open-ended custom range", () => {
      const photo = makePhoto({ takenAt: "2026-05-01T00:00:00.000Z" })
      expect(withinDateFilter(photo, "custom", "", "")).toBe(true)
    })

    it("excludes dates before customStart", () => {
      const photo = makePhoto({ takenAt: "2026-01-01T00:00:00.000Z" })
      expect(withinDateFilter(photo, "custom", "2026-02-01", "")).toBe(false)
    })

    it("includes dates on customStart", () => {
      const photo = makePhoto({ takenAt: "2026-02-01T06:00:00.000Z" })
      expect(withinDateFilter(photo, "custom", "2026-02-01", "")).toBe(true)
    })

    it("includes the entirety of the customEnd day", () => {
      const photo = makePhoto({ takenAt: "2026-02-05T23:00:00.000Z" })
      expect(withinDateFilter(photo, "custom", "", "2026-02-05")).toBe(true)
    })

    it("excludes dates more than one day past customEnd", () => {
      const photo = makePhoto({ takenAt: "2026-02-07T00:00:00.000Z" })
      expect(withinDateFilter(photo, "custom", "", "2026-02-05")).toBe(false)
    })

    it("respects both bounds together", () => {
      const inRange = makePhoto({ takenAt: "2026-02-03T00:00:00.000Z" })
      const before = makePhoto({ takenAt: "2026-01-01T00:00:00.000Z" })
      const after = makePhoto({ takenAt: "2026-03-01T00:00:00.000Z" })
      expect(withinDateFilter(inRange, "custom", "2026-02-01", "2026-02-05")).toBe(true)
      expect(withinDateFilter(before, "custom", "2026-02-01", "2026-02-05")).toBe(false)
      expect(withinDateFilter(after, "custom", "2026-02-01", "2026-02-05")).toBe(false)
    })
  })
})

describe("nameOf", () => {
  it("prefers the individual's name", () => {
    const photo = makePhoto({
      individual: { id: "i1", name: "Nebula" },
      title: "A title",
      originalName: "orig.jpg",
    })
    expect(nameOf(photo)).toBe("Nebula")
  })

  it("falls back to title when there is no individual", () => {
    const photo = makePhoto({ individual: null, title: "A title", originalName: "orig.jpg" })
    expect(nameOf(photo)).toBe("A title")
  })

  it("falls back to originalName when neither individual nor title exist", () => {
    const photo = makePhoto({ individual: null, title: null, originalName: "orig.jpg" })
    expect(nameOf(photo)).toBe("orig.jpg")
  })
})
