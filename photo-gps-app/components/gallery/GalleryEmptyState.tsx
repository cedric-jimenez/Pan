interface GalleryEmptyStateProps {
  searchQuery: string
  onClearSearch: () => void
}

export default function GalleryEmptyState({ searchQuery, onClearSearch }: GalleryEmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <svg
        className="text-muted-foreground mx-auto mb-4 h-24 w-24"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {searchQuery.trim() ? (
        <>
          <h3 className="mb-2 text-xl font-medium">Aucun résultat</h3>
          <p className="text-muted-foreground mb-4">
            Aucune photo ne correspond à &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={onClearSearch}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Effacer la recherche
          </button>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-xl font-medium">No photos yet</h3>
          <p className="text-muted-foreground">Upload your first photo to get started</p>
        </>
      )}
    </div>
  )
}
