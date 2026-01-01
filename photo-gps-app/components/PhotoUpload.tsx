"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"

interface PhotoUploadProps {
  onUploadComplete: () => void
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<string[]>([])
  const [error, setError] = useState("")

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError("")
    setUploadProgress([])

    for (const file of acceptedFiles) {
      try {
        setUploadProgress((prev) => [...prev, `Uploading ${file.name}...`])

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Upload failed")
        }

        setUploadProgress((prev) => [
          ...prev,
          `✓ ${file.name} uploaded successfully`,
        ])
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setUploadProgress((prev) => [...prev, `✗ ${file.name} failed: ${message}`])
        setError("Some files failed to upload")
      }
    }

    setTimeout(() => {
      setUploadProgress([])
      onUploadComplete()
    }, 2000)
  }, [onUploadComplete])

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
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-muted/30"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-16 h-16 text-muted-foreground"
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
            <p className="text-lg font-medium text-foreground">
              {isDragActive
                ? "Drop photos here"
                : "Drag & drop photos here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
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
        <div className="mt-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}
