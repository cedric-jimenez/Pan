export interface PhotoStats {
  total: number
  withGPS: number
  withEXIF: number
  cropped: number
  totalStorage: number
}

interface StatsCardsProps {
  stats: PhotoStats | null
}

// Helper to format file size
function formatStorageSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    { label: "Total Photos", value: stats ? stats.total.toString() : "–" },
    { label: "With GPS", value: stats ? stats.withGPS.toString() : "–" },
    { label: "With EXIF", value: stats ? stats.withEXIF.toString() : "–" },
    { label: "Cropped Photos", value: stats ? stats.cropped.toString() : "–" },
    { label: "Storage Used", value: stats ? formatStorageSize(stats.totalStorage) : "–" },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {items.map((stat, index) => (
        <div
          key={index}
          className={`bg-card border-border flex flex-col items-center rounded-lg border p-6 text-center shadow-sm ${
            index === items.length - 1 ? "col-span-2 md:col-span-1" : ""
          }`}
        >
          <div className="text-primary text-3xl font-semibold">{stat.value}</div>
          <div className="text-secondary-foreground mt-1 text-sm font-medium tracking-wider uppercase">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
