import type { IndividualPhoto } from "@/types/individual"

interface CameraSettingsChipsProps {
  photo: Pick<IndividualPhoto, "aperture" | "iso" | "shutterSpeed" | "focalLength">
}

/** Renders the aperture/ISO/shutter/focal length chip row, or nothing if none are set. */
export default function CameraSettingsChips({ photo }: CameraSettingsChipsProps) {
  if (!photo.aperture && !photo.iso && !photo.shutterSpeed && !photo.focalLength) {
    return null
  }

  return (
    <div className="sm:col-span-2">
      <dt className="text-muted-foreground">Réglages</dt>
      <dd className="flex flex-wrap gap-2 font-medium">
        {photo.aperture && <span className="bg-muted rounded px-2 py-0.5">{photo.aperture}</span>}
        {photo.iso && <span className="bg-muted rounded px-2 py-0.5">ISO {photo.iso}</span>}
        {photo.shutterSpeed && (
          <span className="bg-muted rounded px-2 py-0.5">{photo.shutterSpeed}</span>
        )}
        {photo.focalLength && (
          <span className="bg-muted rounded px-2 py-0.5">{photo.focalLength}</span>
        )}
      </dd>
    </div>
  )
}
