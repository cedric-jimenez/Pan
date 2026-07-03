import { DatePreset } from "@/lib/map-utils"

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "24h", label: "Dernières 24 heures" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "all", label: "Toutes les dates" },
  { value: "custom", label: "Personnalisé…" },
]

interface DateRangeFilterProps {
  datePreset: DatePreset
  onDatePresetChange: (preset: DatePreset) => void
  customStart: string
  onCustomStartChange: (value: string) => void
  customEnd: string
  onCustomEndChange: (value: string) => void
}

export default function DateRangeFilter({
  datePreset,
  onDatePresetChange,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        Date d&apos;observation
      </label>
      <select
        value={datePreset}
        onChange={(e) => onDatePresetChange(e.target.value as DatePreset)}
        className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {datePreset === "custom" && (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-xs">Du</span>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-xs">Au</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="bg-input border-border text-foreground focus:ring-primary rounded-lg border px-2 py-1.5 text-sm focus:ring-2 focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  )
}
