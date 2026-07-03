"use client"

import dynamic from "next/dynamic"
import type { Basemap } from "@/components/ExplorerMap"
import type { IndividualPhoto } from "@/types/individual"
import type { Photo } from "@/types/photo"

const ExplorerMap = dynamic(() => import("@/components/ExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted flex h-full w-full items-center justify-center">
      <span className="text-muted-foreground text-sm">Chargement de la carte…</span>
    </div>
  ),
})

const BASEMAPS: Basemap[] = ["street", "satellite", "heatmap"]
const BASEMAP_LABELS: Record<Basemap, string> = {
  street: "Plan",
  satellite: "Satellite",
  heatmap: "Densité",
}

function formatSurface(ha: number): string {
  if (ha >= 1) return `~${ha.toFixed(1)} ha`
  if (ha >= 0.01) return `~${ha.toFixed(2)} ha`
  return `~${Math.round(ha * 10_000)} m²`
}

interface ObservationMapPanelProps {
  geolocated: IndividualPhoto[]
  totalPhotoCount: number
  mapPhotos: Photo[]
  basemap: Basemap
  onBasemapChange: (basemap: Basemap) => void
  surfaceHa: number | null
  onSelectPhoto: (photoId: string) => void
}

export default function ObservationMapPanel({
  geolocated,
  totalPhotoCount,
  mapPhotos,
  basemap,
  onBasemapChange,
  surfaceHa,
  onSelectPhoto,
}: ObservationMapPanelProps) {
  return (
    <section className="bg-card border-border rounded-xl border p-6">
      <h2 className="mb-4 text-xl font-bold">Zone d&apos;observation</h2>
      {geolocated.length === 0 ? (
        <div className="text-muted-foreground bg-muted flex h-72 items-center justify-center rounded-lg text-center text-sm">
          Aucune photo géolocalisée pour cet individu.
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            {BASEMAPS.map((type) => (
              <button
                key={type}
                onClick={() => onBasemapChange(type)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  basemap === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {BASEMAP_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="border-border h-72 w-full overflow-hidden rounded-lg border">
            <ExplorerMap
              photos={mapPhotos}
              basemap={basemap}
              flyTo={null}
              onSelect={(photo) => onSelectPhoto(photo.id)}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            {geolocated.length}/{totalPhotoCount} photo{totalPhotoCount !== 1 ? "s" : ""}{" "}
            géolocalisée{geolocated.length !== 1 ? "s" : ""}
          </p>
          {surfaceHa !== null ? (
            <div className="border-border mt-3 flex items-baseline justify-between border-t pt-3">
              <span className="text-muted-foreground text-sm">Surface estimée</span>
              <span className="text-lg font-bold">{formatSurface(surfaceHa)}</span>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm italic">
              Surface indisponible (min. 3 observations géolocalisées distinctes).
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-xs italic">
            Domaine vital estimé par polygone convexe minimal (MCP).
          </p>
        </>
      )}
    </section>
  )
}
