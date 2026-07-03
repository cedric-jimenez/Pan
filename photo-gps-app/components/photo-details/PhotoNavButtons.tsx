interface PhotoNavButtonsProps {
  onNavigate?: (direction: "prev" | "next") => void
  hasPrev: boolean
  hasNext: boolean
}

/** Previous / next photo navigation buttons (also bound to arrow keys by the parent modal). */
export default function PhotoNavButtons({ onNavigate, hasPrev, hasNext }: PhotoNavButtonsProps) {
  if (!onNavigate) return null

  return (
    <>
      {hasPrev && (
        <button
          onClick={() => onNavigate("prev")}
          aria-label="Photo précédente"
          title="Photo précédente (←)"
          className="fixed top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 md:left-4"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate("next")}
          aria-label="Photo suivante"
          title="Photo suivante (→)"
          className="fixed top-1/2 right-2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80 md:right-4"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </>
  )
}
