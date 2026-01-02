"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import imageCompression from "browser-image-compression"

interface PhotoUploadProps {
  onUploadComplete: () => void
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<string[]>([])
  const [error, setError] = useState("")

  // Compress image on client side while preserving EXIF data
  const compressImage = async (file: File): Promise<File> => {
    // If file is already small enough (< 4MB), return as-is
    if (file.size < 4 * 1024 * 1024) {
      return file
    }

    try {
      const options = {
        maxSizeMB: 3.5, // Target max size: 3.5MB (under Vercel's 4.5MB limit)
        maxWidthOrHeight: 800, // Max dimension (proportional resize)
        useWebWorker: true,
        preserveExif: true, // CRITICAL: Preserve EXIF data (GPS, date, camera info)
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
      console.error("Compression failed:", error)
      // If compression fails, return original file
      return file
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError("")
      setUploadProgress([])
      let successCount = 0

      for (const file of acceptedFiles) {
        try {
          setUploadProgress((prev) => [...prev, `Préparation de ${file.name}...`])

          // Compress image before upload
          const compressedFile = await compressImage(file)
          const sizeBefore = (file.size / 1024 / 1024).toFixed(2)
          const sizeAfter = (compressedFile.size / 1024 / 1024).toFixed(2)

          setUploadProgress((prev) => [
            ...prev.slice(0, -1),
            `Upload de ${file.name} (${sizeBefore}MB → ${sizeAfter}MB)...`,
          ])

          const formData = new FormData()
          formData.append("file", compressedFile)

          const response = await fetch("/api/photos/upload", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json()

            // Map HTTP status codes to user-friendly French messages
            let errorMessage = data.error || "Erreur d'upload"

            switch (response.status) {
              case 401:
                errorMessage = "Vous devez être connecté pour uploader des photos"
                break
              case 400:
                // Validation errors - use server message if available
                if (data.error.includes("No file")) {
                  errorMessage = "Aucun fichier fourni"
                } else if (data.error.includes("must be an image")) {
                  errorMessage = "Le fichier doit être une image"
                } else if (data.error.includes("too large")) {
                  errorMessage = "Fichier trop volumineux (max 10 MB)"
                } else {
                  errorMessage = `Format invalide : ${data.error}`
                }
                break
              case 409:
                errorMessage = "Ce fichier existe déjà dans votre galerie"
                break
              case 413:
                errorMessage = "Fichier trop volumineux (max 10 MB après compression)"
                break
              case 507:
                errorMessage =
                  "Quota de stockage atteint. Supprimez des photos pour en ajouter de nouvelles"
                break
              case 500:
                errorMessage =
                  "Erreur lors du traitement de l'image. Réessayez avec une autre photo"
                break
              default:
                errorMessage = `Erreur ${response.status}: ${data.error}`
            }

            throw new Error(errorMessage)
          }

          successCount++
          setUploadProgress((prev) => [...prev, `✓ ${file.name} uploaded successfully`])
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Erreur inconnue"
          setUploadProgress((prev) => [...prev, `✗ ${file.name} : ${message}`])
          setError("Certains fichiers n'ont pas pu être uploadés. Consultez les détails ci-dessus.")
        }
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
    </div>
  )
}
