import Image from "next/image"
import { formatDate, formatTime } from "@/lib/format-date"
import CameraSettingsChips from "./CameraSettingsChips"
import type { IndividualPhoto } from "@/types/individual"

interface ObservationCardProps {
  photo: IndividualPhoto
  isLatest: boolean
  onViewDetails: () => void
}

export default function ObservationCard({ photo, isLatest, onViewDetails }: ObservationCardProps) {
  return (
    <article className="bg-card border-border flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg md:flex-row">
      <div className="bg-muted relative h-48 md:h-auto md:w-1/3">
        <Image
          src={photo.croppedUrl || photo.url}
          alt={photo.title || "Observation"}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold">
              {photo.title || formatDate(photo.takenAt) || "Observation"}
            </h3>
            {isLatest && (
              <span className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-bold">
                Plus récente
              </span>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
            {photo.takenAt && (
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium">{formatDate(photo.takenAt)}</dd>
              </div>
            )}
            {photo.takenAt && (
              <div>
                <dt className="text-muted-foreground">Heure</dt>
                <dd className="font-medium">{formatTime(photo.takenAt)}</dd>
              </div>
            )}
            {photo.latitude !== null && photo.longitude !== null && (
              <div>
                <dt className="text-muted-foreground">Position</dt>
                <dd className="font-medium">
                  {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                </dd>
              </div>
            )}
            {(photo.cameraMake || photo.cameraModel) && (
              <div>
                <dt className="text-muted-foreground">Appareil</dt>
                <dd className="font-medium">
                  {[photo.cameraMake, photo.cameraModel].filter(Boolean).join(" ")}
                </dd>
              </div>
            )}
            <CameraSettingsChips photo={photo} />
          </dl>
          {photo.description && (
            <p className="text-muted-foreground mt-3 line-clamp-2 text-sm italic">
              {photo.description}
            </p>
          )}
        </div>
        <div className="border-border mt-4 flex justify-end border-t pt-4">
          <button onClick={onViewDetails} className="text-primary text-sm font-bold hover:underline">
            Voir les détails →
          </button>
        </div>
      </div>
    </article>
  )
}
