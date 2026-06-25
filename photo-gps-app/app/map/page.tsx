"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import Navbar from "@/components/Navbar"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"
import type { Basemap } from "@/components/ExplorerMap"

const ExplorerMap = dynamic(() => import("@/components/ExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Chargement de la carte…</p>
    </div>
  ),
})

type DatePreset = "24h" | "7d" | "30d" | "all" | "custom"

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "24h", label: "Dernières 24 heures" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "all", label: "Toutes les dates" },
  { value: "custom", label: "Personnalisé…" },
]

const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "street", label: "Rue" },
  { value: "satellite", label: "Satellite" },
  { value: "heatmap", label: "Heatmap" },
]

/** Great-circle distance in km (Haversine). */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function withinDateFilter(
  photo: Photo,
  preset: DatePreset,
  customStart: string,
  customEnd: string
): boolean {
  if (preset === "all") return true
  const when = photo.takenAt ?? photo.createdAt
  if (!when) return false
  const t = new Date(when).getTime()

  if (preset === "custom") {
    if (customStart && t < new Date(customStart).getTime()) return false
    // Include the whole end day (end of day = start + 24h).
    if (customEnd && t > new Date(customEnd).getTime() + 86_400_000) return false
    return true
  }

  const days = preset === "24h" ? 1 : preset === "7d" ? 7 : 30
  return Date.now() - t <= days * 86_400_000
}

function nameOf(p: Photo): string {
  return p.individual?.name ?? p.title ?? p.originalName
}

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
          <aside className="border-border bg-card flex w-[360px] shrink-0 flex-col overflow-y-auto border-r">
            <div className="flex flex-1 flex-col gap-6 p-5">
              <h1 className="text-foreground text-2xl font-bold">Exploration</h1>

              {/* Date filter */}
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Date d&apos;observation
                </label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                >
                  {DATE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>

                {datePreset === "custom" && (
                  <div className="flex gap-2">
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-muted-foreground text-xs">Du</span>
                      <input
                        type="date"
                        value={customStart}
                        max={customEnd || undefined}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-muted-foreground text-xs">Au</span>
                      <input
                        type="date"
                        value={customEnd}
                        min={customStart || undefined}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Featured observation */}
              {featured ? (
                <div className="border-border overflow-hidden rounded-xl border">
                  <div className="bg-muted relative h-40 w-full">
                    <Image
                      src={featured.croppedUrl ?? featured.url}
                      alt={nameOf(featured)}
                      fill
                      sizes="360px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    <div>
                      <h2 className="text-foreground font-bold">{nameOf(featured)}</h2>
                      <p className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(featured.takenAt ?? featured.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {featured.cropConfidence !== null && (
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <div className="text-muted-foreground text-xs">Confiance</div>
                        <div className="text-foreground mt-1 font-semibold">
                          {Math.round(featured.cropConfidence * 100)}%
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setDetailsPhoto(featured)}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune observation.</p>
              )}

              {/* Nearby observations */}
              {nearby.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-foreground text-sm font-semibold">Observations à proximité</h3>
                  {nearby.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 text-left transition-colors"
                    >
                      <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={p.croppedUrl ?? p.url}
                          alt={nameOf(p)}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-sm font-medium">
                          {nameOf(p)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(p.takenAt ?? p.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                          {coords &&
                            ` • à ${distanceKm(coords.lat, coords.lng, p.latitude!, p.longitude!).toFixed(1)} km`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div className="border-border bg-card sticky bottom-0 border-t p-4">
              <button
                onClick={handleExport}
                disabled={filtered.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Exporter les données locales
              </button>
            </div>
          </aside>
        )}

        {/* Map */}
        <div className="relative flex-1">
          <ExplorerMap photos={filtered} basemap={basemap} flyTo={flyTo} onSelect={handleSelect} />

          {/* Search overlay */}
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
            <div className="bg-card border-border pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border px-4 py-2 shadow-md">
              <svg
                className="text-muted-foreground size-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une espèce…"
                className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Sidebar collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Afficher le panneau" : "Masquer le panneau"}
            className="bg-card border-border text-secondary-foreground hover:text-foreground absolute top-1/2 left-3 z-[1000] -translate-y-1/2 rounded-full border p-2 shadow-md"
          >
            <svg
              className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Locate + Layers controls (above the zoom control) */}
          <div className="absolute right-3 bottom-24 z-[1000] flex flex-col items-end gap-2">
            {layersOpen && (
              <div className="bg-card border-border flex flex-col overflow-hidden rounded-lg border shadow-md">
                {BASEMAPS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => {
                      setBasemap(b.value)
                      setLayersOpen(false)
                    }}
                    className={`px-4 py-2 text-left text-sm transition-colors ${
                      basemap === b.value
                        ? "bg-primary text-primary-foreground"
                        : "text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={handleLocate}
              aria-label="Me localiser"
              className="bg-card border-border text-secondary-foreground hover:text-foreground rounded-lg border p-2 shadow-md"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 3h-2.07A7.01 7.01 0 0013 5.07V3a1 1 0 10-2 0v2.07A7.01 7.01 0 005.07 11H3a1 1 0 100 2h2.07A7.01 7.01 0 0011 18.93V21a1 1 0 102 0v-2.07A7.01 7.01 0 0018.93 13H21a1 1 0 100-2zm-9 6a5 5 0 110-10 5 5 0 010 10z" />
              </svg>
            </button>
            <button
              onClick={() => setLayersOpen((o) => !o)}
              aria-label="Fonds de carte"
              className="bg-card border-border text-secondary-foreground hover:text-foreground rounded-lg border p-2 shadow-md"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
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
