import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NearbyObservationsList from "@/components/map/NearbyObservationsList"
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
    latitude: 45.1,
    longitude: 4.9,
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

describe("NearbyObservationsList Component", () => {
  it("renders nothing when there are no photos", () => {
    const { container } = render(
      <NearbyObservationsList photos={[]} coords={null} onSelect={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the section heading and a row per photo", () => {
    render(
      <NearbyObservationsList
        photos={[makePhoto({ id: "a", title: "Alpha" }), makePhoto({ id: "b", title: "Beta" })]}
        coords={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText("Observations à proximité")).toBeInTheDocument()
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
  })

  it("uses the individual name, then title, then original filename for the label", () => {
    render(
      <NearbyObservationsList
        photos={[makePhoto({ individual: { id: "ind-1", name: "Spotty" }, title: "ignored" })]}
        coords={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText("Spotty")).toBeInTheDocument()
  })

  it("shows the distance when coords are provided", () => {
    render(
      <NearbyObservationsList
        photos={[makePhoto({ latitude: 45.2, longitude: 5.0 })]}
        coords={{ lat: 45.1, lng: 4.9 }}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText(/km/)).toBeInTheDocument()
  })

  it("does not show the distance when coords are missing", () => {
    render(
      <NearbyObservationsList
        photos={[makePhoto({ title: "No coords" })]}
        coords={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.queryByText(/km/)).not.toBeInTheDocument()
  })

  it("calls onSelect with the photo when a row is clicked", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const photo = makePhoto({ title: "Click me" })
    render(<NearbyObservationsList photos={[photo]} coords={null} onSelect={onSelect} />)
    await user.click(screen.getByText("Click me"))
    expect(onSelect).toHaveBeenCalledWith(photo)
  })
})
