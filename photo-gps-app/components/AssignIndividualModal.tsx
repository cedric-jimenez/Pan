"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
import { IndividualWithCount } from "@/types/individual"
import Button from "./Button"
import Input from "./Input"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface AssignIndividualModalProps {
  isOpen: boolean
  onClose: () => void
  photoId: string
  currentIndividualId?: string | null
  onSuccess?: () => void
}

export default function AssignIndividualModal({
  isOpen,
  onClose,
  photoId,
  currentIndividualId,
  onSuccess,
}: AssignIndividualModalProps) {
  const [individuals, setIndividuals] = useState<IndividualWithCount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newIndividualName, setNewIndividualName] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchIndividuals()
      setSelectedId(currentIndividualId || null)
      setError(null)
      setShowCreateForm(false)
      setNewIndividualName("")
    }
  }, [isOpen, currentIndividualId])

  const fetchIndividuals = async () => {
    try {
      const response = await fetch("/api/individuals?limit=100")
      if (!response.ok) {
        throw new Error("Failed to fetch individuals")
      }
      const data = await response.json()
      setIndividuals(data.individuals)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleCreateAndAssign = async () => {
    if (!newIndividualName.trim()) {
      setError("Please enter a name")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create individual
      const createResponse = await fetchWithCsrf("/api/individuals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newIndividualName.trim() }),
      })

      if (!createResponse.ok) {
        const data = await createResponse.json()
        throw new Error(data.error || "Failed to create individual")
      }

      const { individual } = await createResponse.json()

      // Assign photo
      const assignResponse = await fetchWithCsrf(`/api/individuals/${individual.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      })

      if (!assignResponse.ok) {
        throw new Error("Failed to assign photo")
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedId) {
      setError("Please select an individual")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // If same as current, just close
      if (selectedId === currentIndividualId) {
        onClose()
        return
      }

      // Unassign from current if exists
      if (currentIndividualId) {
        await fetchWithCsrf(`/api/individuals/${currentIndividualId}/unassign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoId }),
        })
      }

      // Assign to new individual
      const response = await fetchWithCsrf(`/api/individuals/${selectedId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to assign photo")
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    if (!currentIndividualId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetchWithCsrf(`/api/individuals/${currentIndividualId}/unassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to unassign photo")
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl shadow-xl">
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <Dialog.Title className="text-2xl font-bold">Assign to Individual</Dialog.Title>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {showCreateForm ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="newName" className="mb-2 block text-sm font-medium">
                    New Individual Name
                  </label>
                  <Input
                    id="newName"
                    type="text"
                    value={newIndividualName}
                    onChange={(e) => setNewIndividualName(e.target.value)}
                    placeholder="Enter name"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-destructive bg-destructive/10 rounded p-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="border-border flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button onClick={handleCreateAndAssign} isLoading={loading}>
                    Create & Assign
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full"
                >
                  + Create New Individual
                </Button>

                {individuals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Select existing individual:</p>
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {individuals.map((individual) => (
                        <label
                          key={individual.id}
                          className="hover:border-primary flex cursor-pointer items-center rounded-lg border border-gray-200 p-3 transition-colors"
                        >
                          <input
                            type="radio"
                            name="individual"
                            value={individual.id}
                            checked={selectedId === individual.id}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{individual.name}</div>
                            <div className="text-muted-foreground text-sm">
                              {individual.photoCount} photo{individual.photoCount !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-destructive bg-destructive/10 rounded p-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="border-border flex justify-end gap-2 border-t pt-4">
                  {currentIndividualId && (
                    <Button variant="destructive" onClick={handleUnassign} isLoading={loading}>
                      Unassign
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} isLoading={loading}>
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
