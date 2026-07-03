"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import imageCompression from "browser-image-compression"
import { IMAGE_CONFIG } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface PhotoUploadProps {
  onUploadComplete: () => void
}

// Compress an image client-side while preserving EXIF data (GPS, date, camera info).
async function compressImage(file: File): Promise<File> {
  if (file.size < IMAGE_CONFIG.MAX_UPLOAD_SIZE_BYTES) {
    return file
  }

  try {
    const options = {
      maxSizeMB: IMAGE_CONFIG.TARGET_SIZE_MB,
      maxWidthOrHeight: IMAGE_CONFIG.THUMBNAIL_SIZE,
      useWebWorker: true,
      preserveExif: true,
    }

    const compressedFile = await imageCompression(file, options)

    // Ensure the filename is preserved (browser-image-compression sometimes loses it)
    if (compressedFile.name === "blob" || !compressedFile.name) {
      return new File([compressedFile], file.name, {
        type: compressedFile.type,
        lastModified: compressedFile.lastModified,
      })
    }

    return compressedFile
  } catch (error) {
    logger.error("Compression failed:", error)
    return file
  }
}

function getValidationErrorMessage(error: string): string {
  if (error.includes("No file")) return "Aucun fichier fourni"
  if (error.includes("must be an image")) return "Le fichier doit être une image"
  if (error.includes("too large")) return "Fichier trop volumineux (max 10 MB)"
  return `Format invalide : ${error}`
}

/** Map an upload HTTP status code to a user-friendly French message. */
function getUploadErrorMessage(status: number, error: string): string {
  switch (status) {
    case 401:
      return "Vous devez être connecté pour uploader des photos"
    case 400:
      return getValidationErrorMessage(error)
    case 409:
      return "Ce fichier existe déjà dans votre galerie"
    case 413:
      return "Fichier trop volumineux (max 10 MB après compression)"
    case 507:
      return "Quota de stockage atteint. Supprimez des photos pour en ajouter de nouvelles"
    case 500:
      return "Erreur lors du traitement de l'image. Réessayez avec une autre photo"
    default:
      return `Erreur ${status}: ${error}`
  }
}

type UploadOutcome = "success" | "no-detection" | "error"

/** Compress, upload, and report progress for a single file. Never throws. */
async function uploadSingleFile(
  file: File,
  onProgress: (message: string, replaceLast?: boolean) => void
): Promise<UploadOutcome> {
  try {
    onProgress(`Préparation de ${file.name}...`)

    const compressedFile = await compressImage(file)
    const sizeBefore = (file.size / 1024 / 1024).toFixed(2)
    const sizeAfter = (compressedFile.size / 1024 / 1024).toFixed(2)
    onProgress(`Upload de ${file.name} (${sizeBefore}MB → ${sizeAfter}MB)...`, true)

    const formData = new FormData()
    formData.append("file", compressedFile)

    const response = await fetchWithCsrf("/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(getUploadErrorMessage(response.status, data.error || "Erreur d'upload"))
    }

    // Read the 201 payload to surface the detection outcome. A successful
    // upload with salamanderDetected === false means the photo was stored
    // but the ML pipeline found no salamander to crop/segment/embed — it
    // cannot be matched against known individuals until re-shot.
    const data = await response.json().catch(() => null)
    if (data?.photo?.salamanderDetected === false) {
      onProgress(`⚠ ${file.name} : aucune salamandre détectée`)
      return "no-detection"
    }

    onProgress(`✓ ${file.name} importé avec succès`)
    return "success"
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"
    onProgress(`✗ ${file.name} : ${message}`)
    return "error"
  }
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<string[]>([])
  const [error, setError] = useState("")
  // Files uploaded successfully but where no salamander was detected (HTTP 201,
  // photo.salamanderDetected === false). Tracked separately from errors: it is a
  // valid outcome, not a failure.
  const [noDetectionFiles, setNoDetectionFiles] = useState<string[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError("")
      setUploadProgress([])
      setNoDetectionFiles([])
      let successCount = 0
      let hasError = false

      const reportProgress = (message: string, replaceLast = false) =>
        setUploadProgress((prev) => (replaceLast ? [...prev.slice(0, -1), message] : [...prev, message]))

      for (const file of acceptedFiles) {
        const outcome = await uploadSingleFile(file, reportProgress)
        if (outcome === "success" || outcome === "no-detection") successCount++
        if (outcome === "no-detection") setNoDetectionFiles((prev) => [...prev, file.name])
        if (outcome === "error") hasError = true
      }

      if (hasError) {
        setError("Certains fichiers n'ont pas pu être uploadés. Consultez les détails ci-dessus.")
      }

      // Only reload gallery if at least one upload succeeded
      setTimeout(() => {
        setUploadProgress([])
        if (successCount > 0) {
          onUploadComplete()
        }
      }, 2000)
    },
    [onUploadComplete]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic"],
    },
    multiple: true,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 bg-muted/30"
        } `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <svg
            className="text-muted-foreground h-16 w-16"
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

          <div>
            <p className="text-foreground text-lg font-medium">
              {isDragActive ? "Drop photos here" : "Drag & drop photos here, or click to select"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Supports JPEG, PNG, GIF, WebP, and HEIC
            </p>
          </div>
        </div>
      </div>

      {uploadProgress.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadProgress.map((message, index) => (
            <p
              key={index}
              className={`text-sm ${
                message.startsWith("✓")
                  ? "text-accent"
                  : message.startsWith("✗")
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {message}
            </p>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border-destructive text-destructive mt-4 rounded-lg border px-4 py-3">
          {error}
        </div>
      )}

      {noDetectionFiles.length > 0 && (
        <div className="bg-muted/50 border-border mt-4 rounded-lg border px-4 py-3">
          <div className="flex items-start gap-3">
            <svg
              className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              />
            </svg>
            <div className="text-sm">
              <p className="text-foreground font-medium">
                {noDetectionFiles.length > 1
                  ? `Aucune salamandre détectée sur ${noDetectionFiles.length} photos`
                  : "Aucune salamandre détectée sur cette photo"}
              </p>
              <p className="text-muted-foreground mt-1">
                {noDetectionFiles.join(", ")} {noDetectionFiles.length > 1 ? "ont" : "a"} bien été
                importée{noDetectionFiles.length > 1 ? "s" : ""}, mais ne pourr
                {noDetectionFiles.length > 1 ? "ont" : "a"} pas être comparée
                {noDetectionFiles.length > 1 ? "s" : ""} aux individus connus. Pour une meilleure
                détection, utilisez une photo nette du dos de la salamandre, prise de dessus et bien
                éclairée.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
