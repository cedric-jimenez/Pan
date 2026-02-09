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
    {
      label: "Total Photos",
      value: stats ? stats.total.toString() : "–",
      color: "text-emerald-400",
    },
    {
      label: "With GPS",
      value: stats ? stats.withGPS.toString() : "–",
      color: "text-blue-400",
    },
    {
      label: "With EXIF",
      value: stats ? stats.withEXIF.toString() : "–",
      color: "text-purple-400",
    },
    {
      label: "Cropped Photos",
      value: stats ? stats.cropped.toString() : "–",
      color: "text-pink-400",
    },
    {
      label: "Storage Used",
      value: stats ? formatStorageSize(stats.totalStorage) : "–",
      color: "text-orange-400",
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
      {items.map((stat, index) => (
        <div
          key={index}
          className={`rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-4 shadow-lg ${
            index === items.length - 1 ? "col-span-2 md:col-span-1" : ""
          }`}
        >
          <div className="text-sm text-gray-400">{stat.label}</div>
          <div className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
