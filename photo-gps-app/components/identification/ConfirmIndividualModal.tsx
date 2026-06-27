"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@headlessui/react"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { ConflictIndividual } from "@/types/identification"

interface ExistingIndividual {
  id: string
  name: string
}

interface ConfirmIndividualModalProps {
  isOpen: boolean
  onClose: () => void
  /** Reference + selected similar photo ids to assign together. */
  photoIds: string[]
  /** Distinct individuals already linked to any of the photos (client-derived). */
  existingIndividuals: ExistingIndividual[]
  onSuccess: (result: { individualName: string; assignedCount: number }) => void
}

type Mode = "create" | "reuse" | "conflict"

export default function ConfirmIndividualModal({
  isOpen,
  onClose,
  photoIds,
  existingIndividuals,
  onSuccess,
}: ConfirmIndividualModalProps) {
  const [name, setName] = useState("")
  const [nameLoading, setNameLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictOptions, setConflictOptions] = useState<ConflictIndividual[] | null>(null)
  const [chosenId, setChosenId] = useState<string | null>(null)

  // Derive the initial interaction mode from what the photos are already linked to.
  const derivedMode: Mode =
    existingIndividuals.length === 0
      ? "create"
      : existingIndividuals.length === 1
        ? "reuse"
        : "conflict"
  const mode: Mode = conflictOptions ? "conflict" : derivedMode

  const fetchSuggestedName = async () => {
    setNameLoading(true)
    try {
      const res = await fetch("/api/individuals/suggest-name")
      if (res.ok) {
        const data = await res.json()
        setName(data.name ?? "")
      }
    } catch {
      // Leave the field empty; the user can type a name.
    } finally {
      setNameLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setConflictOptions(null)
    setSubmitting(false)
    setChosenId(existingIndividuals[0]?.id ?? null)
    if (derivedMode === "create") {
      fetchSuggestedName()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const body: {
        photoIds: string[]
        newName?: string
        individualId?: string
      } = { photoIds }

      if (mode === "create") {
        if (!name.trim()) {
          setError("Veuillez saisir un nom")
          setSubmitting(false)
          return
        }
        body.newName = name.trim()
      } else if (mode === "conflict") {
        if (!chosenId) {
          setError("Veuillez choisir un individu")
          setSubmitting(false)
          return
        }
        body.individualId = chosenId
      } else if (mode === "reuse") {
        body.individualId = existingIndividuals[0]?.id
      }

      const res = await fetchWithCsrf("/api/identification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && data.conflict) {
        // Server detected a multi-individual conflict our client view missed.
        setConflictOptions(data.individuals ?? [])
        setChosenId(data.individuals?.[0]?.id ?? null)
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || "Échec de l'association")
      }

      onSuccess({
        individualName: data.individual?.name ?? name,
        assignedCount: data.assignedCount ?? photoIds.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  const conflictList = conflictOptions ?? existingIndividuals.map((i) => ({ ...i, photoCount: 0 }))

  return (
    <Dialog open={isOpen} onClose={submitting ? () => {} : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl">
          <Dialog.Title className="text-foreground text-2xl font-bold">
            Associer à un individu
          </Dialog.Title>
          <p className="text-secondary-foreground mt-1 text-sm">
            {photoIds.length} photo{photoIds.length > 1 ? "s" : ""} seront rattachée
            {photoIds.length > 1 ? "s" : ""} au même individu.
          </p>

          <div className="mt-5 space-y-4">
            {mode === "create" && (
              <div>
                <div className="flex items-end gap-2">
                  <Input
                    label="Nom du nouvel individu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={nameLoading ? "Génération…" : "Nom"}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={fetchSuggestedName}
                    disabled={nameLoading || submitting}
                    className="text-secondary-foreground hover:text-foreground hover:bg-muted mb-px rounded-lg p-2.5 transition-colors disabled:opacity-50"
                    aria-label="Suggérer un autre nom"
                    title="Suggérer un autre nom"
                  >
                    <svg
                      className={`h-5 w-5 ${nameLoading ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Nom suggéré automatiquement — modifiable.
                </p>
              </div>
            )}

            {mode === "reuse" && (
              <p className="text-foreground text-sm">
                Ces photos seront rattachées à l&apos;individu{" "}
                <span className="font-semibold">{existingIndividuals[0]?.name}</span>.
              </p>
            )}

            {mode === "conflict" && (
              <div>
                <p className="text-foreground mb-3 text-sm">
                  Les photos sélectionnées appartiennent à plusieurs individus. Choisissez celui
                  auquel tout rattacher :
                </p>
                <div className="space-y-2">
                  {conflictList.map((ind) => (
                    <label
                      key={ind.id}
                      className={`border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                        chosenId === ind.id ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="conflict-individual"
                        value={ind.id}
                        checked={chosenId === ind.id}
                        onChange={() => setChosenId(ind.id)}
                      />
                      <span className="text-foreground text-sm font-medium">{ind.name}</span>
                      {ind.photoCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ({ind.photoCount} photos)
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} isLoading={submitting} disabled={nameLoading}>
              Confirmer
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
