"use client"

import { useState } from "react"
import { Dialog } from "@headlessui/react"
import { format } from "date-fns"
import Image from "next/image"
import Input from "./Input"
import Button from "./Button"
import { Photo } from "@/types/photo"
import { logger } from "@/lib/logger"

interface PhotoDetailsModalProps {
  photo: Photo
  onClose: () => void
  onUpdate: (photo: Photo) => void
  onDelete: (photoId: string) => void
}

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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
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
      const response = await fetch(`/api/photos/${photo.id}`, {
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

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl shadow-xl">
          <div className="grid gap-6 p-6 md:grid-cols-2">
            {/* Image Section */}
            <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={`${photo.croppedUrl || photo.url}?v=${photo.updatedAt || photo.createdAt}`}
                alt={photo.originalName}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={photo.isCropped}
              />
              {photo.croppedUrl && (
                <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-medium">
                  Cropped
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Add a title"
                      className="mb-2"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold">{photo.title || photo.originalName}</h2>
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

              {/* Actions */}
              <div className="border-border flex gap-2 border-t pt-4">
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
    </Dialog>
  )
}
