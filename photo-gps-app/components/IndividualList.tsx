"use client"

import { useState, useEffect, useCallback } from "react"
import { IndividualWithCount } from "@/types/individual"
import Button from "./Button"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface IndividualListProps {
  onSelectIndividual?: (individual: IndividualWithCount) => void
  onCreateIndividual?: () => void
  onEditIndividual?: (individual: IndividualWithCount) => void
  refreshTrigger?: number
}

export default function IndividualList({
  onSelectIndividual,
  onCreateIndividual,
  onEditIndividual,
  refreshTrigger,
}: IndividualListProps) {
  const [individuals, setIndividuals] = useState<IndividualWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [search])

  const fetchIndividuals = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.append("search", debouncedSearch)
      }

      const response = await fetch(`/api/individuals?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch individuals")
      }

      const data = await response.json()
      setIndividuals(data.individuals)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchIndividuals()
  }, [fetchIndividuals])

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchIndividuals()
    }
  }, [refreshTrigger, fetchIndividuals])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this individual?")) {
      return
    }

    try {
      const response = await fetchWithCsrf(`/api/individuals/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete individual")
      }

      setIndividuals(individuals.filter((ind) => ind.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading individuals...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search individuals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {onCreateIndividual && (
          <Button onClick={onCreateIndividual}>Create Individual</Button>
        )}
      </div>

      {individuals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No individuals found. Create your first individual to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {individuals.map((individual) => (
            <div
              key={individual.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors cursor-pointer"
              onClick={() => onSelectIndividual?.(individual)}
            >
              <div>
                <h3 className="font-semibold text-lg">{individual.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {individual.photoCount} photo{individual.photoCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectIndividual?.(individual)
                  }}
                >
                  View
                </Button>
                {onEditIndividual && (
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditIndividual(individual)
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(individual.id)
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
