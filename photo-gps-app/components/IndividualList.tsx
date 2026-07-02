"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { IndividualWithCount } from "@/types/individual"
import Button from "./Button"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

interface IndividualListProps {
  onSelectIndividual?: (individual: IndividualWithCount) => void
  onCreateIndividual?: () => void
  onEditIndividual?: (individual: IndividualWithCount) => void
  refreshTrigger?: number
}

function formatObservedAt(value: Date | string | null): string | null {
  if (!value) return null
  return format(new Date(value), "d MMM yyyy", { locale: fr })
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
        throw new Error("Échec du chargement des individus")
      }

      const data = await response.json()
      setIndividuals(data.individuals)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
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
    if (!confirm("Voulez-vous vraiment supprimer cet individu ?")) {
      return
    }

    try {
      const response = await fetchWithCsrf(`/api/individuals/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Échec de la suppression de l'individu")
      }

      setIndividuals(individuals.filter((ind) => ind.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Une erreur est survenue")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un individu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:ring-primary border-input w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:outline-none"
          />
        </div>
        {onCreateIndividual && <Button onClick={onCreateIndividual}>Créer un individu</Button>}
      </div>

      {loading ? (
        <div className="text-muted-foreground py-12 text-center">Chargement des individus…</div>
      ) : error ? (
        <div className="text-destructive py-12 text-center">{error}</div>
      ) : individuals.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Aucun individu pour le moment. Créez votre premier individu pour commencer.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {individuals.map((individual) => {
            const observedAt = formatObservedAt(individual.lastObservedAt)
            return (
              <div
                key={individual.id}
                className="group bg-card hover:border-primary border-border flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-colors"
                onClick={() => onSelectIndividual?.(individual)}
              >
                <div className="bg-muted relative h-48 overflow-hidden">
                  {individual.coverUrl ? (
                    <Image
                      src={individual.coverUrl}
                      alt={individual.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <svg className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16v12H4z"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Edit / delete kept as discreet overlay actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {onEditIndividual && (
                      <button
                        type="button"
                        aria-label="Modifier"
                        title="Modifier"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditIndividual(individual)
                        }}
                        className="text-muted-foreground hover:text-primary flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Supprimer"
                      title="Supprimer"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(individual.id)
                      }}
                      className="text-muted-foreground hover:text-destructive flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-foreground mb-2 text-lg leading-tight font-semibold">
                    {individual.name}
                  </h3>

                  <div className="text-muted-foreground mt-auto space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16v12H4z"
                        />
                      </svg>
                      <span>
                        {individual.photoCount} photo{individual.photoCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {observedAt && (
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Observé le {observedAt}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectIndividual?.(individual)
                    }}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-4 flex w-full items-center justify-center rounded-lg border py-2 text-sm font-medium transition-colors"
                  >
                    Détails de l&apos;individu
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
