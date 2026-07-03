import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { nameOf } from "@/lib/map-utils"
import { Photo } from "@/types/photo"

interface FeaturedObservationCardProps {
  photo: Photo | null
  onShowDetails: (photo: Photo) => void
}

export default function FeaturedObservationCard({
  photo,
  onShowDetails,
}: FeaturedObservationCardProps) {
  if (!photo) {
    return <p className="text-muted-foreground text-sm">Aucune observation.</p>
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="bg-muted relative h-40 w-full">
        <Image
          src={photo.croppedUrl ?? photo.url}
          alt={nameOf(photo)}
          fill
          sizes="360px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h2 className="text-foreground font-bold">{nameOf(photo)}</h2>
          <p className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(photo.takenAt ?? photo.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
        {photo.cropConfidence !== null && (
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-muted-foreground text-xs">Confiance</div>
            <div className="text-foreground mt-1 font-semibold">
              {Math.round(photo.cropConfidence * 100)}%
            </div>
          </div>
        )}
        <button
          onClick={() => onShowDetails(photo)}
          className="text-primary text-sm font-medium hover:underline"
        >
          Voir les détails
        </button>
      </div>
    </div>
  )
}
