"use client"

import { useState, useEffect } from "react"
import { Individual } from "@/types/individual"
import Button from "./Button"
import Input from "./Input"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface IndividualModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  individual?: Individual
}

export default function IndividualModal({
  isOpen,
  onClose,
  onSuccess,
  individual,
}: IndividualModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (individual) {
      setName(individual.name)
    } else {
      setName("")
    }
    setError(null)
  }, [individual, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = individual ? `/api/individuals/${individual.id}` : "/api/individuals"
      const method = individual ? "PATCH" : "POST"

      const response = await fetchWithCsrf(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save individual")
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">
          {individual ? "Edit Individual" : "Create Individual"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter individual name"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {individual ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
