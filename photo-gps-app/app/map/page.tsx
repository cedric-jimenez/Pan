"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Navbar from "@/components/Navbar"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import Input from "@/components/Input"
import Button from "@/components/Button"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-[600px] w-full items-center justify-center rounded-lg">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
})

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchPhotos = async (start?: string, end?: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (start) params.append("startDate", start)
      if (end) params.append("endDate", end)

      const response = await fetch(`/api/photos?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.photos)
        setFilteredPhotos(data.photos)
      }
    } catch (error) {
      logger.error("Failed to fetch photos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchPhotos()
    }
  }, [session])

  const handleFilter = () => {
    fetchPhotos(startDate, endDate)
  }

  const handleClearFilter = () => {
    setStartDate("")
    setEndDate("")
    fetchPhotos()
  }

  const handlePhotoUpdate = async (updatedPhoto: Photo) => {
    setPhotos((prev) => prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)))
    setFilteredPhotos((prev) => prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)))
    setSelectedPhoto(updatedPhoto)
  }

  const handlePhotoDelete = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setFilteredPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setSelectedPhoto(null)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const photosWithLocation = filteredPhotos.filter(
    (photo) => photo.latitude !== null && photo.longitude !== null
  )

  return (
    <div className="bg-background min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Map View</h1>
          <p className="text-muted-foreground">Explore your salamander observations on an interactive map</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-card border-border mb-6 rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Filter by Date Range</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleFilter} variant="primary">
                Apply Filter
              </Button>
              <Button onClick={handleClearFilter} variant="secondary">
                Clear
              </Button>
            </div>
          </div>
          {photosWithLocation.length > 0 && (
            <p className="text-muted-foreground mt-4 text-sm">
              Showing {photosWithLocation.length} photo
              {photosWithLocation.length !== 1 ? "s" : ""} with GPS data
            </p>
          )}
        </div>

        {/* Map */}
        <MapView photos={filteredPhotos} onPhotoClick={(photo: Photo) => setSelectedPhoto(photo)} />

        {photos.length > 0 && photosWithLocation.length === 0 && (
          <div className="bg-card border-border mt-8 rounded-lg border py-8 text-center">
            <p className="text-muted-foreground">
              None of your photos in this date range have GPS location data. Upload photos with GPS
              information to see them on the map.
            </p>
          </div>
        )}
      </main>

      {selectedPhoto && (
        <PhotoDetailsModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onUpdate={handlePhotoUpdate}
          onDelete={handlePhotoDelete}
        />
      )}
    </div>
  )
}
