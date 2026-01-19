import { format } from "date-fns"
import Image from "next/image"
import { Photo } from "@/types/photo"

export type GridSize = "small" | "medium" | "large"

interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
  gridSize?: GridSize
}

const gridSizeClasses: Record<GridSize, string> = {
  small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  large: "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}

// Helper function to calculate metadata completeness
function getMetadataQuality(photo: Photo): { label: string; color: string } {
  const hasGPS = photo.latitude && photo.longitude
  const hasCamera = photo.cameraMake || photo.cameraModel
  const hasExif = photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength
  const hasDate = photo.takenAt

  const score = [hasGPS, hasCamera, hasExif, hasDate].filter(Boolean).length

  if (score >= 3) return { label: "excellent", color: "bg-amber-50 text-amber-700" }
  if (score === 2) return { label: "fair", color: "bg-amber-50 text-amber-700" }
  if (score === 1) return { label: "partial", color: "bg-slate-200 text-slate-700" }
  return { label: "minimal", color: "bg-slate-200 text-slate-700" }
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

// Helper to get location name (simplified for now)
function getLocationLabel(photo: Photo): string | null {
  if (!photo.latitude || !photo.longitude) return null
  // For now, just show coordinates - could be enhanced with reverse geocoding
  return `${photo.latitude.toFixed(2)}°, ${photo.longitude.toFixed(2)}°`
}

export default function PhotoGrid({ photos, onPhotoClick, gridSize = "medium" }: PhotoGridProps) {
  return (
    <div className={`grid ${gridSizeClasses[gridSize]} gap-6`}>
      {photos.map((photo) => {
        const quality = getMetadataQuality(photo)
        const location = getLocationLabel(photo)
        const hasExifData = photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength

        return (
          <div
            key={photo.id}
            onClick={() => onPhotoClick(photo)}
            className="group bg-card border-border hover:border-primary cursor-pointer overflow-hidden rounded-2xl border-2 shadow-md transition-all duration-300 hover:shadow-xl"
          >
            {/* Image container with fixed aspect ratio */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={photo.url}
                alt={photo.title || photo.originalName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              {/* Badges overlay */}
              <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2">
                {/* Quality badge */}
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-medium lowercase ${quality.color}`}
                >
                  {quality.label}
                </span>

                {/* EXIF badge */}
                {hasExifData && (
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-700/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span className="text-xs font-medium text-white">EXIF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card content */}
            <div className="space-y-2 p-4">
              {/* Title and date */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-foreground line-clamp-1 flex-1 text-base font-semibold">
                  {photo.title || photo.originalName}
                </h3>
                {photo.takenAt && (
                  <span className="bg-accent/20 text-accent shrink-0 rounded px-2 py-1 text-xs font-medium">
                    {format(new Date(photo.takenAt), "dd/MM/yy")}
                  </span>
                )}
              </div>

              {/* Subtitle */}
              <p className="text-muted-foreground line-clamp-1 text-sm italic">
                {photo.cameraModel || photo.originalName}
              </p>

              {/* Individual name */}
              {photo.individual && (
                <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="line-clamp-1">{photo.individual.name}</span>
                </div>
              )}

              {/* Location */}
              {location && (
                <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <svg
                    className="text-primary h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="line-clamp-1">{location}</span>
                </div>
              )}

              {/* Size info */}
              <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <svg
                  className="text-primary h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Taille: {formatFileSize(photo.fileSize)}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {photo.latitude && photo.longitude && (
                  <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                    GPS
                  </span>
                )}
                {photo.cameraMake && (
                  <span className="bg-muted text-muted-foreground line-clamp-1 rounded px-2 py-1 text-xs">
                    {photo.cameraMake}
                  </span>
                )}
                {photo.iso && (
                  <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                    ISO {photo.iso}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
