import { GridSize } from "@/components/PhotoGrid"

type SortBy = "date" | "title" | "size" | "camera"
type SortOrder = "asc" | "desc"

interface GalleryControlsProps {
  total: number
  searchInput: string
  onSearchInputChange: (value: string) => void
  sortBy: SortBy
  onSortByChange: (sortBy: SortBy) => void
  sortOrder: SortOrder
  onToggleSortOrder: () => void
  gridSize: GridSize
  onGridSizeChange: (size: GridSize) => void
}

const GRID_SIZE_ICONS: Record<GridSize, { title: string; path: string }> = {
  small: {
    title: "Petites vignettes",
    path: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  medium: {
    title: "Vignettes moyennes",
    path: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  },
  large: {
    title: "Grandes vignettes",
    path: "M4 5a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z",
  },
}

const GRID_SIZES: GridSize[] = ["small", "medium", "large"]

export default function GalleryControls({
  total,
  searchInput,
  onSearchInputChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  gridSize,
  onGridSizeChange,
}: GalleryControlsProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      {total > 0 && (
        <p className="text-muted-foreground text-sm">
          {total} photo{total > 1 ? "s" : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Rechercher..."
            className="bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring w-48 rounded-lg border-0 py-1.5 pr-9 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
          <svg
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchInput && (
            <button
              onClick={() => onSearchInputChange("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
              title="Effacer la recherche"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Tri :</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="bg-muted text-foreground focus:ring-ring rounded-lg border-0 px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="date">Date</option>
            <option value="title">Titre</option>
            <option value="size">Taille</option>
            <option value="camera">Appareil</option>
          </select>

          <button
            onClick={onToggleSortOrder}
            className="bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors"
            title={sortOrder === "desc" ? "Décroissant" : "Croissant"}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={sortOrder === "desc" ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"}
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground mr-2 text-sm">Taille :</span>
          <div className="bg-muted flex gap-1 rounded-lg p-1">
            {GRID_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => onGridSizeChange(size)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  gridSize === size
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={GRID_SIZE_ICONS[size].title}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={GRID_SIZE_ICONS[size].path}
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
