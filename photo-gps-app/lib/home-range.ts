/**
 * Home-range surface estimation from geolocated observations.
 *
 * Uses the Minimum Convex Polygon (MCP) method — the standard first-order
 * home-range estimator in ecology: build the convex hull of all observation
 * points, then measure its geodesic area.
 */

export interface GeoPoint {
  lat: number
  lng: number
}

// Mean Earth radius (meters), matching the WGS-84 authalic radius used by
// most mapping libraries for spherical area computations.
const EARTH_RADIUS_M = 6371008.8

const toRad = (deg: number): number => (deg * Math.PI) / 180

/** 2D cross product of OA × OB (x = lng, y = lat). */
function cross(o: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)
}

/**
 * Convex hull via Andrew's monotone chain. Returns hull vertices in
 * counter-clockwise order (no repeated last point). Fewer than 3 unique
 * points yields the deduplicated input as-is.
 */
export function convexHull(points: GeoPoint[]): GeoPoint[] {
  // Deduplicate identical coordinates.
  const unique = Array.from(
    new Map(points.map((p) => [`${p.lat},${p.lng}`, p])).values()
  )

  if (unique.length < 3) return unique

  const sorted = [...unique].sort((a, b) => a.lng - b.lng || a.lat - b.lat)

  const lower: GeoPoint[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: GeoPoint[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Drop each list's last point (shared with the other list's first).
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/**
 * Geodesic area of a polygon (spherical excess formula, same as Google Maps'
 * computeSignedArea). `ring` is an ordered list of vertices; the polygon is
 * implicitly closed. Returns the absolute area in square meters.
 */
export function sphericalPolygonArea(ring: GeoPoint[]): number {
  if (ring.length < 3) return 0

  let total = 0
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i]
    const p2 = ring[(i + 1) % ring.length]
    total +=
      (toRad(p2.lng) - toRad(p1.lng)) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)))
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
}

/**
 * Estimated home-range surface in hectares from observation points, using the
 * Minimum Convex Polygon method. Returns `null` when there are fewer than 3
 * distinct points (a surface cannot be defined).
 */
export function homeRangeHectares(points: GeoPoint[]): number | null {
  const hull = convexHull(points)
  if (hull.length < 3) return null
  return sphericalPolygonArea(hull) / 10_000
}
