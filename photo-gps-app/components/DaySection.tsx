"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import PhotoGrid, { GridSize } from "@/components/PhotoGrid"
import { Photo } from "@/types/photo"

interface DaySectionProps {
  date: Date
  dateKey: string
  count: number
  isCollapsed: boolean
  gridSize: GridSize
  /** Cached photos for this day, or undefined when not loaded yet. */
  photos: Photo[] | undefined
  isLoading: boolean
  openMobileMenu: string | null
  onToggleCollapse: (dayKey: string) => void
  /** Called when the day is expanded and visible but its photos aren't loaded. */
  onNeedLoad: (dayKey: string) => void
  onPhotoClick: (photo: Photo) => void
  onProcess: (date: Date) => void
  onDownload: (date: Date) => void
  onDelete: (date: Date, totalCount: number) => void
  onToggleMobileMenu: (dayKey: string | null) => void
}

export default function DaySection({
  date,
  dateKey,
  count,
  isCollapsed,
  gridSize,
  photos,
  isLoading,
  openMobileMenu,
  onToggleCollapse,
  onNeedLoad,
  onPhotoClick,
  onProcess,
  onDownload,
  onDelete,
  onToggleMobileMenu,
}: DaySectionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Track whether this day's section is near the viewport. Photos are only
  // fetched when the day is both expanded and visible, so collapsed days (and
  // far-offscreen days) never load their thumbnail components.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  // Trigger a load once the day is expanded, visible, and not yet loaded.
  useEffect(() => {
    if (isVisible && !isCollapsed && photos === undefined && !isLoading) {
      onNeedLoad(dateKey)
    }
  }, [isVisible, isCollapsed, photos, isLoading, dateKey, onNeedLoad])

  return (
    <div ref={rootRef}>
      {/* Date header */}
      <div className="border-border mb-4 flex items-center justify-between border-b pb-2">
        <button
          onClick={() => onToggleCollapse(dateKey)}
          className="hover:bg-muted/50 flex items-center gap-3 rounded-lg py-1 pr-3 text-left transition-colors"
          title={isCollapsed ? "Déplier" : "Replier"}
        >
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h2 className="text-xl font-semibold">
              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
            </h2>
            <p className="text-muted-foreground text-sm">
              {count} photo{count > 1 ? "s" : ""}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {/* Desktop buttons - hidden on mobile */}
          <button
            onClick={() => onProcess(date)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
            title="Retraiter cette journée"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retraiter
          </button>
          <button
            onClick={() => onDownload(date)}
            className="text-primary hover:bg-primary/10 hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
            title="Télécharger cette journée"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Télécharger
          </button>
          <button
            onClick={() => onDelete(date, count)}
            className="text-destructive hover:bg-destructive/10 hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors md:flex"
            title="Supprimer cette journée"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Supprimer
          </button>

          {/* Mobile dropdown menu - hidden on desktop */}
          <div className="relative md:hidden">
            <button
              onClick={() => onToggleMobileMenu(openMobileMenu === dateKey ? null : dateKey)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors"
              title="Actions"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {openMobileMenu === dateKey && (
              <>
                {/* Backdrop to close menu */}
                <div className="fixed inset-0 z-10" onClick={() => onToggleMobileMenu(null)} />
                {/* Dropdown menu */}
                <div className="bg-card border-border absolute right-0 z-20 mt-1 w-48 rounded-lg border py-1 shadow-lg">
                  <button
                    onClick={() => {
                      onProcess(date)
                      onToggleMobileMenu(null)
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Retraiter
                  </button>
                  <button
                    onClick={() => {
                      onDownload(date)
                      onToggleMobileMenu(null)
                    }}
                    className="text-primary hover:bg-primary/10 flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Télécharger
                  </button>
                  <button
                    onClick={() => {
                      onDelete(date, count)
                      onToggleMobileMenu(null)
                    }}
                    className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Photos grid — only mounted (and only fetched) when the day is expanded */}
      {!isCollapsed &&
        (photos === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-3 border-t-transparent"></div>
          </div>
        ) : (
          <PhotoGrid photos={photos} onPhotoClick={onPhotoClick} gridSize={gridSize} />
        ))}
    </div>
  )
}
