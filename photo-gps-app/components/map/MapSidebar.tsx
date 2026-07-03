import { DatePreset } from "@/lib/map-utils"
import { Photo } from "@/types/photo"
import DateRangeFilter from "./DateRangeFilter"
import FeaturedObservationCard from "./FeaturedObservationCard"
import NearbyObservationsList from "./NearbyObservationsList"

interface MapSidebarProps {
  datePreset: DatePreset
  onDatePresetChange: (preset: DatePreset) => void
  customStart: string
  onCustomStartChange: (value: string) => void
  customEnd: string
  onCustomEndChange: (value: string) => void
  featured: Photo | null
  onShowDetails: (photo: Photo) => void
  nearby: Photo[]
  coords: { lat: number; lng: number } | null
  onSelectNearby: (photo: Photo) => void
  exportDisabled: boolean
  onExport: () => void
}

export default function MapSidebar({
  datePreset,
  onDatePresetChange,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
  featured,
  onShowDetails,
  nearby,
  coords,
  onSelectNearby,
  exportDisabled,
  onExport,
}: MapSidebarProps) {
  return (
    <aside className="border-border bg-card flex w-[360px] shrink-0 flex-col overflow-y-auto border-r">
      <div className="flex flex-1 flex-col gap-6 p-5">
        <h1 className="text-foreground text-2xl font-bold">Exploration</h1>

        <DateRangeFilter
          datePreset={datePreset}
          onDatePresetChange={onDatePresetChange}
          customStart={customStart}
          onCustomStartChange={onCustomStartChange}
          customEnd={customEnd}
          onCustomEndChange={onCustomEndChange}
        />

        <FeaturedObservationCard photo={featured} onShowDetails={onShowDetails} />

        <NearbyObservationsList photos={nearby} coords={coords} onSelect={onSelectNearby} />
      </div>

      <div className="border-border bg-card sticky bottom-0 border-t p-4">
        <button
          onClick={onExport}
          disabled={exportDisabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          Exporter les données locales
        </button>
      </div>
    </aside>
  )
}
