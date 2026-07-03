import { PhotoProcessResult } from "@/types/photo"

interface BulkProcessResultsProps {
  results: PhotoProcessResult[]
}

const MAX_ERRORS_SHOWN = 3

export default function BulkProcessResults({ results }: BulkProcessResultsProps) {
  const detectedCount = results.filter((r) => r.salamanderDetected).length
  const croppedCount = results.filter((r) => r.hasCropped).length
  const segmentedCount = results.filter((r) => r.hasSegmented).length
  const embeddingCount = results.filter((r) => r.hasEmbedding).length
  const failures = results.filter((r) => !r.success)

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{detectedCount}</p>
          <p className="text-muted-foreground text-xs">Salamandres detectees</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{croppedCount}</p>
          <p className="text-muted-foreground text-xs">Images recadrees</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{segmentedCount}</p>
          <p className="text-muted-foreground text-xs">Images segmentees</p>
        </div>
        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{embeddingCount}</p>
          <p className="text-muted-foreground text-xs">Vecteurs generes</p>
        </div>
      </div>

      {failures.length > 0 && (
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
          <p className="text-destructive text-sm font-medium">
            {failures.length} erreur{failures.length > 1 ? "s" : ""}
          </p>
          <ul className="text-muted-foreground mt-1 text-xs">
            {failures.slice(0, MAX_ERRORS_SHOWN).map((r) => (
              <li key={r.photoId}>- {r.error || "Erreur inconnue"}</li>
            ))}
            {failures.length > MAX_ERRORS_SHOWN && (
              <li>... et {failures.length - MAX_ERRORS_SHOWN} autres</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
