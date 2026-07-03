"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import Navbar from "@/components/Navbar"
import PhotoUpload from "@/components/PhotoUpload"
import { GridSize } from "@/components/PhotoGrid"
import DaySection from "@/components/DaySection"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import DayDownloadModal from "@/components/DayDownloadModal"
import BulkProcessModal from "@/components/BulkProcessModal"
import StatsCards, { PhotoStats } from "@/components/StatsCards"
import GalleryControls from "@/components/gallery/GalleryControls"
import GalleryEmptyState from "@/components/gallery/GalleryEmptyState"
import DeleteDayModal from "@/components/gallery/DeleteDayModal"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

export default function GalleryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [gridSize, setGridSize] = useState<GridSize>("medium")
  const [sortBy, setSortBy] = useState<SortBy>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dayToDelete, setDayToDelete] = useState<{ date: Date; totalCount: number } | null>(null)
  const [isDeletingDay, setIsDeletingDay] = useState(false)
  const [dayToDownload, setDayToDownload] = useState<{ date: Date } | null>(null)
  const [dayToProcess, setDayToProcess] = useState<{ date: Date } | null>(null)
  const isInitialLoad = useRef(true)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [photoCountsByDay, setPhotoCountsByDay] = useState<Map<string, number>>(new Map())
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null)
  const [photoStats, setPhotoStats] = useState<PhotoStats | null>(null)
  // Per-day photo cache for lazy loading: a day's photos (and thus its thumbnail
  // components) are fetched only when the day is expanded and scrolled into view.
  const [dayPhotos, setDayPhotos] = useState<Map<string, Photo[]>>(new Map())
  const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set())
  const dayPhotosRef = useRef(dayPhotos)
  dayPhotosRef.current = dayPhotos
  const loadingDaysRef = useRef(loadingDays)
  loadingDaysRef.current = loadingDays

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

  // Fetch the per-day counts. This is the gallery's primary query: it drives the
  // list of day headers without loading any photo. Photos are loaded lazily per
  // day (see ensureDayLoaded).
  const fetchPhotoCountsByDay = useCallback(
    async (silent = false) => {
      if (!silent) {
        if (isInitialLoad.current) {
          setIsLoading(true)
        } else {
          setIsSearching(true)
        }
      }
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
      } finally {
        setIsLoading(false)
        setIsSearching(false)
        isInitialLoad.current = false
      }
    },
    [searchQuery]
  )

  // Lazily load a single day's photos into the cache. Guarded against duplicate
  // fetches via refs so it can be called freely from each DaySection.
  const ensureDayLoaded = useCallback(
    async (dayKey: string) => {
      if (dayPhotosRef.current.has(dayKey) || loadingDaysRef.current.has(dayKey)) {
        return
      }
      setLoadingDays((prev) => new Set(prev).add(dayKey))
      try {
        const params = new URLSearchParams({ date: dayKey, sortBy, sortOrder })
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim())
        }
        const response = await fetch(`/api/photos/by-day?${params}`)
        if (response.ok) {
          const data = await response.json()
          setDayPhotos((prev) => new Map(prev).set(dayKey, data.photos))
        }
      } catch (error) {
        logger.error("Failed to fetch photos for day:", error)
      } finally {
        setLoadingDays((prev) => {
          const next = new Set(prev)
          next.delete(dayKey)
          return next
        })
      }
    },
    [sortBy, sortOrder, searchQuery]
  )

  // Fetch photo stats from database (computed over all photos)
  const fetchPhotoStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim())
      }

      const response = await fetch(`/api/photos/stats?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPhotoStats(data)
      }
    } catch (error) {
      logger.error("Failed to fetch photo stats:", error)
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

  // When the query (sort/search) changes, drop the per-day cache so expanded,
  // visible days reload with the new ordering, and refresh counts + stats.
  useEffect(() => {
    if (session) {
      setDayPhotos(new Map())
      setLoadingDays(new Set())
      fetchPhotoCountsByDay()
      fetchPhotoStats()
    }
  }, [session, sortBy, sortOrder, searchQuery, fetchPhotoCountsByDay, fetchPhotoStats])

  // Close the details modal and drop the ?photo= deep-link param from the URL
  const closePhoto = useCallback(() => {
    setSelectedPhoto(null)
    if (new URLSearchParams(window.location.search).has("photo")) {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  // Deep link: open the photo referenced by ?photo= on load. Fetched directly
  // so it works even when the photo isn't in the currently paginated list.
  const deepLinkHandled = useRef(false)
  useEffect(() => {
    if (status !== "authenticated" || deepLinkHandled.current) return
    const photoId = new URLSearchParams(window.location.search).get("photo")
    if (!photoId) return
    deepLinkHandled.current = true
    ;(async () => {
      try {
        const res = await fetch(`/api/photos/${photoId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedPhoto(data.photo)
        } else {
          logger.error("Deep-linked photo not found:", photoId)
        }
      } catch (error) {
        logger.error("Failed to open deep-linked photo:", error)
      }
    })()
  }, [status])

  const handlePhotoUpdate = async (updatedPhoto: Photo) => {
    setDayPhotos((prev) => {
      const next = new Map(prev)
      for (const [key, arr] of next) {
        if (arr.some((p) => p.id === updatedPhoto.id)) {
          next.set(
            key,
            arr.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
          )
        }
      }
      return next
    })
    setSelectedPhoto(updatedPhoto)
  }

  const handlePhotoDelete = async (photoId: string) => {
    setDayPhotos((prev) => {
      const next = new Map(prev)
      for (const [key, arr] of next) {
        if (arr.some((p) => p.id === photoId)) {
          next.set(
            key,
            arr.filter((p) => p.id !== photoId)
          )
        }
      }
      return next
    })
    fetchPhotoCountsByDay(true)
    fetchPhotoStats()
    closePhoto()
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
        // Drop the day from the cache and refresh counts + stats.
        setDayPhotos((prev) => {
          const next = new Map(prev)
          next.delete(dayKey)
          return next
        })
        fetchPhotoCountsByDay(true)
        fetchPhotoStats()
        setDayToDelete(null)
      }
    } catch (error) {
      logger.error("Failed to delete day:", error)
      alert("Erreur lors de la suppression de la journée")
    } finally {
      setIsDeletingDay(false)
    }
  }

  // Ordered list of days, derived from the counts (no photos loaded). Days are
  // sorted by date following the chosen sort order.
  const dayList = useMemo(() => {
    return Array.from(photoCountsByDay.entries())
      .map(([dateKey, count]) => ({ dateKey, date: parseISO(dateKey), count }))
      .sort((a, b) =>
        sortOrder === "asc" ? a.dateKey.localeCompare(b.dateKey) : b.dateKey.localeCompare(a.dateKey)
      )
  }, [photoCountsByDay, sortOrder])

  // Total photo count across all days (from the counts query).
  const total = useMemo(
    () => Array.from(photoCountsByDay.values()).reduce((sum, n) => sum + n, 0),
    [photoCountsByDay]
  )

  // Flattened list of currently-loaded photos in display order, used for
  // prev/next navigation inside the details modal.
  const loadedPhotos = useMemo(
    () => dayList.flatMap((d) => dayPhotos.get(d.dateKey) ?? []),
    [dayList, dayPhotos]
  )

  // Position of the open photo within `loadedPhotos`, used for prev/next navigation.
  const currentPhotoIndex = useMemo(
    () => (selectedPhoto ? loadedPhotos.findIndex((p) => p.id === selectedPhoto.id) : -1),
    [selectedPhoto, loadedPhotos]
  )

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

      <main className="w-full px-4 pt-24 pb-8 md:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Salamander Database</h1>
          <p className="text-muted-foreground">
            {total} individual{total > 1 ? "s" : ""} found
          </p>
        </div>

        {/* Full-width tinted band behind the KPIs, matching the Figma stats section */}
        <div className="bg-muted/40 -mx-4 mb-8 px-4 py-12 md:-mx-8 md:px-8">
          <StatsCards stats={photoStats} />
        </div>

        <div id="upload" className="mb-8 scroll-mt-24">
          <PhotoUpload
            onUploadComplete={() => {
              setDayPhotos(new Map())
              setLoadingDays(new Set())
              fetchPhotoCountsByDay(true)
              fetchPhotoStats()
            }}
          />
        </div>

        {/* Search and controls - always visible */}
        <GalleryControls
          total={total}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          sortBy={sortBy}
          onSortByChange={handleSortChange}
          sortOrder={sortOrder}
          onToggleSortOrder={toggleSortOrder}
          gridSize={gridSize}
          onGridSizeChange={handleGridSizeChange}
        />

        {/* Subtle loading indicator during search/filter */}
        {isSearching && (
          <div className="mb-4">
            <div className="bg-primary/20 h-1 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-1/3 animate-pulse"></div>
            </div>
          </div>
        )}

        {dayList.length === 0 ? (
          <GalleryEmptyState searchQuery={searchQuery} onClearSearch={() => setSearchInput("")} />
        ) : (
          <div className="space-y-8">
            {dayList.map(({ date, dateKey, count }) => (
              <DaySection
                key={dateKey}
                date={date}
                dateKey={dateKey}
                count={count}
                isCollapsed={collapsedDays.has(dateKey)}
                gridSize={gridSize}
                photos={dayPhotos.get(dateKey)}
                isLoading={loadingDays.has(dateKey)}
                openMobileMenu={openMobileMenu}
                onToggleCollapse={toggleDayCollapse}
                onNeedLoad={ensureDayLoaded}
                onPhotoClick={setSelectedPhoto}
                onProcess={(d) => setDayToProcess({ date: d })}
                onDownload={(d) => setDayToDownload({ date: d })}
                onDelete={(d, totalCount) => setDayToDelete({ date: d, totalCount })}
                onToggleMobileMenu={setOpenMobileMenu}
              />
            ))}
          </div>
        )}
      </main>

      {selectedPhoto && (
        <PhotoDetailsModal
          key={selectedPhoto.id}
          photo={selectedPhoto}
          onClose={closePhoto}
          onUpdate={handlePhotoUpdate}
          onDelete={handlePhotoDelete}
          hasPrev={currentPhotoIndex > 0}
          hasNext={currentPhotoIndex >= 0 && currentPhotoIndex < loadedPhotos.length - 1}
          onNavigate={(direction) => {
            const delta = direction === "next" ? 1 : -1
            const next = loadedPhotos[currentPhotoIndex + delta]
            if (next) setSelectedPhoto(next)
          }}
        />
      )}

      {/* Delete Day Confirmation Modal */}
      {dayToDelete && (
        <DeleteDayModal
          date={dayToDelete.date}
          totalCount={dayToDelete.totalCount}
          isDeleting={isDeletingDay}
          onCancel={() => setDayToDelete(null)}
          onConfirm={() => handleDayDelete(dayToDelete.date)}
        />
      )}

      {/* Day Download Modal */}
      {dayToDownload && (
        <DayDownloadModal
          date={dayToDownload.date}
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
            // Processing changed crop/segment/embedding — drop the day's cache so
            // it reloads fresh, and refresh stats.
            const dayKey = format(dayToProcess.date, "yyyy-MM-dd")
            setDayPhotos((prev) => {
              const next = new Map(prev)
              next.delete(dayKey)
              return next
            })
            setDayToProcess(null)
            fetchPhotoStats()
          }}
        />
      )}
    </div>
  )
}
