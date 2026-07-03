import Image from "next/image"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { SimilarPhoto } from "@/types/photo"

interface SameIndividualSectionProps {
  photos: SimilarPhoto[]
  isLoading: boolean
}

export default function SameIndividualSection({ photos, isLoading }: SameIndividualSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Même individu</h3>
        <div className="text-muted-foreground text-sm">Chargement...</div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Même individu</h3>
        <div className="text-muted-foreground text-sm">
          Aucune autre photo du même individu trouvée.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Même individu ({photos.length})</h3>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((similar) => (
          <div
            key={similar.id}
            className="bg-muted group relative flex min-h-[120px] flex-col overflow-hidden rounded-lg transition-transform hover:scale-105"
          >
            <div className="relative flex flex-1 items-center justify-center">
              <Image
                src={similar.segmentedUrl || similar.croppedUrl || similar.url}
                alt={similar.title || similar.filename}
                width={200}
                height={200}
                className="h-auto max-h-[160px] w-auto max-w-full object-contain"
                sizes="150px"
              />
              {similar.confidence && similar.confidence !== "unknown" && (
                <div className="bg-black/70 text-white absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                  {similar.confidence.toUpperCase()}
                </div>
              )}
            </div>
            <div className="bg-background/80 text-foreground px-2 py-1 text-center text-[11px] font-medium backdrop-blur-sm">
              {similar.takenAt
                ? format(new Date(similar.takenAt), "d MMM yyyy", { locale: fr })
                : "Date inconnue"}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
