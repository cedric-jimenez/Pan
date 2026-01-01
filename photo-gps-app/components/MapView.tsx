"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { format } from "date-fns"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Image from "next/image"
import { Photo } from "@/types/photo"

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
      <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  if (photosWithLocation.length === 0) {
    return (
      <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground mb-4"
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
          <p className="text-muted-foreground">
            No photos with GPS location data found
          </p>
        </div>
      </div>
    )
  }

  // Calculate center of all markers
  const avgLat =
    photosWithLocation.reduce((sum, p) => sum + (p.latitude || 0), 0) /
    photosWithLocation.length
  const avgLng =
    photosWithLocation.reduce((sum, p) => sum + (p.longitude || 0), 0) /
    photosWithLocation.length

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {photosWithLocation.map((photo) => (
          <Marker
            key={photo.id}
            position={[photo.latitude!, photo.longitude!]}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="relative w-full h-32 mb-2 rounded overflow-hidden">
                  <Image
                    src={photo.url}
                    alt={photo.originalName}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <h3 className="font-semibold mb-1">
                  {photo.title || photo.originalName}
                </h3>
                {photo.takenAt && (
                  <p className="text-sm text-gray-600 mb-2">
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
        ))}
      </MapContainer>
    </div>
  )
}
