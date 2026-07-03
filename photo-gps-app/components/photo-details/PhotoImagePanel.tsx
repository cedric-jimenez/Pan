import Image from "next/image"
import { Photo, SimilarPhoto } from "@/types/photo"
import SameIndividualSection from "./SameIndividualSection"

export type ImageView = "original" | "cropped" | "segmented"

const VIEW_LABELS: Record<ImageView, string> = {
  original: "Original",
  cropped: "Crop",
  segmented: "Segment",
}

function getImageUrl(photo: Photo, view: ImageView): string {
  if (view === "segmented") return photo.segmentedUrl || photo.croppedUrl || photo.url
  if (view === "cropped") return photo.croppedUrl || photo.url
  return photo.url
}

interface ViewTabProps {
  label: string
  active: boolean
  onClick: () => void
}

function ViewTab({ label, active, onClick }: ViewTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

interface PhotoImagePanelProps {
  photo: Photo
  currentView: ImageView
  onViewChange: (view: ImageView) => void
  sameIndividualPhotos: SimilarPhoto[]
  isLoadingSimilar: boolean
}

export default function PhotoImagePanel({
  photo,
  currentView,
  onViewChange,
  sameIndividualPhotos,
  isLoadingSimilar,
}: PhotoImagePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex w-full gap-2">
        <ViewTab
          label="Original"
          active={currentView === "original"}
          onClick={() => onViewChange("original")}
        />
        {photo.croppedUrl && (
          <ViewTab
            label="Crop"
            active={currentView === "cropped"}
            onClick={() => onViewChange("cropped")}
          />
        )}
        {photo.segmentedUrl && (
          <ViewTab
            label="Segment"
            active={currentView === "segmented"}
            onClick={() => onViewChange("segmented")}
          />
        )}
      </div>

      <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={`${getImageUrl(photo, currentView)}?v=${photo.updatedAt || photo.createdAt}`}
          alt={photo.originalName}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={photo.isCropped}
        />
        {currentView !== "original" && (
          <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-medium">
            {VIEW_LABELS[currentView]}
          </div>
        )}
      </div>

      <SameIndividualSection photos={sameIndividualPhotos} isLoading={isLoadingSimilar} />
    </div>
  )
}
