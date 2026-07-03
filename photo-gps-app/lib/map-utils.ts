import { Photo } from "@/types/photo"

export type DatePreset = "24h" | "7d" | "30d" | "all" | "custom"

/** Great-circle distance in km (Haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function withinDateFilter(
  photo: Photo,
  preset: DatePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (preset === "all") return true
  const when = photo.takenAt ?? photo.createdAt
  if (!when) return false
  const t = new Date(when).getTime()

  if (preset === "custom") {
    if (customStart && t < new Date(customStart).getTime()) return false
    // Include the whole end day (end of day = start + 24h).
    if (customEnd && t > new Date(customEnd).getTime() + 86_400_000) return false
    return true
  }

  const days = preset === "24h" ? 1 : preset === "7d" ? 7 : 30
  return Date.now() - t <= days * 86_400_000
}

export function nameOf(p: Photo): string {
  return p.individual?.name ?? p.title ?? p.originalName
}
