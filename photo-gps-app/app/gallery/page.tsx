"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
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
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [gridSize, setGridSize] = useState<GridSize>('medium')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [dayToDelete, setDayToDelete] = useState<{ date: Date; photos: Photo[] } | null>(null)
  const [isDeletingDay, setIsDeletingDay] = useState(false)

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchPhotos = useCallback(async (pageNum: number, append = false, silent = false) => {
    try {
      if (append) {
        setIsLoadingMore(true)
      } else if (!silent) {
        setIsLoading(true)
      }

      // Build query params with sorting, search, and pagination
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        page: pageNum.toString(),
        limit: '20',
      })

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const response = await fetch(`/api/photos?${params}`)
      if (response.ok) {
        const data = await response.json()

        if (append) {
          setPhotos((prev) => [...prev, ...data.photos])
        } else {
          setPhotos(data.photos)
        }

        setHasMore(data.pagination.hasMore)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [sortBy, sortOrder, searchQuery])

  // Reset to page 1 and fetch when filters change
  useEffect(() => {
    if (session) {
      setPage(1)
      setPhotos([])
      fetchPhotos(1, false)
    }
  }, [session, sortBy, sortOrder, searchQuery, fetchPhotos])

  // Load more photos when page changes (for infinite scroll)
  useEffect(() => {
    if (session && page > 1) {
      fetchPhotos(page, true)
    }
  }, [page, session, fetchPhotos])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoading || !hasMore) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          setPage((prev) => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isLoading, isLoadingMore, hasMore])

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

  const handleDayDelete = async (dayPhotos: Photo[]) => {
    setIsDeletingDay(true)
    try {
      const photoIds = dayPhotos.map((p) => p.id)
      const response = await fetch("/api/photos/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds }),
      })

      if (response.ok) {
        // Remove deleted photos from state
        setPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)))
        setTotal((prev) => prev - photoIds.length)
        setDayToDelete(null)
      } else {
        const data = await response.json()
        alert(`Erreur lors de la suppression : ${data.error || "Erreur inconnue"}`)
      }
    } catch (error) {
      console.error("Failed to delete day:", error)
      alert("Erreur lors de la suppression de la journée")
    } finally {
      setIsDeletingDay(false)
    }
  }

  // Group photos by day (photos are already sorted by API)
  const photosByDay = useMemo(() => {
    const groups = new Map<string, Photo[]>()

    photos.forEach((photo) => {
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
  }, [photos])

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
      <Navbar onSearch={setSearchInput} searchQuery={searchInput} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Photo Gallery</h1>
          <p className="text-muted-foreground">
            Upload and manage your photos with GPS and timeline data
          </p>
        </div>

        <div className="mb-8">
          <PhotoUpload onUploadComplete={() => {
            setPage(1)
            fetchPhotos(1, false, true)
          }} />
        </div>

        {photos.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {photos.length} / {total} photo{total > 1 ? 's' : ''}
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
                <div className="mb-4 pb-2 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {photos.length} photo{photos.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setDayToDelete({ date, photos })}
                    className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2"
                    title="Supprimer cette journée"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer la journée
                  </button>
                </div>

                {/* Photos grid */}
                <PhotoGrid
                  photos={photos}
                  onPhotoClick={(photo: Photo) => setSelectedPhoto(photo)}
                  gridSize={gridSize}
                />
              </div>
            ))}

            {/* Infinite scroll trigger and loading indicator */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                )}
              </div>
            )}

            {/* End of results indicator */}
            {!hasMore && photos.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Toutes les photos ont été chargées</p>
              </div>
            )}
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

      {/* Delete Day Confirmation Modal */}
      {dayToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les photos du{' '}
              <strong className="text-foreground">
                {format(dayToDelete.date, 'd MMMM yyyy', { locale: fr })}
              </strong>
              {' '}?
              <br />
              <br />
              <strong className="text-destructive">
                {dayToDelete.photos.length} photo{dayToDelete.photos.length > 1 ? 's' : ''} ser{dayToDelete.photos.length > 1 ? 'ont' : 'a'} définitivement supprimée{dayToDelete.photos.length > 1 ? 's' : ''}.
              </strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDayToDelete(null)}
                disabled={isDeletingDay}
                className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDayDelete(dayToDelete.photos)}
                disabled={isDeletingDay}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingDay ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-destructive-foreground border-t-transparent rounded-full"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
