"use client"

import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Photo } from "@/types/photo"
import { SimilarPhotoResult } from "@/types/identification"

interface SimilarResultsProps {
  referencePhoto: Photo
  results: SimilarPhotoResult[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  /** Confirm the current selection (reference + checked similar photos). */
  onConfirmSelection: () => void
  /** Register the reference alone as a brand new individual. */
  onRegisterNew: () => void
  onOpenDetails: (id: string) => void
}

function formatTakenAt(takenAt: string | null): string | null {
  if (!takenAt) return null
  try {
    return format(parseISO(takenAt), "dd/MM/yyyy", { locale: fr })
  } catch {
    return null
  }
}

// Map a similarity score (0..1) to a coloured "% Match" badge.
function matchBadgeClass(result: SimilarPhotoResult): string {
  if (result.isSame || result.similarityScore >= 0.7) {
    return "bg-accent text-accent-foreground"
  }
  if (result.similarityScore >= 0.4) {
    return "bg-primary text-primary-foreground"
  }
  return "bg-muted text-muted-foreground"
}

function PinIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <circle cx="12" cy="11" r="2.5" strokeWidth={2} />
    </svg>
  )
}

export default function SimilarResults({
  referencePhoto,
  results,
  selectedIds,
  onToggle,
  onConfirmSelection,
  onRegisterNew,
  onOpenDetails,
}: SimilarResultsProps) {
  const selectedCount = selectedIds.size
  // Reference + every checked similar photo are assigned together.
  const totalToAssign = selectedCount + 1

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-foreground text-3xl font-semibold">Individus Similaires</h2>
          <p className="text-secondary-foreground text-base">
            Cochez les photos qui représentent le même individu, puis associez-les.
          </p>
        </div>
        <a
          href="/gallery"
          className="text-primary flex items-center gap-2 text-sm font-medium hover:underline"
        >
          Voir tout le catalogue
          <span aria-hidden="true">→</span>
        </a>
      </div>

      {/* Reference (the just-uploaded photo) */}
      <div className="border-primary/40 bg-primary/5 flex items-center gap-4 rounded-xl border p-4">
        <div className="bg-muted h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={referencePhoto.croppedUrl ?? referencePhoto.url}
            alt="Photo analysée"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-primary text-sm font-semibold">Photo analysée</p>
          <p className="text-secondary-foreground text-sm">
            {referencePhoto.title || referencePhoto.originalName || referencePhoto.filename}
          </p>
          {referencePhoto.individual?.name && (
            <p className="text-muted-foreground mt-1 text-xs">
              Déjà rattachée à {referencePhoto.individual.name}
            </p>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <p className="text-secondary-foreground text-sm">
          Aucune photo similaire trouvée dans votre catalogue. Vous pouvez enregistrer cette photo
          comme un nouvel individu.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((result) => {
            const selected = selectedIds.has(result.id)
            const takenAt = formatTakenAt(result.takenAt)
            const location =
              result.latitude != null && result.longitude != null
                ? `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
                : null
            return (
              <div
                key={result.id}
                className={`bg-card flex flex-col overflow-hidden rounded-xl border transition-colors ${
                  selected ? "border-accent ring-accent ring-1" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(result.id)}
                  className="relative block h-48 w-full"
                  aria-pressed={selected}
                  aria-label={selected ? "Désélectionner cette photo" : "Sélectionner cette photo"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.croppedUrl ?? result.url}
                    alt={result.title ?? result.filename}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium ${matchBadgeClass(
                      result
                    )}`}
                  >
                    {Math.round(result.similarityScore * 100)}% Match
                  </span>
                  <span
                    className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                      selected
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-white bg-black/30"
                    }`}
                  >
                    {selected && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </button>

                <div className="flex flex-col gap-3 p-4">
                  <div>
                    <h3 className="text-foreground truncate text-lg font-semibold">
                      {result.title || result.filename}
                    </h3>
                    {result.individualName ? (
                      <p className="text-primary mt-1 flex items-center gap-1 text-xs font-medium">
                        Rattachée à {result.individualName}
                      </p>
                    ) : location ? (
                      <p className="text-secondary-foreground mt-1 flex items-center gap-1 text-xs">
                        <PinIcon />
                        {location}
                      </p>
                    ) : null}
                  </div>
                  <div className="border-border/40 flex items-center justify-between border-t pt-2">
                    <span className="text-secondary-foreground text-xs italic">
                      {takenAt ? `Vu le ${takenAt}` : "Date inconnue"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDetails(result.id)}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Détails
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* New individual empty-state card */}
          <div className="bg-muted/40 border-border flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-6 text-center">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <svg className="text-primary h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Nouvel individu ?</p>
              <p className="text-secondary-foreground mt-1 text-xs">
                Si aucune correspondance n&apos;est trouvée, créez une nouvelle fiche.
              </p>
            </div>
            <button
              type="button"
              onClick={onRegisterNew}
              className="text-primary text-xs font-bold hover:underline"
            >
              Enregistrer comme nouveau
            </button>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="border-border bg-card sticky bottom-4 flex flex-col items-center justify-between gap-3 rounded-xl border p-4 shadow-md sm:flex-row">
        <p className="text-secondary-foreground text-sm">
          {selectedCount === 0
            ? "Sélectionnez les photos du même individu pour les associer."
            : `${totalToAssign} photo${totalToAssign > 1 ? "s" : ""} seront associées au même individu.`}
        </p>
        <button
          type="button"
          onClick={onConfirmSelection}
          disabled={selectedCount === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Associer à un individu
        </button>
      </div>
    </section>
  )
}
