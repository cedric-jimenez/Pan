"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Navbar from "@/components/Navbar"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import MapSidebar from "@/components/map/MapSidebar"
import MapOverlayControls from "@/components/map/MapOverlayControls"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"
import { DatePreset, distanceKm, withinDateFilter, nameOf } from "@/lib/map-utils"
import type { Basemap } from "@/components/ExplorerMap"

const ExplorerMap = dynamic(() => import("@/components/ExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Chargement de la carte…</p>
    </div>
  ),
})

export default function MapPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Photo | null>(null)
  const [detailsPhoto, setDetailsPhoto] = useState<Photo | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [basemap, setBasemap] = useState<Basemap>("street")
  const [layersOpen, setLayersOpen] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    fetch(`/api/photos?limit=200&sortBy=date&sortOrder=desc`)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((data) => {
        if (!cancelled) setPhotos(data.photos ?? [])
      })
      .catch((e) => logger.error("Failed to fetch photos:", e))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    if (!("geolocation" in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return photos.filter(
      (p) =>
        withinDateFilter(p, datePreset, customStart, customEnd) &&
        (!q || nameOf(p).toLowerCase().includes(q))
    )
  }, [photos, datePreset, customStart, customEnd, search])

  const located = useMemo(
    () => filtered.filter((p) => p.latitude !== null && p.longitude !== null),
    [filtered]
  )

  const featured = selected ?? located[0] ?? filtered[0] ?? null

  const nearby = useMemo(() => {
    const list = located.filter((p) => p.id !== featured?.id)
    if (coords) {
      return [...list]
        .sort(
          (a, b) =>
            distanceKm(coords.lat, coords.lng, a.latitude!, a.longitude!) -
            distanceKm(coords.lat, coords.lng, b.latitude!, b.longitude!)
        )
        .slice(0, 6)
    }
    return list.slice(0, 6)
  }, [located, coords, featured])

  const handleSelect = (photo: Photo) => {
    setSelected(photo)
    if (photo.latitude !== null && photo.longitude !== null) {
      setFlyTo({ lat: photo.latitude, lng: photo.longitude, zoom: 14 })
    }
  }

  const handleLocate = () => {
    if (coords) {
      setFlyTo({ ...coords, zoom: 13 })
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        setFlyTo({ ...c, zoom: 13 })
      })
    }
  }

  const handleExport = () => {
    const header = ["id", "name", "latitude", "longitude", "takenAt", "confidence"]
    const rows = filtered.map((p) => [
      p.id,
      `"${nameOf(p).replace(/"/g, '""')}"`,
      p.latitude ?? "",
      p.longitude ?? "",
      p.takenAt ?? p.createdAt ?? "",
      p.cropConfidence ?? "",
    ])
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "observations.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground mt-4">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="bg-background">
      <Navbar />

      <div className="mt-16 flex h-[calc(100vh-4rem)]">
        {/* Sidebar — Exploration */}
        {!collapsed && (
          <MapSidebar
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customStart={customStart}
            onCustomStartChange={setCustomStart}
            customEnd={customEnd}
            onCustomEndChange={setCustomEnd}
            featured={featured}
            onShowDetails={setDetailsPhoto}
            nearby={nearby}
            coords={coords}
            onSelectNearby={handleSelect}
            exportDisabled={filtered.length === 0}
            onExport={handleExport}
          />
        )}

        {/* Map */}
        <div className="relative flex-1">
          <ExplorerMap photos={filtered} basemap={basemap} flyTo={flyTo} onSelect={handleSelect} />

          <MapOverlayControls
            search={search}
            onSearchChange={setSearch}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            layersOpen={layersOpen}
            onToggleLayersOpen={() => setLayersOpen((o) => !o)}
            basemap={basemap}
            onBasemapChange={(b) => {
              setBasemap(b)
              setLayersOpen(false)
            }}
            onLocate={handleLocate}
          />
        </div>
      </div>

      {detailsPhoto && (
        <PhotoDetailsModal
          photo={detailsPhoto}
          onClose={() => setDetailsPhoto(null)}
          onUpdate={(updated) => {
            setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            setDetailsPhoto(updated)
          }}
          onDelete={(id) => {
            setPhotos((prev) => prev.filter((p) => p.id !== id))
            setDetailsPhoto(null)
          }}
        />
      )}
    </div>
  )
}
