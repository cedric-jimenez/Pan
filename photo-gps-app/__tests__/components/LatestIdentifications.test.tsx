import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import LatestIdentifications from "@/components/LatestIdentifications"
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
    takenAt: "2024-05-01T00:00:00.000Z",
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
    createdAt: "2024-05-01T00:00:00.000Z",
    updatedAt: "2024-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function mockFetchResponses(photos: Photo[], individuals: { id: string; photoCount: number }[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/api/photos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ photos }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ individuals }),
      } as Response)
    })
  )
}

describe("LatestIdentifications Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows a loading message before data arrives", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    )
    render(<LatestIdentifications />)
    expect(screen.getByText("Chargement…")).toBeInTheDocument()
  })

  it("shows the section heading and 'Voir tout' link", async () => {
    mockFetchResponses([], [])
    render(<LatestIdentifications />)
    expect(screen.getByText("Dernières identifications")).toBeInTheDocument()
    expect(screen.getByText("Voir tout").closest("a")).toHaveAttribute("href", "/individuals")
    await waitFor(() => expect(screen.queryByText("Chargement…")).not.toBeInTheDocument())
  })

  it("shows an empty state when there are no identified photos", async () => {
    mockFetchResponses([makePhoto({ individualId: null })], [])
    render(<LatestIdentifications />)
    await waitFor(() =>
      expect(screen.getByText("Aucune identification pour le moment.")).toBeInTheDocument()
    )
  })

  it("shows an empty state when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error")))
    )
    render(<LatestIdentifications />)
    await waitFor(() =>
      expect(screen.getByText("Aucune identification pour le moment.")).toBeInTheDocument()
    )
  })

  it("renders only photos that have an individual assigned, up to 4", async () => {
    const photos = [
      makePhoto({ id: "1", individualId: "ind-1", title: "One" }),
      makePhoto({ id: "2", individualId: null, title: "Unassigned" }),
      makePhoto({ id: "3", individualId: "ind-2", title: "Three" }),
    ]
    mockFetchResponses(photos, [
      { id: "ind-1", photoCount: 5 },
      { id: "ind-2", photoCount: 2 },
    ])
    render(<LatestIdentifications />)
    await waitFor(() => expect(screen.getByText("One")).toBeInTheDocument())
    expect(screen.getByText("Three")).toBeInTheDocument()
    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument()
  })

  it("shows the observation count badge for each identified photo", async () => {
    const photos = [makePhoto({ id: "1", individualId: "ind-1", title: "One" })]
    mockFetchResponses(photos, [{ id: "ind-1", photoCount: 7 }])
    render(<LatestIdentifications />)
    await waitFor(() => expect(screen.getByText("7 obs")).toBeInTheDocument())
  })

  it("uses the individual name, then title, then original filename for the card label", async () => {
    const photos = [
      makePhoto({
        id: "1",
        individualId: "ind-1",
        individual: { id: "ind-1", name: "Spotty" },
        title: "ignored",
      }),
    ]
    mockFetchResponses(photos, [{ id: "ind-1", photoCount: 1 }])
    render(<LatestIdentifications />)
    await waitFor(() => expect(screen.getByText("Spotty")).toBeInTheDocument())
  })

  it("shows the formatted identification date", async () => {
    const photos = [
      makePhoto({
        id: "1",
        individualId: "ind-1",
        title: "Dated",
        takenAt: "2024-05-01T00:00:00.000Z",
      }),
    ]
    mockFetchResponses(photos, [{ id: "ind-1", photoCount: 1 }])
    render(<LatestIdentifications />)
    await waitFor(() => expect(screen.getByText("Identifié le 1 mai 2024")).toBeInTheDocument())
  })
})
