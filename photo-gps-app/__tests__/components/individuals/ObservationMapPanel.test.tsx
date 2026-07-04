import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ObservationMapPanel from "@/components/individuals/ObservationMapPanel"
import type { IndividualPhoto } from "@/types/individual"
import type { Photo } from "@/types/photo"

let lastExplorerMapProps: { onSelect: (photo: { id: string }) => void } | undefined

vi.mock("@/components/ExplorerMap", () => ({
  default: (props: { onSelect: (photo: { id: string }) => void }) => {
    lastExplorerMapProps = props
    return <div data-testid="mock-explorer-map" />
  },
}))

function makeGeoPhoto(overrides: Partial<IndividualPhoto> = {}): IndividualPhoto {
  return {
    id: "photo-1",
    url: "https://example.com/photo.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    title: null,
    description: null,
    takenAt: null,
    latitude: 45.1,
    longitude: 4.9,
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    ...overrides,
  }
}

function makeMapPhotos(): Photo[] {
  return []
}

describe("ObservationMapPanel Component", () => {
  it("shows the empty state when there are no geolocated photos", () => {
    render(
      <ObservationMapPanel
        geolocated={[]}
        totalPhotoCount={3}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("Aucune photo géolocalisée pour cet individu.")).toBeInTheDocument()
    expect(screen.queryByTestId("mock-explorer-map")).not.toBeInTheDocument()
  })

  it("renders the map and basemap buttons when there are geolocated photos", async () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={3}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(await screen.findByTestId("mock-explorer-map")).toBeInTheDocument()
    expect(screen.getByText("Plan")).toBeInTheDocument()
    expect(screen.getByText("Satellite")).toBeInTheDocument()
    expect(screen.getByText("Densité")).toBeInTheDocument()
  })

  it("calls onBasemapChange when a basemap button is clicked", async () => {
    const onBasemapChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={onBasemapChange}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    await user.click(screen.getByText("Satellite"))
    expect(onBasemapChange).toHaveBeenCalledWith("satellite")
  })

  it("shows the geolocated / total photo count with correct pluralization", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("1/1 photo géolocalisée")).toBeInTheDocument()
  })

  it("pluralizes photo and géolocalisée when counts are greater than one", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto({ id: "a" }), makeGeoPhoto({ id: "b" })]}
        totalPhotoCount={5}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("2/5 photos géolocalisées")).toBeInTheDocument()
  })

  it("shows the unavailable surface message when surfaceHa is null", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(
      screen.getByText("Surface indisponible (min. 3 observations géolocalisées distinctes).")
    ).toBeInTheDocument()
  })

  it("formats the surface in hectares when >= 1 ha", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={2.567}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("~2.6 ha")).toBeInTheDocument()
  })

  it("formats the surface with two decimals between 0.01 and 1 ha", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={0.256}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("~0.26 ha")).toBeInTheDocument()
  })

  it("formats the surface in square meters when below 0.01 ha", () => {
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={0.005}
        onSelectPhoto={vi.fn()}
      />
    )
    expect(screen.getByText("~50 m²")).toBeInTheDocument()
  })

  it("forwards onSelect from the map to onSelectPhoto with the photo id", async () => {
    const onSelectPhoto = vi.fn()
    render(
      <ObservationMapPanel
        geolocated={[makeGeoPhoto()]}
        totalPhotoCount={1}
        mapPhotos={makeMapPhotos()}
        basemap="street"
        onBasemapChange={vi.fn()}
        surfaceHa={null}
        onSelectPhoto={onSelectPhoto}
      />
    )
    await screen.findByTestId("mock-explorer-map")
    lastExplorerMapProps?.onSelect({ id: "photo-42" })
    expect(onSelectPhoto).toHaveBeenCalledWith("photo-42")
  })
})
