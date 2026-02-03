"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import { format } from "date-fns"
import Image from "next/image"
import Input from "./Input"
import Button from "./Button"
import AssignIndividualModal from "./AssignIndividualModal"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface SimilarPhoto {
  id: string
  filename: string
  url: string
  croppedUrl: string | null
  segmentedUrl: string | null
  title: string | null
  description: string | null
  takenAt: Date | null
  latitude: number | null
  longitude: number | null
  distance: number
  similarityScore: number
  confidence?: string
  isSame?: boolean
  matches?: number
  inliers?: number
}

interface ProcessResult {
  photoId: string
  success: boolean
  error?: string
  salamanderDetected?: boolean
  hasCropped?: boolean
  hasSegmented?: boolean
  hasEmbedding?: boolean
}

interface PhotoDetailsModalProps {
  photo: Photo
  onClose: () => void
  onUpdate: (photo: Photo) => void
  onDelete: (photoId: string) => void
}

type ImageView = "original" | "cropped" | "segmented"

export default function PhotoDetailsModal({
  photo,
  onClose,
  onUpdate,
  onDelete,
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
  const [reprocessResult, setReprocessResult] = useState<ProcessResult | null>(null)

  // Determine default view: cropped if available, otherwise original
  const defaultView: ImageView = photo.croppedUrl ? "cropped" : "original"
  const [currentView, setCurrentView] = useState<ImageView>(defaultView)

  // Load similar photos on mount
  useEffect(() => {
    const loadSimilarPhotos = async () => {
      setIsLoadingSimilar(true)
      try {
        const response = await fetch(`/api/photos/${photo.id}/similar`)
        if (response.ok) {
          const data = await response.json()
          setSimilarPhotos(data)
        } else if (response.status === 400) {
          // Photo doesn't have an embedding vector
          setSimilarPhotos([])
        }
      } catch (error) {
        logger.error("Failed to load similar photos:", error)
      } finally {
        setIsLoadingSimilar(false)
      }
    }

    loadSimilarPhotos()
  }, [photo.id])

  // Get current image URL based on selected view
  const getCurrentImageUrl = () => {
    switch (currentView) {
      case "segmented":
        return photo.segmentedUrl || photo.croppedUrl || photo.url
      case "cropped":
        return photo.croppedUrl || photo.url
      case "original":
      default:
        return photo.url
    }
  }

  // Get label for current view
  const getViewLabel = (view: ImageView) => {
    switch (view) {
      case "original":
        return "Original"
      case "cropped":
        return "Crop"
      case "segmented":
        return "Segment"
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetchWithCsrf(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/photos/${photo.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onDelete(photo.id)
      }
    } catch (error) {
      logger.error("Failed to delete photo:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReprocess = async () => {
    setIsReprocessing(true)
    setReprocessResult(null)

    try {
      const response = await fetchWithCsrf("/api/photos/bulk-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds: [photo.id] }),
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.results?.[0] as ProcessResult | undefined
        if (result) {
          setReprocessResult(result)
          // Fetch the updated photo to refresh the UI
          const photoResponse = await fetch(`/api/photos/${photo.id}`)
          if (photoResponse.ok) {
            const updatedData = await photoResponse.json()
            onUpdate(updatedData.photo)
            // Reload similar photos after reprocessing
            setIsLoadingSimilar(true)
            try {
              const similarResponse = await fetch(`/api/photos/${photo.id}/similar`)
              if (similarResponse.ok) {
                const similarData = await similarResponse.json()
                setSimilarPhotos(similarData)
              }
            } finally {
              setIsLoadingSimilar(false)
            }
          }
        }
      } else {
        const data = await response.json()
        setReprocessResult({
          photoId: photo.id,
          success: false,
          error: data.error || "Erreur inconnue",
        })
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

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl shadow-xl md:max-w-4xl">
          <div className="grid gap-6 p-6 md:grid-cols-2">
            {/* Image Section */}
            <div className="space-y-3">
              {/* View Tabs */}
              <div className="flex w-full gap-2">
                <button
                  onClick={() => setCurrentView("original")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    currentView === "original"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  Original
                </button>
                {photo.croppedUrl && (
                  <button
                    onClick={() => setCurrentView("cropped")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      currentView === "cropped"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    Crop
                  </button>
                )}
                {photo.segmentedUrl && (
                  <button
                    onClick={() => setCurrentView("segmented")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      currentView === "segmented"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    Segment
                  </button>
                )}
              </div>

              {/* Image Container */}
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={`${getCurrentImageUrl()}?v=${photo.updatedAt || photo.createdAt}`}
                  alt={photo.originalName}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={photo.isCropped}
                />
                {currentView !== "original" && (
                  <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-medium">
                    {getViewLabel(currentView)}
                  </div>
                )}
              </div>

              {/* Similar Photos Section */}
              {isLoadingSimilar ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Images similaires</h3>
                  <div className="text-muted-foreground text-sm">Chargement...</div>
                </div>
              ) : similarPhotos.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Images similaires</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {similarPhotos.map((similar) => {
                      return (
                        <div
                          key={similar.id}
                          className="bg-muted group relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-lg transition-transform hover:scale-105"
                        >
                          <Image
                            src={similar.segmentedUrl || similar.croppedUrl || similar.url}
                            alt={similar.title || similar.filename}
                            width={200}
                            height={200}
                            className="h-auto max-h-[180px] w-auto max-w-full object-contain"
                            sizes="150px"
                          />
                          {/* Confidence Badge */}
                          {similar.confidence && similar.confidence !== "unknown" && (
                            <div className="bg-black/70 text-white absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              {similar.confidence.toUpperCase()}
                            </div>
                          )}
                          {/* Same Individual Indicator */}
                          {similar.isSame && (
                            <div className="bg-blue-500/90 text-white absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              ✓ MÊME INDIVIDU
                            </div>
                          )}
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-white">
                              <div className="w-full truncate font-medium" title={similar.title || similar.filename}>
                                {similar.title || similar.filename}
                              </div>
                              {similar.matches !== undefined && similar.inliers !== undefined && (
                                <div className="text-[10px] opacity-80">
                                  {similar.matches} matches, {similar.inliers} inliers
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Details Section */}
            <div className="space-y-6">
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
                    <h2 className="truncate text-2xl font-bold" title={photo.title || photo.originalName}>{photo.title || photo.originalName}</h2>
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

              {/* EXIF Data */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Photo Information</h3>

                {photo.individual && (
                  <div>
                    <p className="text-muted-foreground text-sm">Individual</p>
                    <div className="text-primary flex items-center gap-2 font-medium">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>{photo.individual.name}</span>
                    </div>
                  </div>
                )}

                {photo.takenAt && (
                  <div>
                    <p className="text-muted-foreground text-sm">Date Taken</p>
                    <p className="font-medium">{format(new Date(photo.takenAt), "PPpp")}</p>
                  </div>
                )}

                {photo.latitude && photo.longitude && (
                  <div>
                    <p className="text-muted-foreground text-sm">Location</p>
                    <p className="font-medium">
                      {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                {(photo.cameraMake || photo.cameraModel) && (
                  <div>
                    <p className="text-muted-foreground text-sm">Camera</p>
                    <p className="font-medium">
                      {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                    </p>
                  </div>
                )}

                {(photo.iso || photo.aperture || photo.shutterSpeed || photo.focalLength) && (
                  <div>
                    <p className="text-muted-foreground text-sm">Camera Settings</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {photo.iso && (
                        <span className="bg-muted rounded px-2 py-1 text-sm">ISO {photo.iso}</span>
                      )}
                      {photo.aperture && (
                        <span className="bg-muted rounded px-2 py-1 text-sm">{photo.aperture}</span>
                      )}
                      {photo.shutterSpeed && (
                        <span className="bg-muted rounded px-2 py-1 text-sm">
                          {photo.shutterSpeed}
                        </span>
                      )}
                      {photo.focalLength && (
                        <span className="bg-muted rounded px-2 py-1 text-sm">
                          {photo.focalLength}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reprocess Result */}
              {reprocessResult && (
                <div className={`rounded-lg p-4 ${reprocessResult.success ? "bg-muted" : "bg-destructive/10"}`}>
                  {reprocessResult.success ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Retraitement terminé
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={reprocessResult.salamanderDetected ? "text-green-600" : "text-muted-foreground"}>
                            {reprocessResult.salamanderDetected ? "✓" : "✗"}
                          </span>
                          <span>Salamandre détectée</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={reprocessResult.hasCropped ? "text-green-600" : "text-muted-foreground"}>
                            {reprocessResult.hasCropped ? "✓" : "✗"}
                          </span>
                          <span>Image recadrée</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={reprocessResult.hasSegmented ? "text-green-600" : "text-muted-foreground"}>
                            {reprocessResult.hasSegmented ? "✓" : "✗"}
                          </span>
                          <span>Image segmentée</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={reprocessResult.hasEmbedding ? "text-green-600" : "text-muted-foreground"}>
                            {reprocessResult.hasEmbedding ? "✓" : "✗"}
                          </span>
                          <span>Vecteur généré</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-destructive text-sm">
                      Erreur : {reprocessResult.error}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="border-border flex flex-wrap gap-2 border-t pt-4">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} variant="primary" isLoading={isSaving}>
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false)
                        setTitle(photo.title || "")
                        setDescription(photo.description || "")
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setIsEditing(true)} variant="primary">
                      Edit
                    </Button>
                    <Button onClick={() => setShowAssignModal(true)} variant="secondary">
                      Assign Individual
                    </Button>
                    <Button
                      onClick={handleReprocess}
                      variant="secondary"
                      isLoading={isReprocessing}
                      disabled={isReprocessing}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Retraiter
                      </span>
                    </Button>
                    <Button onClick={handleDelete} variant="destructive" isLoading={isDeleting}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>

      {/* Assign Individual Modal */}
      <AssignIndividualModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        photoId={photo.id}
        currentIndividualId={photo.individualId}
        onSuccess={() => {
          setShowAssignModal(false)
          // Optionally refresh photo data here
        }}
      />
    </Dialog>
  )
}
