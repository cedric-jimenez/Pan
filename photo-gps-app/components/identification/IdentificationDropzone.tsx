"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import imageCompression from "browser-image-compression"
import { IMAGE_CONFIG } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"

interface IdentificationDropzoneProps {
  /** Called with the stored photo once a salamander was detected and embedded. */
  onUploaded: (photo: Photo) => void
  /** Called when the upload succeeded but no salamander was detected. */
  onNoDetection: (filename: string) => void
  /** Disable interaction while the page is busy (e.g. searching for matches). */
  busy?: boolean
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
      return "Vous devez être connecté pour identifier une salamandre"
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

export default function IdentificationDropzone({
  onUploaded,
  onNoDetection,
  busy = false,
}: IdentificationDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setError("")
      setUploading(true)
      try {
        setStatus(`Préparation de ${file.name}...`)
        const compressed = await compressImage(file)

        setStatus("Analyse de la photo (détection + empreinte biométrique)...")
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
          onNoDetection(file.name)
        } else {
          onUploaded(photo)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      } finally {
        setUploading(false)
        setStatus("")
      }
    },
    [onUploaded, onNoDetection]
  )

  const disabled = uploading || busy

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic"] },
    multiple: false,
    disabled,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-12 py-16 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border"
        } ${disabled ? "opacity-70" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className="bg-secondary flex h-20 w-20 items-center justify-center rounded-full">
            {disabled ? (
              <svg className="text-primary h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
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
            ) : (
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
            )}
          </div>

          {disabled ? (
            <p className="text-secondary-foreground text-base">{status || "Traitement en cours..."}</p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-primary text-2xl font-semibold">
                  {isDragActive ? "Déposez la photo" : "Glissez-déposez votre photo ici"}
                </p>
                <p className="text-secondary-foreground text-base">
                  ou cliquez pour parcourir vos fichiers (JPG, PNG max. 10MB)
                </p>
              </div>
              <button
                type="button"
                onClick={open}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-lg px-8 py-3 text-sm font-medium transition-colors"
              >
                Sélectionner une image
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border-destructive text-destructive mt-4 rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
