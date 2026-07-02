"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Image from "next/image"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Navbar from "@/components/Navbar"
import Button from "@/components/Button"
import IndividualModal from "@/components/IndividualModal"
import AddPhotosToIndividualModal from "@/components/AddPhotosToIndividualModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { homeRangeHectares } from "@/lib/home-range"
import type { Basemap } from "@/components/ExplorerMap"
import type { IndividualPhoto, IndividualWithPhotos } from "@/types/individual"
import type { Photo } from "@/types/photo"

const ExplorerMap = dynamic(() => import("@/components/ExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <span className="text-muted-foreground text-sm">Chargement de la carte…</span>
    </div>
  ),
})

function formatDate(value: Date | string | null): string | null {
  if (!value) return null
  return format(new Date(value), "d MMMM yyyy", { locale: fr })
}

function formatTime(value: Date | string | null): string | null {
  if (!value) return null
  return format(new Date(value), "HH:mm", { locale: fr })
}

function formatSurface(ha: number): string {
  if (ha >= 1) return `~${ha.toFixed(1)} ha`
  if (ha >= 0.01) return `~${ha.toFixed(2)} ha`
  return `~${Math.round(ha * 10_000)} m²`
}

export default function IndividualDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [individual, setIndividual] = useState<IndividualWithPhotos | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isEditOpen, setEditOpen] = useState(false)
  const [isAssignOpen, setAssignOpen] = useState(false)
  const [basemap, setBasemap] = useState<Basemap>("street")

  const fetchIndividual = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const response = await fetch(`/api/individuals/${id}`)
      if (response.status === 404) {
        setNotFound(true)
        return
      }
      if (!response.ok) {
        throw new Error("Échec du chargement de l'individu")
      }
      const data = await response.json()
      setIndividual(data.individual)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchIndividual()
  }, [fetchIndividual])

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cet individu ? Ses photos seront conservées.")) {
      return
    }
    try {
      const response = await fetchWithCsrf(`/api/individuals/${id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Échec de la suppression")
      }
      router.push("/individuals")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Une erreur est survenue")
    }
  }

  const photos: IndividualPhoto[] = useMemo(() => individual?.photos ?? [], [individual])

  const takenDates = useMemo(
    () =>
      photos
        .map((p) => p.takenAt)
        .filter((d): d is Date | string => d !== null)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime()),
    [photos]
  )

  const firstDate = takenDates[0] ?? null
  const lastDate = takenDates[takenDates.length - 1] ?? null
  const geolocated = useMemo(
    () => photos.filter((p) => p.latitude !== null && p.longitude !== null),
    [photos]
  )

  // Surface du domaine vital estimée (Minimum Convex Polygon) — null si < 3 points distincts
  const surfaceHa = useMemo(
    () =>
      homeRangeHectares(
        geolocated.map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }))
      ),
    [geolocated]
  )

  // ExplorerMap attend le type Photo complet ; il ne lit qu'un sous-ensemble
  // (id, latitude, longitude, title, originalName, individual). On complète le reste.
  const mapPhotos: Photo[] = useMemo(
    () =>
      geolocated.map(
        (p) =>
          ({
            ...p,
            userId: "",
            individualId: id,
            filename: "",
            originalName: p.title || "Observation",
            fileSize: 0,
            croppedFileSize: null,
            segmentedFileSize: null,
            mimeType: "",
            isCropped: false,
            cropConfidence: null,
            salamanderDetected: true,
            individual: individual ? { id: individual.id, name: individual.name } : null,
            createdAt: p.takenAt ?? new Date().toISOString(),
            updatedAt: p.takenAt ?? new Date().toISOString(),
          }) as Photo
      ),
    [geolocated, id, individual]
  )

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <main className="w-full px-4 py-8 pt-24 md:px-8">
          <div className="text-muted-foreground py-24 text-center">Chargement…</div>
        </main>
      </div>
    )
  }

  if (notFound || !individual) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <main className="w-full px-4 py-8 pt-24 md:px-8">
          <div className="py-24 text-center">
            <p className="mb-4 text-2xl font-bold">Individu introuvable</p>
            <button onClick={() => router.push("/individuals")} className="text-primary font-medium">
              ← Retour à tous les individus
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 pt-24 md:px-8">
        {/* Fil d'Ariane */}
        <nav className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
          <button onClick={() => router.push("/individuals")} className="hover:text-foreground">
            Tous les individus
          </button>
          <span>›</span>
          <span className="text-primary font-semibold">{individual.name}</span>
        </nav>

        {/* En-tête */}
        <section className="bg-secondary border-border mb-8 rounded-xl border p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="mb-3 text-3xl font-bold md:text-4xl">{individual.name}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="bg-card border-border rounded-full border px-3 py-1.5 text-sm font-medium">
                  {individual.photoCount} observation{individual.photoCount !== 1 ? "s" : ""}
                </span>
                {lastDate && (
                  <span className="bg-card border-border rounded-full border px-3 py-1.5 text-sm font-medium">
                    Dernière observation : {formatDate(lastDate)}
                  </span>
                )}
                {firstDate && lastDate && firstDate.getTime() !== lastDate.getTime() && (
                  <span className="bg-card border-border rounded-full border px-3 py-1.5 text-sm font-medium">
                    Période : {formatDate(firstDate)} – {formatDate(lastDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setAssignOpen(true)}>Assigner des photos</Button>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Modifier
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Supprimer
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Colonne latérale : carte réelle */}
          <aside className="lg:col-span-1">
            <section className="bg-card border-border rounded-xl border p-6">
              <h2 className="mb-4 text-xl font-bold">Zone d&apos;observation</h2>
              {geolocated.length > 0 ? (
                <>
                  <div className="mb-3 flex gap-2">
                    {(["street", "satellite", "heatmap"] as Basemap[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setBasemap(type)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                          basemap === type
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {type === "street" ? "Plan" : type === "satellite" ? "Satellite" : "Densité"}
                      </button>
                    ))}
                  </div>
                  <div className="border-border h-72 w-full overflow-hidden rounded-lg border">
                    <ExplorerMap
                      photos={mapPhotos}
                      basemap={basemap}
                      flyTo={null}
                      onSelect={(photo) => router.push(`/gallery?photo=${photo.id}`)}
                    />
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm">
                    {geolocated.length}/{photos.length} photo{photos.length !== 1 ? "s" : ""}{" "}
                    géolocalisée{geolocated.length !== 1 ? "s" : ""}
                  </p>
                  {surfaceHa !== null ? (
                    <div className="border-border mt-3 flex items-baseline justify-between border-t pt-3">
                      <span className="text-muted-foreground text-sm">Surface estimée</span>
                      <span className="text-lg font-bold">{formatSurface(surfaceHa)}</span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm italic">
                      Surface indisponible (min. 3 observations géolocalisées distinctes).
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs italic">
                    Domaine vital estimé par polygone convexe minimal (MCP).
                  </p>
                </>
              ) : (
                <div className="text-muted-foreground bg-muted flex h-72 items-center justify-center rounded-lg text-center text-sm">
                  Aucune photo géolocalisée pour cet individu.
                </div>
              )}
            </section>
          </aside>

          {/* Colonne principale : historique des observations */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Historique des observations</h2>
              <span className="text-primary text-sm font-bold">
                {individual.photoCount} prise{individual.photoCount !== 1 ? "s" : ""} de vue
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="text-muted-foreground bg-card border-border rounded-xl border py-16 text-center">
                Aucune observation pour cet individu.
              </div>
            ) : (
              <div className="space-y-6">
                {photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    className="bg-card border-border flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg md:flex-row"
                  >
                    <div className="bg-muted relative h-48 md:h-auto md:w-1/3">
                      <Image
                        src={photo.croppedUrl || photo.url}
                        alt={photo.title || "Observation"}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold">
                            {photo.title || formatDate(photo.takenAt) || "Observation"}
                          </h3>
                          {index === 0 && (
                            <span className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-bold">
                              Plus récente
                            </span>
                          )}
                        </div>
                        <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
                          {photo.takenAt && (
                            <div>
                              <dt className="text-muted-foreground">Date</dt>
                              <dd className="font-medium">{formatDate(photo.takenAt)}</dd>
                            </div>
                          )}
                          {photo.takenAt && (
                            <div>
                              <dt className="text-muted-foreground">Heure</dt>
                              <dd className="font-medium">{formatTime(photo.takenAt)}</dd>
                            </div>
                          )}
                          {photo.latitude !== null && photo.longitude !== null && (
                            <div>
                              <dt className="text-muted-foreground">Position</dt>
                              <dd className="font-medium">
                                {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                              </dd>
                            </div>
                          )}
                          {(photo.cameraMake || photo.cameraModel) && (
                            <div>
                              <dt className="text-muted-foreground">Appareil</dt>
                              <dd className="font-medium">
                                {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                              </dd>
                            </div>
                          )}
                          {(photo.aperture ||
                            photo.iso ||
                            photo.shutterSpeed ||
                            photo.focalLength) && (
                            <div className="sm:col-span-2">
                              <dt className="text-muted-foreground">Réglages</dt>
                              <dd className="flex flex-wrap gap-2 font-medium">
                                {photo.aperture && (
                                  <span className="bg-muted rounded px-2 py-0.5">
                                    {photo.aperture}
                                  </span>
                                )}
                                {photo.iso && (
                                  <span className="bg-muted rounded px-2 py-0.5">ISO {photo.iso}</span>
                                )}
                                {photo.shutterSpeed && (
                                  <span className="bg-muted rounded px-2 py-0.5">
                                    {photo.shutterSpeed}
                                  </span>
                                )}
                                {photo.focalLength && (
                                  <span className="bg-muted rounded px-2 py-0.5">
                                    {photo.focalLength}
                                  </span>
                                )}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {photo.description && (
                          <p className="text-muted-foreground mt-3 line-clamp-2 text-sm italic">
                            {photo.description}
                          </p>
                        )}
                      </div>
                      <div className="border-border mt-4 flex justify-end border-t pt-4">
                        <button
                          onClick={() => router.push(`/gallery?photo=${photo.id}`)}
                          className="text-primary text-sm font-bold hover:underline"
                        >
                          Voir les détails →
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <IndividualModal
        isOpen={isEditOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchIndividual}
        individual={{
          id: individual.id,
          name: individual.name,
          userId: "",
          createdAt: individual.createdAt,
          updatedAt: individual.updatedAt,
        }}
      />

      <AddPhotosToIndividualModal
        isOpen={isAssignOpen}
        onClose={() => setAssignOpen(false)}
        individualId={individual.id}
        onSuccess={fetchIndividual}
      />
    </div>
  )
}
