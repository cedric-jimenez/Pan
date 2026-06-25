"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import type { Photo } from "@/types/photo"
import type { MapPoint } from "./LandingMap"

// Leaflet must not run on the server.
const LandingMap = dynamic(() => import("./LandingMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Chargement de la carte…</p>
    </div>
  ),
})

/** Great-circle distance in km between two coordinates (Haversine). */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

function hasGps(p: Photo): p is Photo & { latitude: number; longitude: number } {
  return p.latitude !== null && p.longitude !== null
}

function StatusBadge({ identified }: { identified: boolean }) {
  if (identified) {
    return (
      <span className="text-accent flex items-center gap-1 text-xs font-bold">
        <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        Validé
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-500">
      <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
          clipRule="evenodd"
        />
      </svg>
      En cours
    </span>
  )
}

const MAX_OBSERVATIONS = 8

export default function InteractiveMapSection() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Fetch the user's most recent photos.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/photos?limit=50&sortBy=date&sortOrder=desc`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setPhotos(data.photos ?? [])
      })
      .catch(() => {
        if (!cancelled) setPhotos([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Ask for the user's position (best-effort; silently ignored if denied).
  useEffect(() => {
    if (!("geolocation" in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  // Observations list: sorted by distance when we have a position, otherwise
  // by recency (the fetch already returns most-recent-first).
  const observations = useMemo(() => {
    if (coords) {
      return [...photos]
        .filter(hasGps)
        .sort(
          (a, b) =>
            distanceKm(coords.lat, coords.lng, a.latitude, a.longitude) -
            distanceKm(coords.lat, coords.lng, b.latitude, b.longitude)
        )
        .slice(0, MAX_OBSERVATIONS)
    }
    return photos.slice(0, MAX_OBSERVATIONS)
  }, [photos, coords])

  // Map markers: every fetched photo that has GPS data.
  const mapPoints: MapPoint[] = useMemo(
    () =>
      photos.filter(hasGps).map((p) => ({
        id: p.id,
        lat: p.latitude,
        lng: p.longitude,
        label: p.individual?.name ?? p.title ?? p.originalName,
      })),
    [photos]
  )

  const subtitle = coords ? "Basé sur votre position actuelle" : "Vos observations les plus récentes"

  return (
    <section className="flex flex-col gap-8 py-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-3xl font-semibold">Carte Interactive</h2>
        <span className="bg-accent/15 text-accent inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
          <span className="bg-accent size-2 animate-pulse rounded-full" />
          Live Updates
        </span>
      </div>

      {/* Map + nearby observations */}
      <div className="grid gap-4 lg:h-[600px] lg:grid-cols-3">
        {/* Map */}
        <div className="border-border bg-muted h-[360px] overflow-hidden rounded-xl border lg:col-span-2 lg:h-full">
          <LandingMap points={mapPoints} />
        </div>

        {/* Nearby observations panel */}
        <div className="border-border bg-card flex h-[480px] flex-col overflow-hidden rounded-xl border lg:h-full">
          <div className="border-border border-b p-4">
            <h3 className="text-foreground text-2xl font-semibold">Observations à proximité</h3>
            <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-4">
            {loading ? (
              <p className="text-muted-foreground p-3 text-sm">Chargement…</p>
            ) : observations.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">
                Aucune observation pour le moment.
              </p>
            ) : (
              observations.map((obs) => {
                const when = obs.takenAt ?? obs.createdAt
                return (
                  <div
                    key={obs.id}
                    className="hover:bg-muted/50 flex gap-4 rounded-lg p-3 transition-colors"
                  >
                    <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={obs.croppedUrl ?? obs.url}
                        alt={obs.individual?.name ?? obs.title ?? obs.originalName}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm font-bold">
                        {obs.individual?.name ?? obs.title ?? obs.originalName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {when
                          ? formatDistanceToNow(new Date(when), { addSuffix: true, locale: fr })
                          : "Date inconnue"}
                      </span>
                      <div className="pt-1">
                        <StatusBadge identified={obs.individualId !== null} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
