"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Button from "./Button"
import BulkProcessSummary from "./BulkProcessSummary"
import BulkProcessResults from "./BulkProcessResults"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { PhotoProcessResult } from "@/types/photo"

const BULK_PROCESS_BATCH_SIZE = 5

interface BulkProcessModalProps {
  date: Date
  isOpen: boolean
  onClose: () => void
  onProcessComplete: () => void
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
  const [results, setResults] = useState<PhotoProcessResult[] | null>(null)
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
      const allResults: PhotoProcessResult[] = []
      const totalBatches = Math.ceil(allPhotoIds.length / BULK_PROCESS_BATCH_SIZE)

      for (let i = 0; i < allPhotoIds.length; i += BULK_PROCESS_BATCH_SIZE) {
        const batch = allPhotoIds.slice(i, i + BULK_PROCESS_BATCH_SIZE)
        const batchNum = Math.floor(i / BULK_PROCESS_BATCH_SIZE) + 1

        const processed = i
        setProcessProgress(
          `Traitement : ${processed}/${allPhotoIds.length} photo${allPhotoIds.length > 1 ? "s" : ""} (lot ${batchNum}/${totalBatches})...`
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
            <BulkProcessSummary
              isLoadingIds={isLoadingIds}
              loadError={loadError}
              photoCount={allPhotoIds.length}
            />
          )}

          {/* Results after processing */}
          {results && <BulkProcessResults results={results} />}

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
