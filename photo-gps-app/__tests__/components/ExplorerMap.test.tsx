import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { useMap } from "react-leaflet"
import ExplorerMap from "@/components/ExplorerMap"
import type { Photo } from "@/types/photo"

vi.mock("react-leaflet", () => ({
  MapContainer: (props: { children?: React.ReactNode; center: unknown; zoom: number }) => (
    <div data-testid="map-container" data-center={JSON.stringify(props.center)} data-zoom={props.zoom}>
      {props.children}
    </div>
  ),
  TileLayer: (props: { url: string }) => <div data-testid="tile-layer" data-url={props.url} />,
  ZoomControl: () => <div data-testid="zoom-control" />,
  Marker: (props: {
    children?: React.ReactNode
    position: [number, number]
    eventHandlers?: { click?: () => void }
  }) => (
    <div
      data-testid="marker"
      data-position={JSON.stringify(props.position)}
      onClick={() => props.eventHandlers?.click?.()}
    >
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

describe("ExplorerMap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseMap.mockReturnValue({
      setView: vi.fn(),
      flyTo: vi.fn(),
      removeLayer: vi.fn(),
    } as never)
  })

  it("centers on the default location and zoom when there are no located photos", () => {
    render(<ExplorerMap photos={[]} basemap="street" flyTo={null} onSelect={vi.fn()} />)
    const container = screen.getByTestId("map-container")
    expect(container.dataset.center).toBe(JSON.stringify([46.8, 4.5]))
    expect(container.dataset.zoom).toBe("5")
  })

  it("ignores photos without GPS data and centers on the centroid of the rest", () => {
    render(
      <ExplorerMap
        photos={[makePhoto({ id: "a", latitude: 40, longitude: 2 }), makePhoto({ id: "b", latitude: null, longitude: null })]}
        basemap="street"
        flyTo={null}
        onSelect={vi.fn()}
      />
    )
    const container = screen.getByTestId("map-container")
    expect(container.dataset.center).toBe(JSON.stringify([40, 2]))
    expect(container.dataset.zoom).toBe("12")
    expect(screen.getAllByTestId("marker")).toHaveLength(1)
  })

  it("uses the satellite tile layer when basemap is satellite", () => {
    render(<ExplorerMap photos={[]} basemap="satellite" flyTo={null} onSelect={vi.fn()} />)
    expect(screen.getByTestId("tile-layer").dataset.url).toContain("arcgisonline")
  })

  it("uses the OpenStreetMap tile layer for the street basemap", () => {
    render(<ExplorerMap photos={[]} basemap="street" flyTo={null} onSelect={vi.fn()} />)
    expect(screen.getByTestId("tile-layer").dataset.url).toContain("openstreetmap")
  })

  it("renders a marker per located photo with a popup label", () => {
    render(
      <ExplorerMap
        photos={[makePhoto({ id: "a", title: "My Salamander" })]}
        basemap="street"
        flyTo={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText("My Salamander")).toBeInTheDocument()
  })

  it("falls back to individual name, then title, then original filename in the popup", () => {
    render(
      <ExplorerMap
        photos={[makePhoto({ id: "a", title: null, originalName: "IMG_001.jpg" })]}
        basemap="street"
        flyTo={null}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText("IMG_001.jpg")).toBeInTheDocument()
  })

  it("calls onSelect when a marker is clicked", () => {
    const onSelect = vi.fn()
    const photo = makePhoto({ id: "a" })
    render(<ExplorerMap photos={[photo]} basemap="street" flyTo={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByTestId("marker"))

    expect(onSelect).toHaveBeenCalledWith(photo)
  })

  it("renders the heatmap layer instead of markers when basemap is heatmap", () => {
    render(
      <ExplorerMap photos={[makePhoto({ id: "a" })]} basemap="heatmap" flyTo={null} onSelect={vi.fn()} />
    )
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument()
  })

  it("recenters the map on the centroid via useMap", () => {
    const setView = vi.fn()
    mockedUseMap.mockReturnValue({ setView, flyTo: vi.fn(), removeLayer: vi.fn() } as never)

    render(
      <ExplorerMap
        photos={[makePhoto({ id: "a", latitude: 40, longitude: 2 })]}
        basemap="street"
        flyTo={null}
        onSelect={vi.fn()}
      />
    )

    expect(setView).toHaveBeenCalledWith([40, 2], 12)
  })

  it("flies to the given target with a default zoom", () => {
    const flyTo = vi.fn()
    mockedUseMap.mockReturnValue({ setView: vi.fn(), flyTo, removeLayer: vi.fn() } as never)

    render(
      <ExplorerMap
        photos={[]}
        basemap="street"
        flyTo={{ lat: 10, lng: 20 }}
        onSelect={vi.fn()}
      />
    )

    expect(flyTo).toHaveBeenCalledWith([10, 20], 14)
  })

  it("flies to the given target with an explicit zoom", () => {
    const flyTo = vi.fn()
    mockedUseMap.mockReturnValue({ setView: vi.fn(), flyTo, removeLayer: vi.fn() } as never)

    render(
      <ExplorerMap
        photos={[]}
        basemap="street"
        flyTo={{ lat: 10, lng: 20, zoom: 18 }}
        onSelect={vi.fn()}
      />
    )

    expect(flyTo).toHaveBeenCalledWith([10, 20], 18)
  })
})
