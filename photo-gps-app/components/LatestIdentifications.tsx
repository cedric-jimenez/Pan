"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Photo } from "@/types/photo"

const MAX_CARDS = 4

export default function LatestIdentifications() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/photos?limit=50&sortBy=date&sortOrder=desc`).then((r) =>
        r.ok ? r.json() : { photos: [] }
      ),
      fetch(`/api/individuals?limit=100`).then((r) => (r.ok ? r.json() : { individuals: [] })),
    ])
      .then(([photosData, individualsData]) => {
        if (cancelled) return
        setPhotos(photosData.photos ?? [])
        const map = new Map<string, number>()
        for (const ind of individualsData.individuals ?? []) {
          map.set(ind.id, ind.photoCount)
        }
        setCounts(map)
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

  // Latest identifications = most recent photos attached to an individual.
  const cards = useMemo(
    () => photos.filter((p) => p.individualId !== null).slice(0, MAX_CARDS),
    [photos]
  )

  return (
    <section className="flex flex-col gap-8 py-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-3xl font-semibold">Dernières identifications</h2>
        <Link
          href="/individuals"
          className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
        >
          Voir tout
          <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : cards.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune identification pour le moment.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((photo) => {
            const name = photo.individual?.name ?? photo.title ?? photo.originalName
            const when = photo.takenAt ?? photo.createdAt
            const obsCount = photo.individualId ? counts.get(photo.individualId) : undefined
            return (
              <div
                key={photo.id}
                className="border-border bg-card overflow-hidden rounded-xl border"
              >
                <div className="bg-muted relative h-64 w-full">
                  <Image
                    src={photo.croppedUrl ?? photo.url}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain object-center"
                  />
                </div>
                <div className="flex flex-col gap-1 p-4">
                  <span className="text-foreground text-sm font-bold">{name}</span>
                  <span className="text-muted-foreground text-xs">
                    Identifié le {format(new Date(when), "d MMM yyyy", { locale: fr })}
                  </span>
                  {obsCount !== undefined && (
                    <div className="pt-3">
                      <span className="bg-primary/15 text-primary inline-block rounded px-2 py-1 text-[10px] font-bold uppercase">
                        {obsCount} obs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
