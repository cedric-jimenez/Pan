"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@headlessui/react"
import Button from "@/components/Button"
import ConflictIndividualPicker from "./ConflictIndividualPicker"
import CreateIndividualNameField from "./CreateIndividualNameField"
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

interface ConfirmRequestBody {
  photoIds: string[]
  newName?: string
  individualId?: string
}

/** Build the confirm-endpoint request body for the current mode, or an error to show instead. */
function buildRequestBody(params: {
  mode: Mode
  photoIds: string[]
  name: string
  chosenId: string | null
  existingIndividuals: ExistingIndividual[]
}): { body: ConfirmRequestBody } | { error: string } {
  const { mode, photoIds, name, chosenId, existingIndividuals } = params

  if (mode === "create") {
    if (!name.trim()) return { error: "Veuillez saisir un nom" }
    return { body: { photoIds, newName: name.trim() } }
  }

  if (mode === "conflict") {
    if (!chosenId) return { error: "Veuillez choisir un individu" }
    return { body: { photoIds, individualId: chosenId } }
  }

  // mode === "reuse"
  return { body: { photoIds, individualId: existingIndividuals[0]?.id } }
}

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
    const built = buildRequestBody({ mode, photoIds, name, chosenId, existingIndividuals })
    if ("error" in built) {
      setError(built.error)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetchWithCsrf("/api/identification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.body),
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
              <CreateIndividualNameField
                name={name}
                nameLoading={nameLoading}
                submitting={submitting}
                onNameChange={setName}
                onRegenerate={fetchSuggestedName}
              />
            )}

            {mode === "reuse" && (
              <p className="text-foreground text-sm">
                Ces photos seront rattachées à l&apos;individu{" "}
                <span className="font-semibold">{existingIndividuals[0]?.name}</span>.
              </p>
            )}

            {mode === "conflict" && (
              <ConflictIndividualPicker
                options={conflictList}
                chosenId={chosenId}
                onChoose={setChosenId}
              />
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
