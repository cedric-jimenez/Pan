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
  const croppedPhotos = photos.filter((p) => p.croppedUrl !== null).length
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
      label: "Cropped Photos",
      value: croppedPhotos.toString(),
      color: "text-pink-400",
    },
    {
      label: "Storage Used",
      value: formatStorageSize(totalStorage),
      color: "text-orange-400",
    },
  ]

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-4 shadow-lg ${
            index === stats.length - 1 ? "col-span-2 md:col-span-1" : ""
          }`}
        >
          <div className="text-sm text-gray-400">{stat.label}</div>
          <div className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
