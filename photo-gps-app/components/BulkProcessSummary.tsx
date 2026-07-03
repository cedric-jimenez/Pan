interface BulkProcessSummaryProps {
  isLoadingIds: boolean
  loadError: string | null
  photoCount: number
}

export default function BulkProcessSummary({
  isLoadingIds,
  loadError,
  photoCount,
}: BulkProcessSummaryProps) {
  return (
    <div className="bg-muted mb-6 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 text-primary rounded-full p-2">
          {isLoadingIds ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </div>
        <div>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : isLoadingIds ? (
            <p className="text-muted-foreground text-sm">Chargement des photos...</p>
          ) : (
            <>
              <p className="font-medium">
                {photoCount} photo{photoCount > 1 ? "s" : ""} à retraiter
              </p>
              <p className="text-muted-foreground text-sm">Les images existantes seront remplacées</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
