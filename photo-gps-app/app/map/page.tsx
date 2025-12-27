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

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-muted rounded-lg flex items-center justify-center">
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
      console.error("Failed to fetch photos:", error)
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
    setPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
    )
    setFilteredPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
    )
    setSelectedPhoto(updatedPhoto)
  }

  const handlePhotoDelete = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setFilteredPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setSelectedPhoto(null)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Map View</h1>
          <p className="text-muted-foreground">
            Explore your photos on an interactive map
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Filter by Date Range</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
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
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {photosWithLocation.length} photo
              {photosWithLocation.length !== 1 ? "s" : ""} with GPS data
            </p>
          )}
        </div>

        {/* Map */}
        <MapView
          photos={filteredPhotos}
          onPhotoClick={(photo: Photo) => setSelectedPhoto(photo)}
        />

        {photos.length > 0 && photosWithLocation.length === 0 && (
          <div className="mt-8 text-center py-8 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground">
              None of your photos in this date range have GPS location data.
              Upload photos with GPS information to see them on the map.
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
