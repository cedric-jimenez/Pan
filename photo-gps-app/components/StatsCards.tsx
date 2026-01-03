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
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-slate-700",
    },
    {
      label: "With GPS",
      value: withGPS.toString(),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-slate-700",
    },
    {
      label: "With EXIF",
      value: withEXIF.toString(),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-slate-700",
    },
    {
      label: "Storage Used",
      value: formatStorageSize(totalStorage),
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-slate-700",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`bg-slate-800/50 border-2 ${stat.borderColor} rounded-xl p-6 transition-all hover:shadow-lg backdrop-blur-sm`}
        >
          <p className="text-gray-400 text-sm font-medium mb-2">{stat.label}</p>
          <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
