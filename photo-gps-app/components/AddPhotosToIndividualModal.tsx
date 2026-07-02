"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog } from "@headlessui/react"
import Image from "next/image"
import { Photo } from "@/types/photo"
import Button from "./Button"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface AddPhotosToIndividualModalProps {
  isOpen: boolean
  onClose: () => void
  individualId: string
  onSuccess?: () => void
}

export default function AddPhotosToIndividualModal({
  isOpen,
  onClose,
  individualId,
  onSuccess,
}: AddPhotosToIndividualModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/photos?limit=100&sortBy=date&sortOrder=desc")
      if (!response.ok) {
        throw new Error("Échec du chargement des photos")
      }
      const data = await response.json()
      // Exclure les photos déjà rattachées à cet individu
      const assignable: Photo[] = (data.photos as Photo[]).filter(
        (photo) => photo.individualId !== individualId
      )
      setPhotos(assignable)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [individualId])

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
      setError(null)
      fetchPhotos()
    }
  }, [isOpen, fetchPhotos])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      setError("Sélectionnez au moins une photo")
      return
    }

    setAssigning(true)
    setError(null)

    try {
      for (const photoId of selectedIds) {
        const response = await fetchWithCsrf(`/api/individuals/${individualId}/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoId }),
        })

        if (!response.ok) {
          throw new Error("Échec de l'assignation d'une photo")
        }
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl shadow-xl">
          <div className="border-border flex items-start justify-between border-b p-6">
            <div>
              <Dialog.Title className="text-2xl font-bold">Assigner des photos</Dialog.Title>
              <p className="text-muted-foreground mt-1 text-sm">
                Sélectionnez les photos à rattacher à cet individu.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              disabled={assigning}
              aria-label="Fermer"
            >
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

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-muted-foreground py-12 text-center">Chargement des photos…</div>
            ) : photos.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                Aucune photo disponible à assigner.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {photos.map((photo) => {
                  const isSelected = selectedIds.has(photo.id)
                  const assignedElsewhere = photo.individualId !== null
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => toggleSelection(photo.id)}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        isSelected ? "border-primary" : "border-transparent hover:border-border"
                      }`}
                    >
                      <Image
                        src={photo.croppedUrl || photo.url}
                        alt={photo.title || "Photo"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 20vw"
                      />
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-sm">
                          ✓
                        </div>
                      )}
                      {assignedElsewhere && (
                        <div className="absolute right-0 bottom-0 left-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                          {photo.individual?.name || "Déjà assignée"}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {error && (
              <div className="text-destructive bg-destructive/10 mt-4 rounded p-3 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="border-border flex items-center justify-between gap-2 border-t p-6">
            <span className="text-muted-foreground text-sm">
              {selectedIds.size} sélectionnée{selectedIds.size !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={assigning}>
                Annuler
              </Button>
              <Button onClick={handleAssign} isLoading={assigning}>
                Assigner
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
