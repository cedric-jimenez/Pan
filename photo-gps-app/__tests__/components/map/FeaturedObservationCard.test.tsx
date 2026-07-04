import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import FeaturedObservationCard from "@/components/map/FeaturedObservationCard"
import { Photo } from "@/types/photo"

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    userId: "user-1",
    individualId: null,
    filename: "photo.jpg",
    originalName: "photo.jpg",
    fileSize: 1000,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: "https://example.com/photo.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    latitude: null,
    longitude: null,
    takenAt: new Date("2024-01-01T00:00:00.000Z"),
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    title: null,
    description: null,
    isCropped: false,
    cropConfidence: null,
    salamanderDetected: false,
    individual: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("FeaturedObservationCard Component", () => {
  it("shows an empty message when there is no photo", () => {
    render(<FeaturedObservationCard photo={null} onShowDetails={vi.fn()} />)
    expect(screen.getByText("Aucune observation.")).toBeInTheDocument()
  })

  it("renders the photo name using the nameOf fallback chain", () => {
    render(<FeaturedObservationCard photo={makePhoto({ title: "Featured One" })} onShowDetails={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Featured One" })).toBeInTheDocument()
  })

  it("shows the crop confidence percentage when present", () => {
    render(
      <FeaturedObservationCard
        photo={makePhoto({ cropConfidence: 0.876 })}
        onShowDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Confiance")).toBeInTheDocument()
    expect(screen.getByText("88%")).toBeInTheDocument()
  })

  it("does not show the confidence block when cropConfidence is null", () => {
    render(<FeaturedObservationCard photo={makePhoto()} onShowDetails={vi.fn()} />)
    expect(screen.queryByText("Confiance")).not.toBeInTheDocument()
  })

  it("calls onShowDetails with the photo when the details button is clicked", async () => {
    const onShowDetails = vi.fn()
    const user = userEvent.setup()
    const photo = makePhoto({ title: "Details please" })
    render(<FeaturedObservationCard photo={photo} onShowDetails={onShowDetails} />)
    await user.click(screen.getByText("Voir les détails"))
    expect(onShowDetails).toHaveBeenCalledWith(photo)
  })
})
