"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import imageCompression from "browser-image-compression"
import { IMAGE_CONFIG } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"
import ProgressBar from "./ProgressBar"

export interface BulkImportResult {
  /** Imported photos with a salamander detected — candidates for identification. */
  detected: Photo[]
  /** Filenames imported but where no salamander was detected. */
  noDetection: string[]
  /** Files that failed to import (duplicates, quota, errors…). */
  errors: { filename: string; message: string }[]
}

interface BulkImportDropzoneProps {
  onComplete: (result: BulkImportResult) => void
  /** Disable interaction while the page is busy (e.g. running identification). */
  busy?: boolean
  className?: string
}

// Compress on the client while preserving EXIF (GPS/date), mirroring PhotoUpload.
async function compressImage(file: File): Promise<File> {
  if (file.size < IMAGE_CONFIG.MAX_UPLOAD_SIZE_BYTES) {
    return file
  }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: IMAGE_CONFIG.TARGET_SIZE_MB,
      maxWidthOrHeight: IMAGE_CONFIG.THUMBNAIL_SIZE,
      useWebWorker: true,
      preserveExif: true,
    })
    if (compressed.name === "blob" || !compressed.name) {
      return new File([compressed], file.name, {
        type: compressed.type,
        lastModified: compressed.lastModified,
      })
    }
    return compressed
  } catch (error) {
    logger.error("Compression failed:", error)
    return file
  }
}

function uploadErrorMessage(status: number, serverError: string): string {
  switch (status) {
    case 401:
      return "Vous devez être connecté pour importer des photos"
    case 400:
      if (serverError.includes("must be an image")) return "Le fichier doit être une image"
      if (serverError.includes("too large")) return "Fichier trop volumineux (max 10 MB)"
      return `Format invalide : ${serverError}`
    case 409:
      return "Cette photo existe déjà dans votre galerie"
    case 413:
      return "Fichier trop volumineux (max 10 MB après compression)"
    case 507:
      return "Quota de stockage atteint. Supprimez des photos pour en ajouter de nouvelles"
    case 500:
      return "Erreur lors du traitement de l'image. Réessayez avec une autre photo"
    default:
      return `Erreur ${status}: ${serverError}`
  }
}

export default function BulkImportDropzone({
  onComplete,
  busy = false,
  className,
}: BulkImportDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [detectedCount, setDetectedCount] = useState(0)
  const [noDetectionCount, setNoDetectionCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [currentName, setCurrentName] = useState("")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      setUploading(true)
      setTotal(acceptedFiles.length)
      setDone(0)
      setDetectedCount(0)
      setNoDetectionCount(0)
      setErrorCount(0)

      const result: BulkImportResult = { detected: [], noDetection: [], errors: [] }

      for (const file of acceptedFiles) {
        setCurrentName(file.name)
        try {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append("file", compressed)

          const response = await fetchWithCsrf("/api/photos/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(uploadErrorMessage(response.status, data.error ?? "Erreur d'upload"))
          }

          const data = await response.json().catch(() => null)
          const photo: Photo | undefined = data?.photo
          if (!photo) {
            throw new Error("Réponse inattendue du serveur")
          }

          if (photo.salamanderDetected === false) {
            result.noDetection.push(file.name)
            setNoDetectionCount((c) => c + 1)
          } else {
            result.detected.push(photo)
            setDetectedCount((c) => c + 1)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Erreur inconnue"
          result.errors.push({ filename: file.name, message })
          setErrorCount((c) => c + 1)
        } finally {
          setDone((d) => d + 1)
        }
      }

      setUploading(false)
      setCurrentName("")
      onComplete(result)
    },
    [onComplete]
  )

  const disabled = uploading || busy

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic"] },
    multiple: true,
    disabled,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className={`flex w-full flex-col ${className ?? ""}`}>
      <div
        {...getRootProps()}
        className={`flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-12 py-16 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border"
        } ${disabled ? "opacity-90" : ""}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex w-full max-w-md flex-col gap-4">
            <ProgressBar done={done} total={total} label="Photos importées" />
            <div className="text-secondary-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              <span className="text-accent">✓ {detectedCount} détectée{detectedCount > 1 ? "s" : ""}</span>
              <span>⚠ {noDetectionCount} sans salamandre</span>
              <span className="text-destructive">✗ {errorCount} en échec</span>
            </div>
            {currentName && (
              <p className="text-muted-foreground truncate text-xs italic">
                Traitement de {currentName}…
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-secondary flex h-20 w-20 items-center justify-center rounded-full">
              <svg
                className="text-primary h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-primary text-2xl font-semibold">
                {isDragActive ? "Déposez vos photos" : "Glissez-déposez vos photos ici"}
              </p>
              <p className="text-secondary-foreground text-base">
                Importez plusieurs photos à la fois (JPG, PNG max. 10 MB chacune)
              </p>
            </div>
            <button
              type="button"
              onClick={open}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-lg px-8 py-3 text-sm font-medium transition-colors"
            >
              Sélectionner des images
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
