import { Photo } from "@/types/photo"

interface StatsCardsProps {
  photos: Photo[]
  total: number
}

// Helper to format file size
function formatStorageSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB"
}

export default function StatsCards({ photos, total }: StatsCardsProps) {
  // Calculate stats
  const withGPS = photos.filter((p) => p.latitude && p.longitude).length
  const withEXIF = photos.filter(
    (p) => p.aperture || p.shutterSpeed || p.iso || p.focalLength
  ).length
  const totalStorage = photos.reduce((sum, p) => sum + p.fileSize, 0)

  const stats = [
    {
      label: "Total Photos",
      value: total.toString(),
      color: "text-emerald-400",
    },
    {
      label: "With GPS",
      value: withGPS.toString(),
      color: "text-blue-400",
    },
    {
      label: "With EXIF",
      value: withEXIF.toString(),
      color: "text-purple-400",
    },
    {
      label: "Storage Used",
      value: formatStorageSize(totalStorage),
      color: "text-orange-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 shadow-lg"
        >
          <div className="text-sm text-gray-400">{stat.label}</div>
          <div className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
