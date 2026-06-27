"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import IdentificationDropzone from "@/components/identification/IdentificationDropzone"
import ShootingGuide from "@/components/identification/ShootingGuide"
import SimilarResults from "@/components/identification/SimilarResults"
import ConfirmIndividualModal from "@/components/identification/ConfirmIndividualModal"
import { Photo } from "@/types/photo"
import { SimilarPhotoResult } from "@/types/identification"
import { logger } from "@/lib/logger"

interface ExistingIndividual {
  id: string
  name: string
}

export default function IdentificationPage() {
  const { status } = useSession()
  const router = useRouter()

  const [uploadedPhoto, setUploadedPhoto] = useState<Photo | null>(null)
  const [similar, setSimilar] = useState<SimilarPhotoResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [noDetectionFile, setNoDetectionFile] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPhotoIds, setConfirmPhotoIds] = useState<string[]>([])
  const [confirmExisting, setConfirmExisting] = useState<ExistingIndividual[]>([])

  const [successInfo, setSuccessInfo] = useState<{ name: string; count: number } | null>(null)
  const [detailsPhoto, setDetailsPhoto] = useState<Photo | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchSimilar = useCallback(async (photoId: string) => {
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/photos/${photoId}/similar`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Échec de la recherche de similaires")
      }
      const data: SimilarPhotoResult[] = await res.json()
      // Only surface candidates the cross-verifier confirmed as the same
      // individual (isSame). Lower-ranked / unverified neighbours are noise here.
      setSimilar(data.filter((result) => result.isSame === true))
    } catch (err) {
      logger.error("similar fetch error", err)
      setSearchError(
        "Impossible de rechercher les individus similaires pour le moment. Réessayez plus tard."
      )
      setSimilar([])
    } finally {
      setSearching(false)
    }
  }, [])

  const resetFlow = () => {
    setUploadedPhoto(null)
    setSimilar(null)
    setSelectedIds(new Set())
    setSearchError(null)
    setNoDetectionFile(null)
    setSuccessInfo(null)
  }

  const handleUploaded = useCallback(
    (photo: Photo) => {
      setNoDetectionFile(null)
      setSuccessInfo(null)
      setSelectedIds(new Set())
      setUploadedPhoto(photo)
      setSimilar(null)
      fetchSimilar(photo.id)
    },
    [fetchSimilar]
  )

  const handleNoDetection = useCallback((filename: string) => {
    resetFlow()
    setNoDetectionFile(filename)
  }, [])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Distinct individuals already linked to a set of photo ids (+ reference).
  const deriveExisting = (ids: string[]): ExistingIndividual[] => {
    const map = new Map<string, string>()
    if (uploadedPhoto?.individual?.id) {
      map.set(uploadedPhoto.individual.id, uploadedPhoto.individual.name)
    }
    for (const result of similar ?? []) {
      if (ids.includes(result.id) && result.individualId && result.individualName) {
        map.set(result.individualId, result.individualName)
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }

  const openConfirmSelection = () => {
    if (!uploadedPhoto) return
    const ids = [uploadedPhoto.id, ...selectedIds]
    setConfirmPhotoIds(ids)
    setConfirmExisting(deriveExisting(ids))
    setConfirmOpen(true)
  }

  const openRegisterNew = () => {
    if (!uploadedPhoto) return
    const ids = [uploadedPhoto.id]
    setConfirmPhotoIds(ids)
    setConfirmExisting(deriveExisting(ids))
    setConfirmOpen(true)
  }

  const handleConfirmSuccess = (result: { individualName: string; assignedCount: number }) => {
    setConfirmOpen(false)
    setSuccessInfo({ name: result.individualName, count: result.assignedCount })
    // Reflect the assignment locally so badges update without a refetch.
    const assigned = new Set(confirmPhotoIds)
    setSimilar((prev) =>
      prev
        ? prev.map((p) =>
            assigned.has(p.id) ? { ...p, individualName: result.individualName } : p
          )
        : prev
    )
  }

  const handleOpenDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/photos/${id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.photo) setDetailsPhoto(data.photo)
    } catch (err) {
      logger.error("open details error", err)
    }
  }

  if (status === "loading") {
    return null
  }
  if (status === "unauthenticated") {
    return null
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen w-full px-4 pt-20 pb-12 md:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Upload section */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-foreground text-3xl font-semibold">Identifier un individu</h1>
              <p className="text-secondary-foreground text-base">
                Téléchargez une photo claire du dos de la salamandre pour une reconnaissance
                biométrique précise.
              </p>
            </div>

            <IdentificationDropzone
              onUploaded={handleUploaded}
              onNoDetection={handleNoDetection}
              busy={searching}
            />

            {noDetectionFile && (
              <div className="bg-muted/50 border-border rounded-lg border px-4 py-3 text-sm">
                <p className="text-foreground font-medium">Aucune salamandre détectée</p>
                <p className="text-secondary-foreground mt-1">
                  {noDetectionFile} a bien été importée, mais aucune salamandre n&apos;a pu être
                  détectée. Utilisez une photo nette du dos de l&apos;animal, prise de dessus et
                  bien éclairée.
                </p>
              </div>
            )}
          </div>

          {/* Shooting guide sidebar */}
          <div className="lg:col-span-4">
            <ShootingGuide />
          </div>
        </div>

        {/* Results */}
        {(searching || similar !== null) && uploadedPhoto && (
          <div className="mt-10">
            {successInfo && (
              <div className="bg-accent/10 border-accent text-foreground mb-6 flex items-center justify-between rounded-lg border px-4 py-3">
                <p className="text-sm">
                  {successInfo.count} photo{successInfo.count > 1 ? "s" : ""} associée
                  {successInfo.count > 1 ? "s" : ""} à{" "}
                  <span className="font-semibold">{successInfo.name}</span>.{" "}
                  <a href="/individuals" className="text-primary font-medium hover:underline">
                    Voir la fiche
                  </a>
                </p>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Identifier une autre photo
                </button>
              </div>
            )}

            {searching ? (
              <div className="text-secondary-foreground flex items-center gap-3 py-8">
                <svg className="text-primary h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Recherche des individus similaires…
              </div>
            ) : searchError ? (
              <p className="text-destructive py-8 text-sm">{searchError}</p>
            ) : (
              similar && (
                <SimilarResults
                  referencePhoto={uploadedPhoto}
                  results={similar}
                  selectedIds={selectedIds}
                  onToggle={toggleSelected}
                  onConfirmSelection={openConfirmSelection}
                  onRegisterNew={openRegisterNew}
                  onOpenDetails={handleOpenDetails}
                />
              )
            )}
          </div>
        )}
      </main>

      <ConfirmIndividualModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        photoIds={confirmPhotoIds}
        existingIndividuals={confirmExisting}
        onSuccess={handleConfirmSuccess}
      />

      {detailsPhoto && (
        <PhotoDetailsModal
          photo={detailsPhoto}
          onClose={() => setDetailsPhoto(null)}
          onUpdate={(p) => setDetailsPhoto(p)}
          onDelete={() => setDetailsPhoto(null)}
        />
      )}
    </>
  )
}
