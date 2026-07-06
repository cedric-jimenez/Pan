import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import HeatmapLayer from "@/components/HeatmapLayer"

vi.mock("react-leaflet", () => ({
  useMap: vi.fn(),
}))

vi.mock("leaflet.heat", () => ({}))

vi.mock("leaflet", () => ({
  default: {
    heatLayer: vi.fn(),
  },
}))

const mockedUseMap = vi.mocked(useMap)
const mockedHeatLayer = vi.mocked(L.heatLayer)

describe("HeatmapLayer", () => {
  const fakeMap = { removeLayer: vi.fn() } as unknown as L.Map
  const fakeLayer = { addTo: vi.fn() } as unknown as L.Layer

  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseMap.mockReturnValue(fakeMap)
    mockedHeatLayer.mockReturnValue(fakeLayer)
  })

  it("renders nothing", () => {
    const { container } = render(<HeatmapLayer points={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("does not create a layer when there are no points", () => {
    render(<HeatmapLayer points={[]} />)
    expect(mockedHeatLayer).not.toHaveBeenCalled()
  })

  it("creates a heat layer with default options and adds it to the map", () => {
    render(<HeatmapLayer points={[[45, 5, 1]]} />)

    expect(mockedHeatLayer).toHaveBeenCalledWith(
      [[45, 5, 1]],
      expect.objectContaining({
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.5,
        gradient: { 0.0: "blue", 0.5: "lime", 0.7: "yellow", 1.0: "red" },
      })
    )
    expect((fakeLayer as unknown as { addTo: ReturnType<typeof vi.fn> }).addTo).toHaveBeenCalledWith(
      fakeMap
    )
  })

  it("applies custom options over the defaults", () => {
    render(
      <HeatmapLayer
        points={[[45, 5, 1]]}
        options={{ radius: 10, gradient: { 0.0: "black" } }}
      />
    )

    expect(mockedHeatLayer).toHaveBeenCalledWith(
      [[45, 5, 1]],
      expect.objectContaining({ radius: 10, gradient: { 0.0: "black" } })
    )
  })

  it("removes the layer from the map on unmount", () => {
    const removeLayer = vi.fn()
    mockedUseMap.mockReturnValue({ removeLayer } as unknown as L.Map)

    const { unmount } = render(<HeatmapLayer points={[[45, 5, 1]]} />)
    unmount()

    expect(removeLayer).toHaveBeenCalledWith(fakeLayer)
  })
})
