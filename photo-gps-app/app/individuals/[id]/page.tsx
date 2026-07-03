"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Button from "@/components/Button"
import IndividualModal from "@/components/IndividualModal"
import AddPhotosToIndividualModal from "@/components/AddPhotosToIndividualModal"
import ObservationMapPanel from "@/components/individuals/ObservationMapPanel"
import ObservationCard from "@/components/individuals/ObservationCard"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { homeRangeHectares } from "@/lib/home-range"
import { formatDate } from "@/lib/format-date"
import type { Basemap } from "@/components/ExplorerMap"
import type { IndividualPhoto, IndividualWithPhotos } from "@/types/individual"
import type { Photo } from "@/types/photo"

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
            <ObservationMapPanel
              geolocated={geolocated}
              totalPhotoCount={photos.length}
              mapPhotos={mapPhotos}
              basemap={basemap}
              onBasemapChange={setBasemap}
              surfaceHa={surfaceHa}
              onSelectPhoto={(photoId) => router.push(`/gallery?photo=${photoId}`)}
            />
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
                  <ObservationCard
                    key={photo.id}
                    photo={photo}
                    isLatest={index === 0}
                    onViewDetails={() => router.push(`/gallery?photo=${photo.id}`)}
                  />
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
