"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Button from "./Button"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

const BULK_PROCESS_BATCH_SIZE = 50

interface BulkProcessModalProps {
  date: Date
  isOpen: boolean
  onClose: () => void
  onProcessComplete: () => void
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

export default function BulkProcessModal({
  date,
  isOpen,
  onClose,
  onProcessComplete,
}: BulkProcessModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingIds, setIsLoadingIds] = useState(false)
  const [processProgress, setProcessProgress] = useState<string>("")
  const [results, setResults] = useState<ProcessResult[] | null>(null)
  const [allPhotoIds, setAllPhotoIds] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fetch all photo IDs for this day when the modal opens
  useEffect(() => {
    if (!isOpen) return

    const fetchAllIds = async () => {
      setIsLoadingIds(true)
      setLoadError(null)
      try {
        const dayKey = format(date, "yyyy-MM-dd")
        const response = await fetch(`/api/photos/ids-by-day?date=${dayKey}`)
        if (response.ok) {
          const data = await response.json()
          setAllPhotoIds(data.photoIds)
        } else {
          const data = await response.json()
          setLoadError(data.error || "Erreur lors de la récupération des photos")
        }
      } catch {
        setLoadError("Erreur réseau lors de la récupération des photos")
      } finally {
        setIsLoadingIds(false)
      }
    }

    fetchAllIds()
  }, [isOpen, date])

  const handleProcess = async () => {
    if (allPhotoIds.length === 0) return

    setIsProcessing(true)
    setProcessProgress("Lancement du traitement...")
    setResults(null)

    try {
      const allResults: ProcessResult[] = []
      const totalBatches = Math.ceil(allPhotoIds.length / BULK_PROCESS_BATCH_SIZE)

      for (let i = 0; i < allPhotoIds.length; i += BULK_PROCESS_BATCH_SIZE) {
        const batch = allPhotoIds.slice(i, i + BULK_PROCESS_BATCH_SIZE)
        const batchNum = Math.floor(i / BULK_PROCESS_BATCH_SIZE) + 1

        setProcessProgress(
          totalBatches > 1
            ? `Lot ${batchNum}/${totalBatches} — Traitement de ${batch.length} photo${batch.length > 1 ? "s" : ""}...`
            : `Traitement de ${batch.length} photo${batch.length > 1 ? "s" : ""}...`
        )

        const response = await fetchWithCsrf("/api/photos/bulk-process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoIds: batch }),
        })

        if (response.ok) {
          const data = await response.json()
          allResults.push(...data.results)
        } else {
          const data = await response.json()
          // Add failure entries for this batch
          batch.forEach((id) =>
            allResults.push({
              photoId: id,
              success: false,
              error: data.error || "Erreur inconnue",
            })
          )
        }
      }

      setResults(allResults)
      const processedCount = allResults.filter((r) => r.success).length
      const failedCount = allResults.filter((r) => !r.success).length
      setProcessProgress(
        `Terminé : ${processedCount} réussite${processedCount > 1 ? "s" : ""}, ${failedCount} échec${failedCount > 1 ? "s" : ""}`
      )

      // Notify parent to refresh photos after a short delay
      setTimeout(() => {
        onProcessComplete()
      }, 1500)
    } catch (error) {
      console.error("Process error:", error)
      setProcessProgress("Erreur lors du traitement")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setResults(null)
      setProcessProgress("")
      setAllPhotoIds([])
      setLoadError(null)
      onClose()
    }
  }

  // Count stats
  const detectedCount = results?.filter((r) => r.salamanderDetected).length ?? 0
  const croppedCount = results?.filter((r) => r.hasCropped).length ?? 0
  const segmentedCount = results?.filter((r) => r.hasSegmented).length ?? 0
  const embeddingCount = results?.filter((r) => r.hasEmbedding).length ?? 0

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl">
          <Dialog.Title className="mb-4 text-xl font-semibold">
            Retraiter les images
          </Dialog.Title>

          <p className="text-muted-foreground mb-6">
            Cette action va retraiter toutes les images du{" "}
            <strong className="text-foreground">
              {format(date, "d MMMM yyyy", { locale: fr })}
            </strong>{" "}
            pour refaire la detection, le recadrage, la segmentation et les vecteurs.
          </p>

          {/* Summary before processing */}
          {!results && (
            <div className="bg-muted mb-6 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 text-primary rounded-full p-2">
                  {isLoadingIds ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  {loadError ? (
                    <p className="text-destructive text-sm">{loadError}</p>
                  ) : isLoadingIds ? (
                    <p className="text-muted-foreground text-sm">Chargement des photos...</p>
                  ) : (
                    <>
                      <p className="font-medium">
                        {allPhotoIds.length} photo{allPhotoIds.length > 1 ? "s" : ""} à retraiter
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Les images existantes seront remplacées
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results after processing */}
          {results && (
            <div className="mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{detectedCount}</p>
                  <p className="text-muted-foreground text-xs">Salamandres detectees</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{croppedCount}</p>
                  <p className="text-muted-foreground text-xs">Images recadrees</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{segmentedCount}</p>
                  <p className="text-muted-foreground text-xs">Images segmentees</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{embeddingCount}</p>
                  <p className="text-muted-foreground text-xs">Vecteurs generes</p>
                </div>
              </div>

              {/* Show errors if any */}
              {results.some((r) => !r.success) && (
                <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
                  <p className="text-destructive text-sm font-medium">
                    {results.filter((r) => !r.success).length} erreur
                    {results.filter((r) => !r.success).length > 1 ? "s" : ""}
                  </p>
                  <ul className="text-muted-foreground mt-1 text-xs">
                    {results
                      .filter((r) => !r.success)
                      .slice(0, 3)
                      .map((r) => (
                        <li key={r.photoId}>- {r.error || "Erreur inconnue"}</li>
                      ))}
                    {results.filter((r) => !r.success).length > 3 && (
                      <li>... et {results.filter((r) => !r.success).length - 3} autres</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {processProgress && (
            <div className="mb-4 text-center">
              <p className="text-muted-foreground text-sm">{processProgress}</p>
              {isProcessing && (
                <div className="bg-primary/20 mt-2 h-1 overflow-hidden rounded-full">
                  <div className="bg-primary h-full w-full animate-pulse"></div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} variant="secondary" disabled={isProcessing}>
              {results ? "Fermer" : "Annuler"}
            </Button>
            {!results && (
              <Button
                onClick={handleProcess}
                variant="primary"
                isLoading={isProcessing}
                disabled={isLoadingIds || allPhotoIds.length === 0 || !!loadError}
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
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
