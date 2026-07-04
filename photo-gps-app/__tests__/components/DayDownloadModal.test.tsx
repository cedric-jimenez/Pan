import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DayDownloadModal from "@/components/DayDownloadModal"
import { Photo } from "@/types/photo"

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

function makePhoto(overrides: Partial<Photo> & { id: string }): Photo {
  return {
    userId: "user-1",
    individualId: null,
    filename: `${overrides.id}.jpg`,
    originalName: `${overrides.id}.jpg`,
    fileSize: 1000,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: `https://r2/${overrides.id}.jpg`,
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
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  }
}

const testDate = new Date(2024, 2, 15)
const photoOriginalOnly = makePhoto({ id: "p1", title: "Photo One" })
const photoFullSet = makePhoto({
  id: "p2",
  title: "Photo Two",
  croppedUrl: "https://r2/p2-crop.jpg",
  segmentedUrl: "https://r2/p2-seg.jpg",
})

describe("DayDownloadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url")
    window.URL.revokeObjectURL = vi.fn()
  })

  it("renders nothing when isOpen is false", () => {
    global.fetch = vi.fn()
    render(<DayDownloadModal date={testDate} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("shows a loading state while photos are being fetched", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText("Chargement des photos…")).toBeInTheDocument()
  })

  it("fetches photos for the day and shows counts per image type", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ photos: [photoOriginalOnly, photoFullSet] })
    )
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)

    expect(global.fetch).toHaveBeenCalledWith("/api/photos/by-day?date=2024-03-15")
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[0]).toBeChecked() // original, selected by default
    expect(checkboxes[1]).not.toBeChecked() // cropped
    expect(checkboxes[2]).not.toBeChecked() // segmented

    expect(screen.getByText("Images originales")).toBeInTheDocument()
    expect(screen.getByRole("dialog").textContent).toContain("2 images à télécharger")
  })

  it("shows a load error when fetching photos fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Erreur serveur" }, false))
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument()
  })

  it("disables the download button when there are no images to download", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [] }))
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByRole("dialog").textContent).toContain("0 image à télécharger")
    )
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeDisabled()
  })

  it("does not allow deselecting the only selected image type", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ photos: [photoOriginalOnly, photoFullSet] })
    )
    const user = userEvent.setup()
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    const [originalCheckbox] = screen.getAllByRole("checkbox")
    await user.click(originalCheckbox)

    expect(originalCheckbox).toBeChecked()
    expect(screen.getByRole("dialog").textContent).toContain("2 images à télécharger")
  })

  it("updates the total when additional image types are selected", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ photos: [photoOriginalOnly, photoFullSet] })
    )
    const user = userEvent.setup()
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    const [originalCheckbox, croppedCheckbox] = screen.getAllByRole("checkbox")
    await user.click(croppedCheckbox)
    expect(screen.getByRole("dialog").textContent).toContain("3 images à télécharger")

    await user.click(originalCheckbox)
    expect(originalCheckbox).not.toBeChecked()
    expect(screen.getByRole("dialog").textContent).toContain("1 image à télécharger")
  })

  it("calls onClose when Annuler is clicked without downloading", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOriginalOnly] }))
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DayDownloadModal date={testDate} isOpen={true} onClose={onClose} />)
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    await user.click(screen.getByRole("button", { name: "Annuler" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("downloads the selected images, builds a zip, and closes when done", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString()
      if (urlStr.startsWith("/api/photos/by-day")) {
        return jsonResponse({ photos: [photoOriginalOnly] })
      }
      return { ok: true, blob: async () => new Blob(["fake-image-data"]) } as unknown as Response
    })
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<DayDownloadModal date={testDate} isOpen={true} onClose={onClose} />)
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    await user.click(screen.getByRole("button", { name: "Télécharger" }))

    expect(await screen.findByText("Téléchargement terminé !", {}, { timeout: 3000 })).toBeInTheDocument()
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 })
  }, 10000)

  it("disables buttons and shows progress while downloading", async () => {
    let resolveProxy: (value: Response) => void = () => {}
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString()
      if (urlStr.startsWith("/api/photos/by-day")) {
        return jsonResponse({ photos: [photoOriginalOnly] })
      }
      return new Promise<Response>((resolve) => {
        resolveProxy = resolve
      })
    })
    const user = userEvent.setup()

    render(<DayDownloadModal date={testDate} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(3))

    await user.click(screen.getByRole("button", { name: "Télécharger" }))

    expect(await screen.findByText("Téléchargement 1/1...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled()

    resolveProxy({ ok: true, blob: async () => new Blob(["fake-image-data"]) } as unknown as Response)
    await waitFor(() => expect(screen.queryByText(/Téléchargement 1\/1/)).not.toBeInTheDocument(), {
      timeout: 3000,
    })
  }, 10000)
})
