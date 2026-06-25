"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Photo } from "@/types/photo"
import HeatmapLayer from "./HeatmapLayer"

// Fix default marker icons (same pattern as MapView.tsx)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export type Basemap = "street" | "satellite" | "heatmap"

interface FlyTarget {
  lat: number
  lng: number
  zoom?: number
}

interface ExplorerMapProps {
  photos: Photo[]
  basemap: Basemap
  flyTo: FlyTarget | null
  onSelect: (photo: Photo) => void
}

const DEFAULT_CENTER: [number, number] = [46.8, 4.5]

function withGps(p: Photo): p is Photo & { latitude: number; longitude: number } {
  return p.latitude !== null && p.longitude !== null
}

function centroidOf(points: { lat: number; lng: number }[]): [number, number] | null {
  if (points.length === 0) return null
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return [lat, lng]
}

/** Recenters on the markers' centroid once they have loaded. */
function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 12)
  }, [center, map])
  return null
}

/** Flies to an explicit target (selection / locate). */
function FlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 14)
  }, [target, map])
  return null
}

export default function ExplorerMap({ photos, basemap, flyTo, onSelect }: ExplorerMapProps) {
  const located = useMemo(() => photos.filter(withGps), [photos])
  const centroid = useMemo(
    () => centroidOf(located.map((p) => ({ lat: p.latitude, lng: p.longitude }))),
    [located]
  )
  const heatPoints = useMemo<[number, number, number][]>(
    () => located.map((p) => [p.latitude, p.longitude, 1.0]),
    [located]
  )

  return (
    <MapContainer
      center={centroid ?? DEFAULT_CENTER}
      zoom={centroid ? 12 : 5}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      {basemap === "satellite" ? (
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}

      <ZoomControl position="bottomright" />
      <Recenter center={centroid} />
      <FlyTo target={flyTo} />

      {basemap === "heatmap" ? (
        <HeatmapLayer points={heatPoints} />
      ) : (
        located.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            eventHandlers={{ click: () => onSelect(p) }}
          >
            <Popup>{p.individual?.name ?? p.title ?? p.originalName}</Popup>
          </Marker>
        ))
      )}
    </MapContainer>
  )
}
