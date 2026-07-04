import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhotoGrid from "@/components/PhotoGrid"
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

describe("PhotoGrid Component", () => {
  it("renders nothing when photos is empty", () => {
    const { container } = render(<PhotoGrid photos={[]} onPhotoClick={vi.fn()} />)
    expect(container.querySelectorAll("img")).toHaveLength(0)
  })

  it("renders a card for each photo", () => {
    const photos = [makePhoto({ id: "1" }), makePhoto({ id: "2", originalName: "second.jpg" })]
    render(<PhotoGrid photos={photos} onPhotoClick={vi.fn()} />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("shows title, falling back to originalName when no title", () => {
    render(<PhotoGrid photos={[makePhoto({ title: null, originalName: "raw-name.jpg" })]} onPhotoClick={vi.fn()} />)
    expect(screen.getAllByText("raw-name.jpg").length).toBeGreaterThan(0)
  })

  it("prefers the title over the originalName", () => {
    render(
      <PhotoGrid
        photos={[
          makePhoto({ title: "My Salamander", originalName: "raw-name.jpg", cameraModel: "EOS R5" }),
        ]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("My Salamander")).toBeInTheDocument()
    expect(screen.queryByText("raw-name.jpg")).not.toBeInTheDocument()
  })

  it("calls onPhotoClick with the clicked photo", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    const photo = makePhoto({ id: "abc", title: "Clickable" })
    render(<PhotoGrid photos={[photo]} onPhotoClick={handleClick} />)

    await user.click(screen.getByText("Clickable"))
    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(handleClick).toHaveBeenCalledWith(photo)
  })

  it("formats file size in KB and MB", () => {
    render(
      <PhotoGrid
        photos={[
          makePhoto({ id: "1", fileSize: 2048 }),
          makePhoto({ id: "2", fileSize: 5 * 1024 * 1024 }),
        ]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("Taille: 2.0 KB")).toBeInTheDocument()
    expect(screen.getByText("Taille: 5.0 MB")).toBeInTheDocument()
  })

  it("shows the excellent quality badge when most metadata is present", () => {
    render(
      <PhotoGrid
        photos={[
          makePhoto({
            latitude: 45.1,
            longitude: 4.9,
            cameraMake: "Canon",
            iso: 400,
            takenAt: "2024-01-01T00:00:00.000Z",
          }),
        ]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("excellent")).toBeInTheDocument()
  })

  it("shows the minimal quality badge when no metadata is present", () => {
    render(<PhotoGrid photos={[makePhoto()]} onPhotoClick={vi.fn()} />)
    expect(screen.getByText("minimal")).toBeInTheDocument()
  })

  it("shows the GPS, camera make, and ISO tags when available", () => {
    render(
      <PhotoGrid
        photos={[makePhoto({ latitude: 45.1, longitude: 4.9, cameraMake: "Canon", iso: 400 })]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("GPS")).toBeInTheDocument()
    expect(screen.getByText("Canon")).toBeInTheDocument()
    expect(screen.getByText("ISO 400")).toBeInTheDocument()
  })

  it("shows the EXIF badge only when EXIF data is present", () => {
    const { rerender } = render(
      <PhotoGrid photos={[makePhoto({ aperture: "f/2.8" })]} onPhotoClick={vi.fn()} />
    )
    expect(screen.getByText("EXIF")).toBeInTheDocument()

    rerender(<PhotoGrid photos={[makePhoto()]} onPhotoClick={vi.fn()} />)
    expect(screen.queryByText("EXIF")).not.toBeInTheDocument()
  })

  it("shows the individual name when assigned", () => {
    render(
      <PhotoGrid
        photos={[makePhoto({ individual: { id: "ind-1", name: "Spotty" } })]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("Spotty")).toBeInTheDocument()
  })

  it("shows the location coordinates rounded to two decimals", () => {
    render(
      <PhotoGrid
        photos={[makePhoto({ latitude: 45.123456, longitude: 4.987654 })]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByText("45.12°, 4.99°")).toBeInTheDocument()
  })

  it("applies the medium grid size classes by default", () => {
    const { container } = render(<PhotoGrid photos={[]} onPhotoClick={vi.fn()} />)
    expect(container.firstChild).toHaveClass("grid-cols-1", "sm:grid-cols-2")
  })

  it("applies the small grid size classes when requested", () => {
    const { container } = render(<PhotoGrid photos={[]} onPhotoClick={vi.fn()} gridSize="small" />)
    expect(container.firstChild).toHaveClass("grid-cols-2", "sm:grid-cols-3")
  })

  it("applies the large grid size classes when requested", () => {
    const { container } = render(<PhotoGrid photos={[]} onPhotoClick={vi.fn()} gridSize="large" />)
    expect(container.firstChild).toHaveClass("md:grid-cols-2", "lg:grid-cols-3")
  })
})
