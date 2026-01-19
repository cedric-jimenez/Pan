"use client"

import { useState, useEffect } from "react"
import { Dialog } from "@headlessui/react"
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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-card mx-auto w-full max-w-md rounded-xl shadow-xl">
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <Dialog.Title className="text-2xl font-bold">
                {individual ? "Edit Individual" : "Create Individual"}
              </Dialog.Title>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
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
                <div className="text-destructive bg-destructive/10 rounded p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="border-border flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading}>
                  {individual ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
