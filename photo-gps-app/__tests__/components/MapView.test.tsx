import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { useMap } from "react-leaflet"
import MapView from "@/components/MapView"
import type { Photo } from "@/types/photo"

vi.mock("react-leaflet", () => ({
  MapContainer: (props: { children?: React.ReactNode; center: unknown; zoom: number }) => (
    <div data-testid="map-container" data-center={JSON.stringify(props.center)} data-zoom={props.zoom}>
      {props.children}
    </div>
  ),
  TileLayer: (props: { url: string }) => <div data-testid="tile-layer" data-url={props.url} />,
  Marker: (props: { children?: React.ReactNode; position: [number, number] }) => (
    <div data-testid="marker" data-position={JSON.stringify(props.position)}>
      {props.children}
    </div>
  ),
  Popup: (props: { children?: React.ReactNode }) => <div data-testid="popup">{props.children}</div>,
  useMap: vi.fn(),
}))

vi.mock("leaflet.heat", () => ({}))

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    heatLayer: vi.fn(() => ({ addTo: vi.fn() })),
  },
}))

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

const mockedUseMap = vi.mocked(useMap)

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
    latitude: 45,
    longitude: 5,
    takenAt: new Date("2024-01-01T00:00:00.000Z"),
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    title: "Sample",
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

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseMap.mockReturnValue({ removeLayer: vi.fn() } as never)
  })

  it("shows the empty state when no photos have GPS location data", () => {
    render(<MapView photos={[makePhoto({ latitude: null, longitude: null })]} onPhotoClick={vi.fn()} />)
    expect(screen.getByText("No photos with GPS location data found")).toBeInTheDocument()
  })

  it("shows the empty state when there are no photos at all", () => {
    render(<MapView photos={[]} onPhotoClick={vi.fn()} />)
    expect(screen.getByText("No photos with GPS location data found")).toBeInTheDocument()
  })

  it("renders the map centered on the average of located photos", () => {
    render(
      <MapView
        photos={[
          makePhoto({ id: "a", latitude: 40, longitude: 2 }),
          makePhoto({ id: "b", latitude: 44, longitude: 6 }),
        ]}
        onPhotoClick={vi.fn()}
      />
    )
    expect(screen.getByTestId("map-container").dataset.center).toBe(JSON.stringify([42, 4]))
  })

  it("defaults to the street tile layer", () => {
    render(<MapView photos={[makePhoto()]} onPhotoClick={vi.fn()} />)
    expect(screen.getByTestId("tile-layer").dataset.url).toContain("openstreetmap")
  })

  it("switches to the satellite tile layer", () => {
    render(<MapView photos={[makePhoto()]} onPhotoClick={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Satellite" }))
    expect(screen.getByTestId("tile-layer").dataset.url).toContain("arcgisonline")
  })

  it("switches to heatmap mode and hides the markers", () => {
    render(<MapView photos={[makePhoto()]} onPhotoClick={vi.fn()} />)
    expect(screen.getByTestId("marker")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Heatmap" }))
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument()
  })

  it("renders a popup with the photo title and formatted date", () => {
    render(<MapView photos={[makePhoto({ title: "My Salamander" })]} onPhotoClick={vi.fn()} />)
    expect(screen.getByText("My Salamander")).toBeInTheDocument()
  })

  it("falls back to the original filename when there is no title", () => {
    render(
      <MapView photos={[makePhoto({ title: null, originalName: "IMG_042.jpg" })]} onPhotoClick={vi.fn()} />
    )
    expect(screen.getByText("IMG_042.jpg")).toBeInTheDocument()
  })

  it("does not render a date when takenAt is missing", () => {
    render(<MapView photos={[makePhoto({ takenAt: null })]} onPhotoClick={vi.fn()} />)
    expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
  })

  it("calls onPhotoClick when the view details button is clicked", () => {
    const onPhotoClick = vi.fn()
    const photo = makePhoto()
    render(<MapView photos={[photo]} onPhotoClick={onPhotoClick} />)

    fireEvent.click(screen.getByRole("button", { name: "View Details" }))

    expect(onPhotoClick).toHaveBeenCalledWith(photo)
  })
})
