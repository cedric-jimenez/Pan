import { format } from "date-fns"
import Image from "next/image"
import { Photo } from "@/types/photo"

export type GridSize = 'small' | 'medium' | 'large'

interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
  gridSize?: GridSize
}

const gridSizeClasses: Record<GridSize, string> = {
  small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  large: 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

// Helper function to calculate metadata completeness
function getMetadataQuality(photo: Photo): { label: string; color: string } {
  const hasGPS = photo.latitude && photo.longitude
  const hasCamera = photo.cameraMake || photo.cameraModel
  const hasExif = photo.aperture || photo.shutterSpeed || photo.iso || photo.focalLength
  const hasDate = photo.takenAt

  const score = [hasGPS, hasCamera, hasExif, hasDate].filter(Boolean).length

  if (score >= 3) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' }
  if (score === 2) return { label: 'Bon', color: 'bg-blue-100 text-blue-700' }
  if (score === 1) return { label: 'Basique', color: 'bg-amber-100 text-amber-700' }
  return { label: 'Minimal', color: 'bg-gray-100 text-gray-700' }
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Helper to get location name (simplified for now)
function getLocationLabel(photo: Photo): string | null {
  if (!photo.latitude || !photo.longitude) return null
  // For now, just show coordinates - could be enhanced with reverse geocoding
  return `${photo.latitude.toFixed(2)}°, ${photo.longitude.toFixed(2)}°`
}

export default function PhotoGrid({ photos, onPhotoClick, gridSize = 'medium' }: PhotoGridProps) {
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
            className="group bg-card rounded-2xl overflow-hidden cursor-pointer shadow-md border-2 border-border hover:border-teal-500 transition-all duration-300"
          >
            {/* Image container with fixed aspect ratio */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={photo.url}
                alt={photo.title || photo.originalName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              {/* Badges overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                {/* Quality badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${quality.color}`}>
                  {quality.label}
                </span>

                {/* Metadata completeness percentage */}
                {hasExifData && (
                  <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                    <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700">EXIF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card content */}
            <div className="p-4 space-y-2">
              {/* Title and ID */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground line-clamp-1 flex-1">
                  {photo.title || photo.originalName}
                </h3>
                {photo.takenAt && (
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded shrink-0">
                    {format(new Date(photo.takenAt), "dd/MM/yy")}
                  </span>
                )}
              </div>

              {/* Subtitle */}
              <p className="text-sm text-muted-foreground italic line-clamp-1">
                {photo.cameraModel || photo.originalName}
              </p>

              {/* Location */}
              {location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="line-clamp-1">{location}</span>
                </div>
              )}

              {/* Size info */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{formatFileSize(photo.fileSize)}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {photo.latitude && photo.longitude && (
                  <span className="px-2 py-1 bg-muted text-xs text-muted-foreground rounded">
                    GPS
                  </span>
                )}
                {photo.cameraMake && (
                  <span className="px-2 py-1 bg-muted text-xs text-muted-foreground rounded line-clamp-1">
                    {photo.cameraMake}
                  </span>
                )}
                {photo.iso && (
                  <span className="px-2 py-1 bg-muted text-xs text-muted-foreground rounded">
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
