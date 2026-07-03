import type { Basemap } from "@/components/ExplorerMap"

const BASEMAPS: { value: Basemap; label: string }[] = [
  { value: "street", label: "Rue" },
  { value: "satellite", label: "Satellite" },
  { value: "heatmap", label: "Heatmap" },
]

interface MapOverlayControlsProps {
  search: string
  onSearchChange: (value: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  layersOpen: boolean
  onToggleLayersOpen: () => void
  basemap: Basemap
  onBasemapChange: (basemap: Basemap) => void
  onLocate: () => void
}

export default function MapOverlayControls({
  search,
  onSearchChange,
  collapsed,
  onToggleCollapsed,
  layersOpen,
  onToggleLayersOpen,
  basemap,
  onBasemapChange,
  onLocate,
}: MapOverlayControlsProps) {
  return (
    <>
      {/* Search overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
        <div className="bg-card border-border pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border px-4 py-2 shadow-md">
          <svg
            className="text-muted-foreground size-4 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une espèce…"
            className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Sidebar collapse toggle */}
      <button
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Afficher le panneau" : "Masquer le panneau"}
        className="bg-card border-border text-secondary-foreground hover:text-foreground absolute top-1/2 left-3 z-[1000] -translate-y-1/2 rounded-full border p-2 shadow-md"
      >
        <svg
          className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Locate + Layers controls (above the zoom control) */}
      <div className="absolute right-3 bottom-24 z-[1000] flex flex-col items-end gap-2">
        {layersOpen && (
          <div className="bg-card border-border flex flex-col overflow-hidden rounded-lg border shadow-md">
            {BASEMAPS.map((b) => (
              <button
                key={b.value}
                onClick={() => onBasemapChange(b.value)}
                className={`px-4 py-2 text-left text-sm transition-colors ${
                  basemap === b.value
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary-foreground hover:bg-muted"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onLocate}
          aria-label="Me localiser"
          className="bg-card border-border text-secondary-foreground hover:text-foreground rounded-lg border p-2 shadow-md"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 3h-2.07A7.01 7.01 0 0013 5.07V3a1 1 0 10-2 0v2.07A7.01 7.01 0 005.07 11H3a1 1 0 100 2h2.07A7.01 7.01 0 0011 18.93V21a1 1 0 102 0v-2.07A7.01 7.01 0 0018.93 13H21a1 1 0 100-2zm-9 6a5 5 0 110-10 5 5 0 010 10z" />
          </svg>
        </button>
        <button
          onClick={onToggleLayersOpen}
          aria-label="Fonds de carte"
          className="bg-card border-border text-secondary-foreground hover:text-foreground rounded-lg border p-2 shadow-md"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </>
  )
}
