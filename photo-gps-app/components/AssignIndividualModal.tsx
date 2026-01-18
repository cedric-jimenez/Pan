"use client"

import { useState, useEffect } from "react"
import { IndividualWithCount } from "@/types/individual"
import Button from "./Button"

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
      const createResponse = await fetch("/api/individuals", {
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
      const assignResponse = await fetch(`/api/individuals/${individual.id}/assign`, {
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
        await fetch(`/api/individuals/${currentIndividualId}/unassign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoId }),
        })
      }

      // Assign to new individual
      const response = await fetch(`/api/individuals/${selectedId}/assign`, {
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
      const response = await fetch(`/api/individuals/${currentIndividualId}/unassign`, {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Assign to Individual</h2>

        {showCreateForm ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="newName" className="block text-sm font-medium mb-2">
                New Individual Name
              </label>
              <input
                id="newName"
                type="text"
                value={newIndividualName}
                onChange={(e) => setNewIndividualName(e.target.value)}
                placeholder="Enter name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
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
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {individuals.map((individual) => (
                    <label
                      key={individual.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors"
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
                        <div className="text-sm text-muted-foreground">
                          {individual.photoCount} photo{individual.photoCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
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
    </div>
  )
}
