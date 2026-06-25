"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import HeatmapLayer from "./HeatmapLayer"

// Fix default marker icons (same pattern as MapView.tsx)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
}

interface LandingMapProps {
  points: MapPoint[]
}

const DEFAULT_CENTER: [number, number] = [46.8, 4.5]
const MARKER_ZOOM = 13

/** Centroid of all markers, same approach as the Map page. */
function centroidOf(points: MapPoint[]): [number, number] | null {
  if (points.length === 0) return null
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length
  return [lat, lng]
}

/** Recenters on the markers' centroid once they have loaded. */
function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, MARKER_ZOOM)
  }, [center, map])
  return null
}

export default function LandingMap({ points }: LandingMapProps) {
  const centroid = useMemo(() => centroidOf(points), [points])
  const heatPoints = useMemo<[number, number, number][]>(
    () => points.map((p) => [p.lat, p.lng, 1.0]),
    [points]
  )

  return (
    <MapContainer
      center={centroid ?? DEFAULT_CENTER}
      zoom={centroid ? MARKER_ZOOM : 5}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={centroid} />
      <HeatmapLayer points={heatPoints} />
    </MapContainer>
  )
}
