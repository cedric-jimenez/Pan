"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import Input from "./Input"
import AssignIndividualModal from "./AssignIndividualModal"
import PhotoImagePanel, { ImageView } from "./photo-details/PhotoImagePanel"
import PhotoNavButtons from "./photo-details/PhotoNavButtons"
import PhotoInfoPanel from "./photo-details/PhotoInfoPanel"
import ReprocessResultPanel from "./photo-details/ReprocessResultPanel"
import PhotoActionsBar from "./photo-details/PhotoActionsBar"
import { Photo, SimilarPhoto, PhotoProcessResult } from "@/types/photo"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface PhotoDetailsModalProps {
  photo: Photo
  onClose: () => void
  onUpdate: (photo: Photo) => void
  onDelete: (photoId: string) => void
  /** Navigate to the previous/next photo (keyboard arrows + on-screen buttons). */
  onNavigate?: (direction: "prev" | "next") => void
  hasPrev?: boolean
  hasNext?: boolean
}

async function fetchSimilarPhotos(photoId: string): Promise<SimilarPhoto[]> {
  const response = await fetch(`/api/photos/${photoId}/similar`)
  if (!response.ok) return []
  return response.json()
}

export default function PhotoDetailsModal({
  photo,
  onClose,
  onUpdate,
  onDelete,
  onNavigate,
  hasPrev = false,
  hasNext = false,
}: PhotoDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(photo.title || "")
  const [description, setDescription] = useState(photo.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [similarPhotos, setSimilarPhotos] = useState<SimilarPhoto[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [reprocessResult, setReprocessResult] = useState<PhotoProcessResult | null>(null)

  const defaultView: ImageView = photo.croppedUrl ? "cropped" : "original"
  const [currentView, setCurrentView] = useState<ImageView>(defaultView)

  // Load similar photos on mount
  useEffect(() => {
    setIsLoadingSimilar(true)
    fetchSimilarPhotos(photo.id)
      .then(setSimilarPhotos)
      .catch((error) => logger.error("Failed to load similar photos:", error))
      .finally(() => setIsLoadingSimilar(false))
  }, [photo.id])

  // Keyboard navigation between photos with the arrow keys.
  useEffect(() => {
    if (!onNavigate) return
    const handleKey = (e: KeyboardEvent) => {
      // Don't hijack arrows while typing in a field.
      const tag = (e.target as HTMLElement | null)?.tagName
      if (isEditing || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault()
        onNavigate("prev")
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault()
        onNavigate("next")
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onNavigate, hasPrev, hasNext, isEditing])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetchWithCsrf(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      })

      if (response.ok) {
        const data = await response.json()
        onUpdate(data.photo)
        setIsEditing(false)
      }
    } catch (error) {
      logger.error("Failed to update photo:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setTitle(photo.title || "")
    setDescription(photo.description || "")
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/photos/${photo.id}`, { method: "DELETE" })
      if (response.ok) {
        onDelete(photo.id)
      }
    } catch (error) {
      logger.error("Failed to delete photo:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const reloadSimilarPhotos = async () => {
    setIsLoadingSimilar(true)
    try {
      setSimilarPhotos(await fetchSimilarPhotos(photo.id))
    } finally {
      setIsLoadingSimilar(false)
    }
  }

  const handleReprocess = async () => {
    setIsReprocessing(true)
    setReprocessResult(null)

    try {
      const response = await fetchWithCsrf("/api/photos/bulk-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [photo.id] }),
      })

      if (!response.ok) {
        const data = await response.json()
        setReprocessResult({
          photoId: photo.id,
          success: false,
          error: data.error || "Erreur inconnue",
        })
        return
      }

      const data = await response.json()
      const result = data.results?.[0] as PhotoProcessResult | undefined
      if (!result) return

      setReprocessResult(result)

      const photoResponse = await fetch(`/api/photos/${photo.id}`)
      if (photoResponse.ok) {
        const updatedData = await photoResponse.json()
        onUpdate(updatedData.photo)
        await reloadSimilarPhotos()
      }
    } catch (error) {
      logger.error("Failed to reprocess photo:", error)
      setReprocessResult({
        photoId: photo.id,
        success: false,
        error: "Erreur lors du retraitement",
      })
    } finally {
      setIsReprocessing(false)
    }
  }

  // Only surface photos confirmed to be the same individual.
  const sameIndividualPhotos = similarPhotos.filter((s) => s.isSame)
  const displayTitle = photo.title || photo.originalName

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <PhotoNavButtons onNavigate={onNavigate} hasPrev={hasPrev} hasNext={hasNext} />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl shadow-xl md:max-w-4xl">
          <div className="grid min-w-0 gap-6 overflow-hidden p-6 md:grid-cols-2">
            <PhotoImagePanel
              photo={photo}
              currentView={currentView}
              onViewChange={setCurrentView}
              sameIndividualPhotos={sameIndividualPhotos}
              isLoadingSimilar={isLoadingSimilar}
            />

            <div className="min-w-0 space-y-6 overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Add a title"
                      className="mb-2"
                    />
                  ) : (
                    <h2 className="truncate text-2xl font-bold" title={displayTitle}>
                      {displayTitle}
                    </h2>
                  )}
                </div>

                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description"
                  rows={3}
                  className="bg-input border-border text-foreground focus:ring-ring placeholder:text-muted-foreground w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                />
              ) : (
                photo.description && <p className="text-muted-foreground">{photo.description}</p>
              )}

              <PhotoInfoPanel photo={photo} />

              {reprocessResult && <ReprocessResultPanel result={reprocessResult} />}

              <PhotoActionsBar
                isEditing={isEditing}
                isSaving={isSaving}
                isDeleting={isDeleting}
                isReprocessing={isReprocessing}
                onSave={handleSave}
                onCancelEdit={handleCancelEdit}
                onEdit={() => setIsEditing(true)}
                onAssignIndividual={() => setShowAssignModal(true)}
                onReprocess={handleReprocess}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </Dialog.Panel>
      </div>

      <AssignIndividualModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        photoId={photo.id}
        currentIndividualId={photo.individualId}
        onSuccess={() => setShowAssignModal(false)}
      />
    </Dialog>
  )
}
