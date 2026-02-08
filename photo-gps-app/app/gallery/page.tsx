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
import DayDownloadModal from "@/components/DayDownloadModal"
import BulkProcessModal from "@/components/BulkProcessModal"
import StatsCards from "@/components/StatsCards"
import { Photo } from "@/types/photo"
import { PAGINATION } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

export default function GalleryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [gridSize, setGridSize] = useState<GridSize>("medium")
  const [sortBy, setSortBy] = useState<SortBy>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [dayToDelete, setDayToDelete] = useState<{ date: Date; photos: Photo[]; totalCount: number } | null>(null)
  const [isDeletingDay, setIsDeletingDay] = useState(false)
  const [dayToDownload, setDayToDownload] = useState<{ date: Date; photos: Photo[] } | null>(null)
  const [dayToProcess, setDayToProcess] = useState<{ date: Date } | null>(null)
  const isInitialLoad = useRef(true)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [photoCountsByDay, setPhotoCountsByDay] = useState<Map<string, number>>(new Map())
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null)

  // Load preferences from localStorage
  useEffect(() => {
    const savedGridSize = localStorage.getItem("galleryGridSize")
    if (
      savedGridSize &&
      (savedGridSize === "small" || savedGridSize === "medium" || savedGridSize === "large")
    ) {
      setGridSize(savedGridSize as GridSize)
    }

    const savedSortBy = localStorage.getItem("gallerySortBy")
    if (savedSortBy && ["date", "title", "size", "camera"].includes(savedSortBy)) {
      setSortBy(savedSortBy as SortBy)
    }

    const savedSortOrder = localStorage.getItem("gallerySortOrder")
    if (savedSortOrder && (savedSortOrder === "asc" || savedSortOrder === "desc")) {
      setSortOrder(savedSortOrder as SortOrder)
    }

    const savedCollapsedDays = localStorage.getItem("galleryCollapsedDays")
    if (savedCollapsedDays) {
      try {
        const parsed = JSON.parse(savedCollapsedDays)
        if (Array.isArray(parsed)) {
          setCollapsedDays(new Set(parsed))
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  // Save grid size to localStorage
  const handleGridSizeChange = (size: GridSize) => {
    setGridSize(size)
    localStorage.setItem("galleryGridSize", size)
  }

  // Save sort preference to localStorage
  const handleSortChange = (newSortBy: SortBy) => {
    setSortBy(newSortBy)
    localStorage.setItem("gallerySortBy", newSortBy)
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc"
    setSortOrder(newOrder)
    localStorage.setItem("gallerySortOrder", newOrder)
  }

  // Toggle day collapse
  const toggleDayCollapse = (dayKey: string) => {
    setCollapsedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey)
      } else {
        newSet.add(dayKey)
      }
      localStorage.setItem("galleryCollapsedDays", JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  // Fetch photo counts by day from database
  const fetchPhotoCountsByDay = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim())
      }

      const response = await fetch(`/api/photos/counts-by-day?${params}`)
      if (response.ok) {
        const data = await response.json()
        const countsMap = new Map<string, number>()
        data.counts.forEach((item: { date: string; count: number }) => {
          countsMap.set(item.date, item.count)
        })
        setPhotoCountsByDay(countsMap)
      }
    } catch (error) {
      logger.error("Failed to fetch photo counts:", error)
    }
  }, [searchQuery])

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

  const fetchPhotos = useCallback(
    async (pageNum: number, append = false, silent = false) => {
      try {
        if (append) {
          setIsLoadingMore(true)
        } else if (!silent) {
          // Use searching state for filters/search, loading state for initial load
          if (isInitialLoad.current) {
            setIsLoading(true)
          } else {
            setIsSearching(true)
          }
        }

        // Build query params with sorting, search, and pagination
        const params = new URLSearchParams({
          sortBy,
          sortOrder,
          page: pageNum.toString(),
          limit: PAGINATION.PHOTOS_PER_PAGE.toString(),
        })

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim())
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
        logger.error("Failed to fetch photos:", error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        setIsSearching(false)
        isInitialLoad.current = false
      }
    },
    [sortBy, sortOrder, searchQuery]
  )

  // Reset to page 1 and fetch when filters change
  useEffect(() => {
    if (session) {
      setPage(1)
      // Don't clear photos to avoid flash of empty state
      fetchPhotos(1, false)
      fetchPhotoCountsByDay()
    }
  }, [session, sortBy, sortOrder, searchQuery, fetchPhotos, fetchPhotoCountsByDay])

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
    setPhotos((prev) => prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)))
    setSelectedPhoto(updatedPhoto)
  }

  const handlePhotoDelete = async (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    setTotal((prev) => prev - 1)
    fetchPhotoCountsByDay()
    setSelectedPhoto(null)
  }

  const handleDayDelete = async (dayDate: Date) => {
    setIsDeletingDay(true)
    try {
      // Fetch ALL photo IDs for this day from the API (not just loaded ones)
      const dayKey = format(dayDate, "yyyy-MM-dd")
      const idsResponse = await fetch(`/api/photos/ids-by-day?date=${dayKey}`)
      if (!idsResponse.ok) {
        const data = await idsResponse.json()
        alert(`Erreur lors de la récupération des photos : ${data.error || "Erreur inconnue"}`)
        return
      }

      const { photoIds } = await idsResponse.json()
      if (photoIds.length === 0) {
        setDayToDelete(null)
        return
      }

      // Delete in batches of 100 (API limit)
      const BATCH_SIZE = 100
      let deletedCount = 0

      for (let i = 0; i < photoIds.length; i += BATCH_SIZE) {
        const batch = photoIds.slice(i, i + BATCH_SIZE)
        const response = await fetchWithCsrf("/api/photos/bulk-delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoIds: batch }),
        })

        if (response.ok) {
          const data = await response.json()
          deletedCount += data.deletedCount
        } else {
          const data = await response.json()
          alert(`Erreur lors de la suppression : ${data.error || "Erreur inconnue"}`)
          break
        }
      }

      if (deletedCount > 0) {
        // Reload gallery from page 1 to reflect changes
        setPage(1)
        fetchPhotos(1, false, true)
        fetchPhotoCountsByDay()
        setDayToDelete(null)
      }
    } catch (error) {
      logger.error("Failed to delete day:", error)
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
      const dayKey = format(startOfDay(photoDate), "yyyy-MM-dd")

      if (!groups.has(dayKey)) {
        groups.set(dayKey, [])
      }
      groups.get(dayKey)!.push(photo)
    })

    return Array.from(groups.entries()).map(([dateKey, photos]) => ({
      date: parseISO(dateKey),
      photos,
    }))
  }, [photos])

  if (status === "loading" || (isLoading && isInitialLoad.current)) {
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

  return (
    <div className="bg-background min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Salamander Database</h1>
          <p className="text-muted-foreground">
            {total} individual{total > 1 ? "s" : ""} found
          </p>
        </div>

        <StatsCards photos={photos} total={total} />

        <div className="mb-8">
          <PhotoUpload
            onUploadComplete={() => {
              setPage(1)
              fetchPhotos(1, false, true)
              fetchPhotoCountsByDay()
            }}
          />
        </div>

        {/* Search and controls - always visible */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {photos.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {photos.length} / {total} photo{total > 1 ? "s" : ""}
            </p>
          )}
          {photos.length === 0 && total > 0 && (
            <p className="text-muted-foreground text-sm">0 / {total} photos</p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher..."
                className="bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring w-48 rounded-lg border-0 py-1.5 pr-9 pl-9 text-sm focus:ring-2 focus:outline-none"
              />
              <svg
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
                  title="Effacer la recherche"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Tri :</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortBy)}
                className="bg-muted text-foreground focus:ring-ring rounded-lg border-0 px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="date">Date</option>
                <option value="title">Titre</option>
                <option value="size">Taille</option>
                <option value="camera">Appareil</option>
              </select>

              {/* Sort order toggle */}
              <button
                onClick={toggleSortOrder}
                className="bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors"
                title={sortOrder === "desc" ? "Décroissant" : "Croissant"}
              >
                {sortOrder === "desc" ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Grid size selector */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground mr-2 text-sm">Taille :</span>
              <div className="bg-muted flex gap-1 rounded-lg p-1">
                <button
                  onClick={() => handleGridSizeChange("small")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    gridSize === "small"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Petites vignettes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleGridSizeChange("medium")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    gridSize === "medium"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vignettes moyennes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleGridSizeChange("large")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    gridSize === "large"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grandes vignettes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle loading indicator during search/filter */}
        {isSearching && (
          <div className="mb-4">
            <div className="bg-primary/20 h-1 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-1/3 animate-pulse"></div>
            </div>
          </div>
        )}

        {photos.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="text-muted-foreground mx-auto mb-4 h-24 w-24"
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
            {searchQuery.trim() ? (
              <>
                <h3 className="mb-2 text-xl font-medium">Aucun résultat</h3>
                <p className="text-muted-foreground mb-4">
                  Aucune photo ne correspond à &quot;{searchQuery}&quot;
                </p>
                <button
                  onClick={() => setSearchInput("")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Effacer la recherche
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-xl font-medium">No photos yet</h3>
                <p className="text-muted-foreground">Upload your first photo to get started</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {photosByDay.map(({ date, photos }) => {
              const dayKey = format(date, "yyyy-MM-dd")
              const isCollapsed = collapsedDays.has(dayKey)
              // Use count from database, fallback to loaded photos count
              const totalPhotosForDay = photoCountsByDay.get(dayKey) ?? photos.length
              return (
                <div key={dayKey}>
                  {/* Date header */}
                  <div className="border-border mb-4 flex items-center justify-between border-b pb-2">
                    <button
                      onClick={() => toggleDayCollapse(dayKey)}
                      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg py-1 pr-3 text-left transition-colors"
                      title={isCollapsed ? "Déplier" : "Replier"}
                    >
                      <svg
                        className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div>
                        <h2 className="text-xl font-semibold">
                          {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          {totalPhotosForDay} photo{totalPhotosForDay > 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {/* Desktop buttons - hidden on mobile */}
                      <button
                        onClick={() => setDayToProcess({ date })}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
                        title="Retraiter cette journée"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Retraiter
                      </button>
                      <button
                        onClick={() => setDayToDownload({ date, photos })}
                        className="text-primary hover:bg-primary/10 hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
                        title="Télécharger cette journée"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Télécharger
                      </button>
                      <button
                        onClick={() => setDayToDelete({ date, photos, totalCount: totalPhotosForDay })}
                        className="text-destructive hover:bg-destructive/10 hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
                        title="Supprimer cette journée"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Supprimer
                      </button>

                      {/* Mobile dropdown menu - hidden on desktop */}
                      <div className="relative md:hidden">
                        <button
                          onClick={() => setOpenMobileMenu(openMobileMenu === dayKey ? null : dayKey)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors"
                          title="Actions"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </button>
                        {openMobileMenu === dayKey && (
                          <>
                            {/* Backdrop to close menu */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMobileMenu(null)}
                            />
                            {/* Dropdown menu */}
                            <div className="bg-card border-border absolute right-0 z-20 mt-1 w-48 rounded-lg border py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  setDayToProcess({ date })
                                  setOpenMobileMenu(null)
                                }}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                Retraiter
                              </button>
                              <button
                                onClick={() => {
                                  setDayToDownload({ date, photos })
                                  setOpenMobileMenu(null)
                                }}
                                className="text-primary hover:bg-primary/10 flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                Télécharger
                              </button>
                              <button
                                onClick={() => {
                                  setDayToDelete({ date, photos, totalCount: totalPhotosForDay })
                                  setOpenMobileMenu(null)
                                }}
                                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Photos grid */}
                  {!isCollapsed && (
                    <PhotoGrid
                      photos={photos}
                      onPhotoClick={(photo: Photo) => setSelectedPhoto(photo)}
                      gridSize={gridSize}
                    />
                  )}
                </div>
              )
            })}

            {/* Infinite scroll trigger and loading indicator */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="border-primary h-6 w-6 animate-spin rounded-full border-3 border-t-transparent"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-semibold">Confirmer la suppression</h3>
            <p className="text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir supprimer toutes les photos du{" "}
              <strong className="text-foreground">
                {format(dayToDelete.date, "d MMMM yyyy", { locale: fr })}
              </strong>{" "}
              ?
              <br />
              <br />
              <strong className="text-destructive">
                {dayToDelete.totalCount} photo{dayToDelete.totalCount > 1 ? "s" : ""} ser
                {dayToDelete.totalCount > 1 ? "ont" : "a"} définitivement supprimée
                {dayToDelete.totalCount > 1 ? "s" : ""}.
              </strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDayToDelete(null)}
                disabled={isDeletingDay}
                className="bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDayDelete(dayToDelete.date)}
                disabled={isDeletingDay}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                {isDeletingDay ? (
                  <>
                    <div className="border-destructive-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Download Modal */}
      {dayToDownload && (
        <DayDownloadModal
          date={dayToDownload.date}
          photos={dayToDownload.photos}
          isOpen={true}
          onClose={() => setDayToDownload(null)}
        />
      )}

      {/* Bulk Process Modal */}
      {dayToProcess && (
        <BulkProcessModal
          date={dayToProcess.date}
          isOpen={true}
          onClose={() => setDayToProcess(null)}
          onProcessComplete={() => {
            setDayToProcess(null)
            // Refresh photos
            setPage(1)
            fetchPhotos(1, false, true)
          }}
        />
      )}
    </div>
  )
}
