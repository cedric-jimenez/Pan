"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format, parseISO, startOfDay } from "date-fns"
import { fr } from "date-fns/locale"
import Navbar from "@/components/Navbar"
import PhotoUpload from "@/components/PhotoUpload"
import PhotoGrid, { GridSize } from "@/components/PhotoGrid"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import { Photo } from "@/types/photo"

type SortBy = 'date' | 'title' | 'size' | 'camera'
type SortOrder = 'asc' | 'desc'

export default function GalleryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gridSize, setGridSize] = useState<GridSize>('medium')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Load preferences from localStorage
  useEffect(() => {
    const savedGridSize = localStorage.getItem('galleryGridSize')
    if (savedGridSize && (savedGridSize === 'small' || savedGridSize === 'medium' || savedGridSize === 'large')) {
      setGridSize(savedGridSize as GridSize)
    }

    const savedSortBy = localStorage.getItem('gallerySortBy')
    if (savedSortBy && ['date', 'title', 'size', 'camera'].includes(savedSortBy)) {
      setSortBy(savedSortBy as SortBy)
    }

    const savedSortOrder = localStorage.getItem('gallerySortOrder')
    if (savedSortOrder && (savedSortOrder === 'asc' || savedSortOrder === 'desc')) {
      setSortOrder(savedSortOrder as SortOrder)
    }
  }, [])

  // Save grid size to localStorage
  const handleGridSizeChange = (size: GridSize) => {
    setGridSize(size)
    localStorage.setItem('galleryGridSize', size)
  }

  // Save sort preference to localStorage
  const handleSortChange = (newSortBy: SortBy) => {
    setSortBy(newSortBy)
    localStorage.setItem('gallerySortBy', newSortBy)
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    setSortOrder(newOrder)
    localStorage.setItem('gallerySortOrder', newOrder)
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchPhotos = async () => {
    try {
      const response = await fetch("/api/photos")
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.photos)
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

  const handlePhotoUpdate = async (updatedPhoto: Photo) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
    )
    setSelectedPhoto(updatedPhoto)
  }

  const handlePhotoDelete = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setSelectedPhoto(null)
  }

  // Group photos by day with sorting
  const photosByDay = useMemo(() => {
    // Sort photos based on selected criteria
    const sortedPhotos = [...photos].sort((a, b) => {
      let compareResult = 0

      switch (sortBy) {
        case 'date':
          const dateA = a.takenAt ? new Date(a.takenAt) : new Date(a.createdAt)
          const dateB = b.takenAt ? new Date(b.takenAt) : new Date(b.createdAt)
          compareResult = dateB.getTime() - dateA.getTime()
          break

        case 'title':
          const titleA = (a.title || a.originalName).toLowerCase()
          const titleB = (b.title || b.originalName).toLowerCase()
          compareResult = titleA.localeCompare(titleB)
          break

        case 'size':
          compareResult = b.fileSize - a.fileSize
          break

        case 'camera':
          const cameraA = (a.cameraModel || a.cameraMake || '').toLowerCase()
          const cameraB = (b.cameraModel || b.cameraMake || '').toLowerCase()
          compareResult = cameraA.localeCompare(cameraB)
          break
      }

      // Apply sort order
      return sortOrder === 'asc' ? -compareResult : compareResult
    })

    // Group by day
    const groups = new Map<string, Photo[]>()

    sortedPhotos.forEach((photo) => {
      const photoDate = photo.takenAt ? new Date(photo.takenAt) : new Date(photo.createdAt)
      const dayKey = format(startOfDay(photoDate), 'yyyy-MM-dd')

      if (!groups.has(dayKey)) {
        groups.set(dayKey, [])
      }
      groups.get(dayKey)!.push(photo)
    })

    return Array.from(groups.entries()).map(([dateKey, photos]) => ({
      date: parseISO(dateKey),
      photos
    }))
  }, [photos, sortBy, sortOrder])

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Photo Gallery</h1>
          <p className="text-muted-foreground">
            Upload and manage your photos with GPS and timeline data
          </p>
        </div>

        <div className="mb-8">
          <PhotoUpload onUploadComplete={fetchPhotos} />
        </div>

        {photos.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {photos.length} photo{photos.length > 1 ? 's' : ''}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tri :</span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortBy)}
                  className="px-3 py-1.5 text-sm bg-muted border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="date">Date</option>
                  <option value="title">Titre</option>
                  <option value="size">Taille</option>
                  <option value="camera">Appareil</option>
                </select>

                {/* Sort order toggle */}
                <button
                  onClick={toggleSortOrder}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  title={sortOrder === 'desc' ? 'Décroissant' : 'Croissant'}
                >
                  {sortOrder === 'desc' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Grid size selector */}
              <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Taille :</span>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => handleGridSizeChange('small')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    gridSize === 'small'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Petites vignettes"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleGridSizeChange('medium')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    gridSize === 'medium'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Vignettes moyennes"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleGridSizeChange('large')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    gridSize === 'large'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grandes vignettes"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {photos.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-24 h-24 mx-auto text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-medium mb-2">No photos yet</h3>
            <p className="text-muted-foreground">
              Upload your first photo to get started
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {photosByDay.map(({ date, photos }) => (
              <div key={format(date, 'yyyy-MM-dd')}>
                {/* Date header */}
                <div className="mb-4 pb-2 border-b border-border">
                  <h2 className="text-xl font-semibold">
                    {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {photos.length} photo{photos.length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Photos grid */}
                <PhotoGrid
                  photos={photos}
                  onPhotoClick={(photo: Photo) => setSelectedPhoto(photo)}
                  gridSize={gridSize}
                />
              </div>
            ))}
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
