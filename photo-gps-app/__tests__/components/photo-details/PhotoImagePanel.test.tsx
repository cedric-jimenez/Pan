import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhotoImagePanel from "@/components/photo-details/PhotoImagePanel"
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
    takenAt: null,
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

describe("PhotoImagePanel Component", () => {
  it("always renders the Original tab", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto()}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    expect(screen.getByText("Original")).toBeInTheDocument()
    expect(screen.queryByText("Crop")).not.toBeInTheDocument()
    expect(screen.queryByText("Segment")).not.toBeInTheDocument()
  })

  it("renders the Crop tab when a croppedUrl exists", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto({ croppedUrl: "https://example.com/crop.jpg" })}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    expect(screen.getByText("Crop")).toBeInTheDocument()
  })

  it("renders the Segment tab when a segmentedUrl exists", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto({ segmentedUrl: "https://example.com/seg.jpg" })}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    expect(screen.getByText("Segment")).toBeInTheDocument()
  })

  it("calls onViewChange with the right view when a tab is clicked", async () => {
    const onViewChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PhotoImagePanel
        photo={makePhoto({
          croppedUrl: "https://example.com/crop.jpg",
          segmentedUrl: "https://example.com/seg.jpg",
        })}
        currentView="original"
        onViewChange={onViewChange}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    await user.click(screen.getByText("Crop"))
    expect(onViewChange).toHaveBeenCalledWith("cropped")

    await user.click(screen.getByText("Segment"))
    expect(onViewChange).toHaveBeenCalledWith("segmented")
  })

  it("does not show the view badge when currentView is original", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto()}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    expect(screen.queryByText("Crop", { selector: "div" })).not.toBeInTheDocument()
  })

  it("shows the view badge label when currentView is not original", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto({ croppedUrl: "https://example.com/crop.jpg" })}
        currentView="cropped"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    const badges = screen.getAllByText("Crop")
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it("renders the same-individual section using the passed props", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto()}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar
      />
    )
    expect(screen.getByText("Chargement...")).toBeInTheDocument()
  })

  it("renders the photo alt text from originalName", () => {
    render(
      <PhotoImagePanel
        photo={makePhoto({ originalName: "my-salamander.jpg" })}
        currentView="original"
        onViewChange={vi.fn()}
        sameIndividualPhotos={[]}
        isLoadingSimilar={false}
      />
    )
    expect(screen.getByAltText("my-salamander.jpg")).toBeInTheDocument()
  })
})
