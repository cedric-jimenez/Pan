import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import InteractiveMapSection from "@/components/InteractiveMapSection"
import type { MapPoint } from "@/components/LandingMap"
import type { Photo } from "@/types/photo"

let lastLandingMapPoints: MapPoint[] | undefined

vi.mock("@/components/LandingMap", () => ({
  default: (props: { points: MapPoint[] }) => {
    lastLandingMapPoints = props.points
    return <div data-testid="mock-landing-map">{props.points.length} points</div>
  },
}))

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

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

function jsonResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

function stubGeolocation(impl?: (
  success: PositionCallback,
  error?: PositionErrorCallback
) => void) {
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl ?? (() => {})) },
  })
}

function removeGeolocation() {
  delete (global.navigator as { geolocation?: unknown }).geolocation
}

describe("InteractiveMapSection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    stubGeolocation()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("shows a loading message while fetching photos", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
    render(<InteractiveMapSection />)
    expect(screen.getByText("Chargement…")).toBeInTheDocument()
  })

  it("shows the empty state when there are no photos", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { photos: [] }))
    render(<InteractiveMapSection />)
    expect(await screen.findByText("Aucune observation pour le moment.")).toBeInTheDocument()
  })

  it("falls back to an empty list when the fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, {}))
    render(<InteractiveMapSection />)
    expect(await screen.findByText("Aucune observation pour le moment.")).toBeInTheDocument()
  })

  it("falls back to an empty list when the fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"))
    render(<InteractiveMapSection />)
    expect(await screen.findByText("Aucune observation pour le moment.")).toBeInTheDocument()
  })

  it("renders observations sorted by recency when there is no known position", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [
          makePhoto({ id: "a", title: "First" }),
          makePhoto({ id: "b", title: "Second" }),
        ],
      })
    )
    render(<InteractiveMapSection />)

    expect(await screen.findByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("Vos observations les plus récentes")).toBeInTheDocument()
  })

  it("passes every geolocated photo as a map point", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [
          makePhoto({ id: "a", latitude: 45, longitude: 5 }),
          makePhoto({ id: "b", latitude: null, longitude: null }),
        ],
      })
    )
    render(<InteractiveMapSection />)

    await screen.findByTestId("mock-landing-map")
    expect(lastLandingMapPoints).toHaveLength(1)
    expect(lastLandingMapPoints?.[0].id).toBe("a")
  })

  it("sorts observations by distance to the user's position when geolocation succeeds", async () => {
    stubGeolocation((success) => {
      success({
        coords: { latitude: 45, longitude: 5 },
      } as GeolocationPosition)
    })
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [
          makePhoto({ id: "far", title: "Far", latitude: 10, longitude: 10 }),
          makePhoto({ id: "near", title: "Near", latitude: 45.01, longitude: 5.01 }),
        ],
      })
    )
    render(<InteractiveMapSection />)

    expect(await screen.findByText("Basé sur votre position actuelle")).toBeInTheDocument()
    const names = screen.getAllByText(/Far|Near/).map((el) => el.textContent)
    expect(names).toEqual(["Near", "Far"])
  })

  it("does not request geolocation when it is unsupported", async () => {
    removeGeolocation()
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { photos: [] }))

    render(<InteractiveMapSection />)

    await screen.findByText("Aucune observation pour le moment.")
    expect(screen.getByText("Vos observations les plus récentes")).toBeInTheDocument()
  })

  it("shows a validated badge for identified individuals and in-progress otherwise", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [
          makePhoto({ id: "a", individualId: "ind-1", title: "Identified" }),
          makePhoto({ id: "b", individualId: null, title: "Unidentified" }),
        ],
      })
    )
    render(<InteractiveMapSection />)

    await screen.findByText("Identified")
    expect(screen.getByText("Validé")).toBeInTheDocument()
    expect(screen.getByText("En cours")).toBeInTheDocument()
  })

  it("falls back to createdAt and then to an unknown-date label", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [
          makePhoto({ id: "a", title: "NoTakenAt", takenAt: null, createdAt: "2024-02-02T00:00:00.000Z" }),
          makePhoto({ id: "b", title: "NoDateAtAll", takenAt: null, createdAt: "" }),
        ],
      })
    )
    render(<InteractiveMapSection />)

    await screen.findByText("NoTakenAt")
    expect(screen.getByText("Date inconnue")).toBeInTheDocument()
  })

  it("falls back to individual name, then title, then original filename for observation labels", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: [makePhoto({ id: "a", title: null, originalName: "IMG_1.jpg" })],
      })
    )
    render(<InteractiveMapSection />)
    expect(await screen.findByText("IMG_1.jpg")).toBeInTheDocument()
  })

  it("caps the observation list at 8 entries", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        photos: Array.from({ length: 10 }, (_, i) => makePhoto({ id: `p${i}`, title: `Photo ${i}` })),
      })
    )
    render(<InteractiveMapSection />)

    await screen.findByText("Photo 0")
    await waitFor(() => {
      expect(screen.queryByText("Photo 9")).not.toBeInTheDocument()
    })
    expect(screen.getByText("Photo 7")).toBeInTheDocument()
  })
})
