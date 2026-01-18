"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { format } from "date-fns"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Image from "next/image"
import { Photo } from "@/types/photo"
import HeatmapLayer from "./HeatmapLayer"

// Fix for default markers in react-leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

interface MapViewProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

export default function MapView({ photos, onPhotoClick }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [mapType, setMapType] = useState<"street" | "satellite" | "heatmap">("street")

  useEffect(() => {
    // Check if component is mounted on client-side for SSR compatibility
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const photosWithLocation = photos.filter(
    (photo) => photo.latitude !== null && photo.longitude !== null
  )

  if (!mounted) {
    return (
      <div className="bg-muted flex h-[600px] w-full items-center justify-center rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  if (photosWithLocation.length === 0) {
    return (
      <div className="bg-muted flex h-[600px] w-full items-center justify-center rounded-lg">
        <div className="text-center">
          <svg
            className="text-muted-foreground mx-auto mb-4 h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-muted-foreground">No photos with GPS location data found</p>
        </div>
      </div>
    )
  }

  // Calculate center of all markers
  const avgLat =
    photosWithLocation.reduce((sum, p) => sum + (p.latitude || 0), 0) / photosWithLocation.length
  const avgLng =
    photosWithLocation.reduce((sum, p) => sum + (p.longitude || 0), 0) / photosWithLocation.length

  // Prepare heatmap data
  const heatmapPoints: [number, number, number][] = photosWithLocation.map((photo) => [
    photo.latitude!,
    photo.longitude!,
    1.0, // intensity
  ])

  return (
    <div className="w-full space-y-3">
      {/* Map Type Toggle */}
      <div className="flex w-full gap-2">
        <button
          onClick={() => setMapType("street")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mapType === "street"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Street
        </button>
        <button
          onClick={() => setMapType("satellite")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mapType === "satellite"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setMapType("heatmap")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mapType === "heatmap"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Heatmap
        </button>
      </div>

      {/* Map Container */}
      <div className="border-border h-[600px] w-full overflow-hidden rounded-lg border">
        <MapContainer
          center={[avgLat, avgLng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          {/* Tile Layer based on map type */}
          {mapType === "satellite" ? (
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* Render heatmap or markers based on view type */}
          {mapType === "heatmap" ? (
            <HeatmapLayer points={heatmapPoints} />
          ) : (
            photosWithLocation.map((photo) => (
              <Marker key={photo.id} position={[photo.latitude!, photo.longitude!]}>
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="relative mb-2 h-32 w-full overflow-hidden rounded">
                      <Image
                        src={photo.url}
                        alt={photo.originalName}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    </div>
                    <h3 className="mb-1 font-semibold">{photo.title || photo.originalName}</h3>
                    {photo.takenAt && (
                      <p className="mb-2 text-sm text-gray-600">
                        {format(new Date(photo.takenAt), "PPp")}
                      </p>
                    )}
                    <button
                      onClick={() => onPhotoClick(photo)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))
          )}
        </MapContainer>
      </div>
    </div>
  )
}
