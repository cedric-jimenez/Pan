import { format } from "date-fns"
import Image from "next/image"

interface Photo {
  id: string
  url: string
  originalName: string
  takenAt: string | null
  latitude: number | null
  longitude: number | null
}

interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

export default function PhotoGrid({ photos, onPhotoClick }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          onClick={() => onPhotoClick(photo)}
          className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        >
          <Image
            src={photo.url}
            alt={photo.originalName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white text-sm font-medium truncate">
                {photo.originalName}
              </p>
              {photo.takenAt && (
                <p className="text-white/80 text-xs mt-1">
                  {format(new Date(photo.takenAt), "MMM d, yyyy")}
                </p>
              )}
              {photo.latitude && photo.longitude && (
                <div className="flex items-center gap-1 mt-1">
                  <svg
                    className="w-3 h-3 text-white/80"
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
                  <span className="text-white/80 text-xs">GPS</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
