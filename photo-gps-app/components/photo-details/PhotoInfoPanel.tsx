import { format } from "date-fns"
import { Photo } from "@/types/photo"

interface PhotoInfoPanelProps {
  photo: Photo
}

export default function PhotoInfoPanel({ photo }: PhotoInfoPanelProps) {
  const hasCameraSettings =
    photo.iso || photo.aperture || photo.shutterSpeed || photo.focalLength

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Photo Information</h3>

      {photo.individual && (
        <div>
          <p className="text-muted-foreground text-sm">Individual</p>
          <div className="text-primary flex items-center gap-2 font-medium">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{photo.individual.name}</span>
          </div>
        </div>
      )}

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

      {hasCameraSettings && (
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
              <span className="bg-muted rounded px-2 py-1 text-sm">{photo.shutterSpeed}</span>
            )}
            {photo.focalLength && (
              <span className="bg-muted rounded px-2 py-1 text-sm">{photo.focalLength}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
