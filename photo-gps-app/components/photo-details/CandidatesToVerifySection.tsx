import Image from "next/image"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { SimilarPhoto } from "@/types/photo"

interface CandidatesToVerifySectionProps {
  photos: SimilarPhoto[]
}

/**
 * Possible matches that the automatic check can't confirm (typically the same
 * animal photographed a year apart, in another pose). They are ranked on the
 * straightened bodies by pan-py; a human decides.
 */
export default function CandidatesToVerifySection({ photos }: CandidatesToVerifySectionProps) {
  if (photos.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Candidats à vérifier ({photos.length})</h3>
      <p className="text-muted-foreground text-xs">
        Ressemblances possibles, non confirmées automatiquement. Comparez les motifs à l&apos;œil.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((candidate) => (
          <div
            key={candidate.id}
            className="bg-muted group relative flex min-h-[120px] flex-col overflow-hidden rounded-lg border border-dashed transition-transform hover:scale-105"
          >
            <div className="relative flex flex-1 items-center justify-center">
              <Image
                src={candidate.segmentedUrl || candidate.croppedUrl || candidate.url}
                alt={candidate.title || candidate.filename}
                width={200}
                height={200}
                className="h-auto max-h-[160px] w-auto max-w-full object-contain"
                sizes="150px"
              />
              {candidate.individualName && (
                <div className="bg-black/70 text-white absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                  {candidate.individualName}
                </div>
              )}
            </div>
            <div className="bg-background/80 text-foreground px-2 py-1 text-center text-[11px] font-medium backdrop-blur-sm">
              {candidate.takenAt
                ? format(new Date(candidate.takenAt), "d MMM yyyy", { locale: fr })
                : "Date inconnue"}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
