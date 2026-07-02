import { describe, it, expect } from "vitest"
import { convexHull, homeRangeHectares, sphericalPolygonArea } from "@/lib/home-range"

describe("convexHull", () => {
  it("returns input unchanged when fewer than 3 unique points", () => {
    expect(convexHull([])).toEqual([])
    expect(convexHull([{ lat: 1, lng: 1 }])).toHaveLength(1)
    expect(
      convexHull([
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ])
    ).toHaveLength(2)
  })

  it("drops interior points", () => {
    const hull = convexHull([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
      { lat: 5, lng: 5 }, // interior
    ])
    expect(hull).toHaveLength(4)
    expect(hull).not.toContainEqual({ lat: 5, lng: 5 })
  })

  it("deduplicates identical coordinates", () => {
    const hull = convexHull([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ])
    expect(hull).toHaveLength(2)
  })
})

describe("sphericalPolygonArea", () => {
  it("is zero for degenerate polygons", () => {
    expect(sphericalPolygonArea([{ lat: 0, lng: 0 }])).toBe(0)
    expect(
      sphericalPolygonArea([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
      ])
    ).toBe(0)
  })

  it("approximates a known small square near the equator", () => {
    // A ~0.001° square near the equator: 0.001° lat ≈ 111.2 m, similar in lng.
    const area = sphericalPolygonArea([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.001 },
      { lat: 0.001, lng: 0.001 },
      { lat: 0.001, lng: 0 },
    ])
    // Expected ≈ 111.2 m × 111.2 m ≈ 12 370 m². Allow a small tolerance.
    expect(area).toBeGreaterThan(12000)
    expect(area).toBeLessThan(12500)
  })
})

describe("homeRangeHectares", () => {
  it("returns null with fewer than 3 distinct points", () => {
    expect(homeRangeHectares([])).toBeNull()
    expect(homeRangeHectares([{ lat: 1, lng: 1 }])).toBeNull()
    expect(
      homeRangeHectares([
        { lat: 1, lng: 1 },
        { lat: 1, lng: 1 },
      ])
    ).toBeNull()
  })

  it("computes a ~1 ha square (100 m × 100 m) within tolerance", () => {
    // 100 m ≈ 0.0008983° of latitude; at 48°N, 100 m ≈ 0.0013449° of longitude.
    const dLat = 0.0008983
    const dLng = 0.0013449
    const lat = 48
    const lng = 4
    const ha = homeRangeHectares([
      { lat, lng },
      { lat, lng: lng + dLng },
      { lat: lat + dLat, lng: lng + dLng },
      { lat: lat + dLat, lng },
    ])
    expect(ha).not.toBeNull()
    expect(ha as number).toBeGreaterThan(0.9)
    expect(ha as number).toBeLessThan(1.1)
  })

  it("ignores interior points (hull-based)", () => {
    const outer: { lat: number; lng: number }[] = [
      { lat: 48.0, lng: 4.0 },
      { lat: 48.0, lng: 4.002 },
      { lat: 48.002, lng: 4.002 },
      { lat: 48.002, lng: 4.0 },
    ]
    const withInterior = [...outer, { lat: 48.001, lng: 4.001 }]
    expect(homeRangeHectares(outer)).toBeCloseTo(homeRangeHectares(withInterior) as number, 5)
  })
})
