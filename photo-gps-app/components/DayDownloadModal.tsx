"use client"

import { useState } from "react"
import { Dialog } from "@headlessui/react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import JSZip from "jszip"
import Button from "./Button"
import { Photo } from "@/types/photo"

interface DayDownloadModalProps {
  date: Date
  photos: Photo[]
  isOpen: boolean
  onClose: () => void
}

type ImageType = "original" | "cropped" | "segmented"

export default function DayDownloadModal({
  date,
  photos,
  isOpen,
  onClose,
}: DayDownloadModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<ImageType[]>(["original"])
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<string>("")

  // Count how many photos have each type
  const typeCounts = {
    original: photos.length,
    cropped: photos.filter((p) => p.croppedUrl).length,
    segmented: photos.filter((p) => p.segmentedUrl).length,
  }

  const toggleType = (type: ImageType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting all types
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== type)
      }
      return [...prev, type]
    })
  }

  // Sanitize filename to remove invalid characters
  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid chars
      .replace(/\s+/g, "_") // Replace spaces
      .replace(/_+/g, "_") // Remove duplicate underscores
      .substring(0, 100) // Limit length
  }

  const handleDownload = async () => {
    if (selectedTypes.length === 0) return

    setIsDownloading(true)
    setDownloadProgress("Préparation du téléchargement...")

    try {
      const zip = new JSZip()
      const dateStr = format(date, "yyyy-MM-dd")

      // Build the list of images to download
      const imagesToDownload: { url: string; filename: string }[] = []

      photos.forEach((photo, index) => {
        const baseName = sanitizeFilename(
          photo.title || photo.originalName.replace(/\.[^/.]+$/, "") || `photo_${index + 1}`
        )

        if (selectedTypes.includes("original")) {
          imagesToDownload.push({
            url: photo.url,
            filename: `${dateStr}_${baseName}_original.jpg`,
          })
        }
        if (selectedTypes.includes("cropped") && photo.croppedUrl) {
          imagesToDownload.push({
            url: photo.croppedUrl,
            filename: `${dateStr}_${baseName}_cropped.jpg`,
          })
        }
        if (selectedTypes.includes("segmented") && photo.segmentedUrl) {
          imagesToDownload.push({
            url: photo.segmentedUrl,
            filename: `${dateStr}_${baseName}_segmented.png`,
          })
        }
      })

      // Download all images and add to ZIP
      let downloadedCount = 0
      const totalImages = imagesToDownload.length

      for (const image of imagesToDownload) {
        try {
          setDownloadProgress(
            `Téléchargement ${downloadedCount + 1}/${totalImages}...`
          )

          const response = await fetch(image.url)
          if (response.ok) {
            const blob = await response.blob()
            zip.file(image.filename, blob)
            downloadedCount++
          }
        } catch (error) {
          console.error(`Failed to download ${image.filename}:`, error)
        }
      }

      setDownloadProgress("Création du fichier ZIP...")

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })

      // Download the ZIP file
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `salamandres_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setDownloadProgress("Téléchargement terminé !")
      setTimeout(() => {
        onClose()
        setDownloadProgress("")
      }, 1000)
    } catch (error) {
      console.error("Download error:", error)
      setDownloadProgress("Erreur lors du téléchargement")
    } finally {
      setIsDownloading(false)
    }
  }

  const totalSelectedImages =
    (selectedTypes.includes("original") ? typeCounts.original : 0) +
    (selectedTypes.includes("cropped") ? typeCounts.cropped : 0) +
    (selectedTypes.includes("segmented") ? typeCounts.segmented : 0)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl">
          <Dialog.Title className="mb-4 text-xl font-semibold">
            Télécharger les images
          </Dialog.Title>

          <p className="text-muted-foreground mb-6">
            Sélectionnez les types d&apos;images à télécharger pour le{" "}
            <strong className="text-foreground">
              {format(date, "d MMMM yyyy", { locale: fr })}
            </strong>
          </p>

          {/* Image type selection */}
          <div className="mb-6 space-y-3">
            {/* Original */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                selectedTypes.includes("original")
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("original")}
                  onChange={() => toggleType("original")}
                  className="text-primary focus:ring-primary h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">Images originales</p>
                  <p className="text-muted-foreground text-sm">
                    Photos complètes redimensionnées
                  </p>
                </div>
              </div>
              <span className="bg-muted rounded-full px-2.5 py-1 text-sm font-medium">
                {typeCounts.original}
              </span>
            </label>

            {/* Cropped */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                typeCounts.cropped === 0
                  ? "cursor-not-allowed opacity-50"
                  : selectedTypes.includes("cropped")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("cropped")}
                  onChange={() => toggleType("cropped")}
                  disabled={typeCounts.cropped === 0}
                  className="text-primary focus:ring-primary h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">Images recadrées</p>
                  <p className="text-muted-foreground text-sm">
                    Salamandres détectées et recadrées
                  </p>
                </div>
              </div>
              <span className="bg-muted rounded-full px-2.5 py-1 text-sm font-medium">
                {typeCounts.cropped}
              </span>
            </label>

            {/* Segmented */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                typeCounts.segmented === 0
                  ? "cursor-not-allowed opacity-50"
                  : selectedTypes.includes("segmented")
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("segmented")}
                  onChange={() => toggleType("segmented")}
                  disabled={typeCounts.segmented === 0}
                  className="text-primary focus:ring-primary h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">Images segmentées</p>
                  <p className="text-muted-foreground text-sm">
                    Salamandres avec fond supprimé
                  </p>
                </div>
              </div>
              <span className="bg-muted rounded-full px-2.5 py-1 text-sm font-medium">
                {typeCounts.segmented}
              </span>
            </label>
          </div>

          {/* Summary */}
          <div className="bg-muted mb-6 rounded-lg p-3 text-center">
            <p className="text-sm">
              <strong className="text-foreground">{totalSelectedImages}</strong>{" "}
              <span className="text-muted-foreground">
                image{totalSelectedImages > 1 ? "s" : ""} à télécharger
              </span>
            </p>
          </div>

          {/* Progress */}
          {downloadProgress && (
            <div className="mb-4 text-center">
              <p className="text-muted-foreground text-sm">{downloadProgress}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="secondary" disabled={isDownloading}>
              Annuler
            </Button>
            <Button
              onClick={handleDownload}
              variant="primary"
              isLoading={isDownloading}
              disabled={totalSelectedImages === 0}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Télécharger
              </span>
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
