"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { logger } from "@/lib/logger"
import { bestExistingMatch, type ExistingMatch } from "@/lib/identify-suggestion"
import { Photo } from "@/types/photo"
import { SimilarPhotoResult } from "@/types/identification"
import ConfirmIndividualModal from "./ConfirmIndividualModal"
import ProgressBar from "./ProgressBar"

interface BulkIdentifyReviewProps {
  /** Imported photos with a salamander detected. Stable for the batch. */
  detected: Photo[]
  /** Called whenever a photo gets attached (to update a cumulative counter). */
  onAttached?: () => void
}

type RowStatus = "analyzing" | "ready" | "attaching" | "attached" | "ignored"

interface Row {
  photo: Photo
  status: RowStatus
  suggestion: ExistingMatch | null
  analyzeError: boolean
  attachedName?: string
  actionError?: string
}

function photoLabel(photo: Photo): string {
  return photo.title || photo.originalName || photo.filename
}

export default function BulkIdentifyReview({ detected, onAttached }: BulkIdentifyReviewProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    detected.map((photo) => ({ photo, status: "analyzing", suggestion: null, analyzeError: false }))
  )
  const [analyzeDone, setAnalyzeDone] = useState(0)
  const [createIndex, setCreateIndex] = useState<number | null>(null)

  const total = detected.length
  const analyzing = analyzeDone < total
  const attachedCount = rows.filter((r) => r.status === "attached").length

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  // Sequentially match each detected photo against the existing catalogue.
  // Runs once for the batch (the component is remounted per import).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < detected.length; i++) {
        const photo = detected[i]
        let suggestion: ExistingMatch | null = null
        let analyzeError = false
        try {
          const res = await fetch(`/api/photos/${photo.id}/similar?linkedOnly=1`)
          if (res.ok) {
            const data: SimilarPhotoResult[] = await res.json()
            suggestion = bestExistingMatch(data)
          } else {
            analyzeError = true
          }
        } catch (err) {
          logger.error("bulk identify similar error", err)
          analyzeError = true
        }
        if (cancelled) return
        updateRow(i, { status: "ready", suggestion, analyzeError })
        setAnalyzeDone((d) => d + 1)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const attach = async (index: number, individualId: string, individualName: string) => {
    updateRow(index, { status: "attaching", actionError: undefined })
    try {
      const res = await fetchWithCsrf("/api/identification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: [rows[index].photo.id], individualId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Échec du rattachement")
      }
      updateRow(index, {
        status: "attached",
        attachedName: data.individual?.name ?? individualName,
      })
      onAttached?.()
    } catch (err) {
      updateRow(index, {
        status: "ready",
        actionError: err instanceof Error ? err.message : "Une erreur est survenue",
      })
    }
  }

  const handleCreateSuccess = (result: { individualName: string; assignedCount: number }) => {
    if (createIndex !== null) {
      updateRow(createIndex, { status: "attached", attachedName: result.individualName })
      onAttached?.()
    }
    setCreateIndex(null)
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <h2 className="text-foreground text-3xl font-semibold">Revue des correspondances</h2>
          <span className="text-secondary-foreground text-sm">
            {attachedCount} / {total} rattachée{attachedCount > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-secondary-foreground text-base">
          Pour chaque photo, rattachez-la à l&apos;individu existant proposé ou créez-en un nouveau.
        </p>
      </div>

      {analyzing && (
        <ProgressBar done={analyzeDone} total={total} label="Analyse des correspondances" />
      )}

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const label = photoLabel(row.photo)
          const score = row.suggestion ? Math.round(row.suggestion.similarityScore * 100) : null
          return (
            <article
              key={row.photo.id}
              className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={row.photo.croppedUrl || row.photo.url}
                  alt={label}
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate font-medium">{label}</p>

                {row.status === "analyzing" ? (
                  <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                    <svg
                      className="text-primary h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Analyse en cours…
                  </p>
                ) : row.status === "attached" ? (
                  <p className="text-accent mt-1 text-sm font-medium">
                    Rattachée à {row.attachedName} ✓
                  </p>
                ) : row.status === "ignored" ? (
                  <p className="text-muted-foreground mt-1 text-sm italic">Ignorée</p>
                ) : row.suggestion ? (
                  <p className="text-primary mt-1 text-sm font-medium">
                    Correspond à {row.suggestion.individualName}
                    {score !== null && (
                      <span className="text-secondary-foreground font-normal"> ({score}%)</span>
                    )}
                  </p>
                ) : (
                  <p className="text-secondary-foreground mt-1 text-sm">
                    Aucun individu existant{row.analyzeError ? " (analyse indisponible)" : ""}
                  </p>
                )}

                {row.actionError && (
                  <p className="text-destructive mt-1 text-xs">{row.actionError}</p>
                )}
              </div>

              {(row.status === "ready" || row.status === "attaching") && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {row.suggestion && (
                    <button
                      type="button"
                      disabled={row.status === "attaching"}
                      onClick={() =>
                        attach(index, row.suggestion!.individualId, row.suggestion!.individualName)
                      }
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.status === "attaching"
                        ? "Rattachement…"
                        : `Rattacher à ${row.suggestion.individualName}`}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={row.status === "attaching"}
                    onClick={() => setCreateIndex(index)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      row.suggestion
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    Créer un nouvel individu
                  </button>
                  <button
                    type="button"
                    disabled={row.status === "attaching"}
                    onClick={() => updateRow(index, { status: "ignored" })}
                    className="text-secondary-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Ignorer
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <ConfirmIndividualModal
        isOpen={createIndex !== null}
        onClose={() => setCreateIndex(null)}
        photoIds={createIndex !== null ? [rows[createIndex].photo.id] : []}
        existingIndividuals={[]}
        onSuccess={handleCreateSuccess}
      />
    </section>
  )
}
