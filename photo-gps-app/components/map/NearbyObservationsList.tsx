import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { distanceKm, nameOf } from "@/lib/map-utils"
import { Photo } from "@/types/photo"

interface NearbyObservationsListProps {
  photos: Photo[]
  coords: { lat: number; lng: number } | null
  onSelect: (photo: Photo) => void
}

export default function NearbyObservationsList({
  photos,
  coords,
  onSelect,
}: NearbyObservationsListProps) {
  if (photos.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-foreground text-sm font-semibold">Observations à proximité</h3>
      {photos.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="hover:bg-muted/50 flex items-center gap-3 rounded-lg p-2 text-left transition-colors"
        >
          <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
            <Image src={p.croppedUrl ?? p.url} alt={nameOf(p)} fill sizes="48px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-foreground truncate text-sm font-medium">{nameOf(p)}</div>
            <div className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(p.takenAt ?? p.createdAt), {
                addSuffix: true,
                locale: fr,
              })}
              {coords && ` • à ${distanceKm(coords.lat, coords.lng, p.latitude!, p.longitude!).toFixed(1)} km`}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
