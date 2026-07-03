import { PhotoProcessResult } from "@/types/photo"

interface ReprocessResultPanelProps {
  result: PhotoProcessResult
}

interface CheckItemProps {
  ok: boolean | undefined
  label: string
}

function CheckItem({ ok, label }: CheckItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? "text-accent" : "text-muted-foreground"}>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  )
}

export default function ReprocessResultPanel({ result }: ReprocessResultPanelProps) {
  if (!result.success) {
    return (
      <div className="bg-destructive/10 rounded-lg p-4">
        <p className="text-destructive text-sm">Erreur : {result.error}</p>
      </div>
    )
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <div className="space-y-2">
        <p className="text-accent text-sm font-medium">Retraitement terminé</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <CheckItem ok={result.salamanderDetected} label="Salamandre détectée" />
          <CheckItem ok={result.hasCropped} label="Image recadrée" />
          <CheckItem ok={result.hasSegmented} label="Image segmentée" />
          <CheckItem ok={result.hasEmbedding} label="Vecteur généré" />
        </div>
      </div>
    </div>
  )
}
