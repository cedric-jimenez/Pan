import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { useMap } from "react-leaflet"
import LandingMap from "@/components/LandingMap"

vi.mock("react-leaflet", () => ({
  MapContainer: (props: { children?: React.ReactNode; center: unknown; zoom: number }) => (
    <div data-testid="map-container" data-center={JSON.stringify(props.center)} data-zoom={props.zoom}>
      {props.children}
    </div>
  ),
  TileLayer: (props: { url: string }) => <div data-testid="tile-layer" data-url={props.url} />,
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

describe("LandingMap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseMap.mockReturnValue({ setView: vi.fn(), removeLayer: vi.fn() } as never)
  })

  it("centers on the default location when there are no points", () => {
    render(<LandingMap points={[]} />)
    const container = screen.getByTestId("map-container")
    expect(container.dataset.center).toBe(JSON.stringify([46.8, 4.5]))
    expect(container.dataset.zoom).toBe("5")
  })

  it("centers on the centroid of the points and zooms in", () => {
    render(
      <LandingMap
        points={[
          { id: "1", lat: 40, lng: 2, label: "A" },
          { id: "2", lat: 44, lng: 6, label: "B" },
        ]}
      />
    )
    const container = screen.getByTestId("map-container")
    expect(container.dataset.center).toBe(JSON.stringify([42, 4]))
    expect(container.dataset.zoom).toBe("13")
  })

  it("recenters the map on the centroid via useMap", () => {
    const setView = vi.fn()
    mockedUseMap.mockReturnValue({ setView, removeLayer: vi.fn() } as never)

    render(<LandingMap points={[{ id: "1", lat: 40, lng: 2, label: "A" }]} />)

    expect(setView).toHaveBeenCalledWith([40, 2], 13)
  })

  it("renders the tile layer with the OpenStreetMap URL", () => {
    render(<LandingMap points={[]} />)
    expect(screen.getByTestId("tile-layer").dataset.url).toBe(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
  })
})
