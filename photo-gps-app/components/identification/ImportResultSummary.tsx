import Link from "next/link"
import { type BulkImportResult } from "./BulkImportDropzone"

interface ImportResultSummaryProps {
  result: BulkImportResult
  attachedCount: number
  onReset: () => void
}

export default function ImportResultSummary({
  result,
  attachedCount,
  onReset,
}: ImportResultSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Import tallies */}
      <div className="bg-card border-border flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-3 text-sm">
        <span className="text-accent font-medium">
          ✓ {result.detected.length} détectée{result.detected.length > 1 ? "s" : ""}
        </span>
        {result.noDetection.length > 0 && (
          <span className="text-secondary-foreground">
            ⚠ {result.noDetection.length} sans salamandre
          </span>
        )}
        {result.errors.length > 0 && (
          <span className="text-destructive">✗ {result.errors.length} en échec</span>
        )}
      </div>

      {attachedCount > 0 && (
        <div className="bg-accent/10 border-accent text-foreground rounded-lg border px-4 py-3 text-sm">
          {attachedCount} photo{attachedCount > 1 ? "s" : ""} rattachée
          {attachedCount > 1 ? "s" : ""} à un individu.{" "}
          <Link href="/individuals" className="text-primary font-medium hover:underline">
            Voir le catalogue
          </Link>
        </div>
      )}

      {result.detected.length === 0 && (
        <p className="text-secondary-foreground text-sm">
          Aucune photo exploitable pour l&apos;identification dans ce lot.
        </p>
      )}

      {result.noDetection.length > 0 && (
        <div className="bg-muted/50 border-border rounded-lg border px-4 py-3 text-sm">
          <p className="text-foreground font-medium">
            Aucune salamandre détectée sur {result.noDetection.length} photo
            {result.noDetection.length > 1 ? "s" : ""}
          </p>
          <p className="text-secondary-foreground mt-1">
            {result.noDetection.join(", ")} — bien importée
            {result.noDetection.length > 1 ? "s" : ""} mais non comparable
            {result.noDetection.length > 1 ? "s" : ""} aux individus connus. Utilisez une photo
            nette du dos de l&apos;animal, prise de dessus et bien éclairée.
          </p>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="bg-destructive/10 border-destructive rounded-lg border px-4 py-3 text-sm">
          <p className="text-destructive font-medium">
            {result.errors.length} fichier{result.errors.length > 1 ? "s" : ""} non importé
            {result.errors.length > 1 ? "s" : ""}
          </p>
          <ul className="text-secondary-foreground mt-1 list-inside list-disc">
            {result.errors.map((e) => (
              <li key={e.filename}>
                {e.filename} : {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={onReset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Importer d&apos;autres photos
        </button>
      </div>
    </div>
  )
}
