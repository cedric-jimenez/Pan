import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhotoDetailsModal from "@/components/PhotoDetailsModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

function jsonResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    userId: "u1",
    individualId: null,
    filename: "photo-1.jpg",
    originalName: "photo-1.jpg",
    fileSize: 1000,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: "/photo-1.jpg",
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
    salamanderDetected: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  }
}

function makeFetchMock(overrides: Record<string, () => Promise<Response>> = {}) {
  return vi.fn((url: string) => {
    for (const key of Object.keys(overrides)) {
      if (url.endsWith(key)) return overrides[key]()
    }
    if (url.includes("/similar")) return Promise.resolve(jsonResponse(200, []))
    if (url.includes("/api/individuals")) {
      return Promise.resolve(jsonResponse(200, { individuals: [] }))
    }
    return Promise.resolve(jsonResponse(200, {}))
  })
}

function closeButton(container: HTMLElement): HTMLElement {
  return container.querySelector("button.text-muted-foreground") as HTMLElement
}

describe("PhotoDetailsModal", () => {
  const onClose = vi.fn()
  const onUpdate = vi.fn()
  const onDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", makeFetchMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders the photo title, description, and info panel", async () => {
    const photo = makePhoto({ title: "Salamandre du jardin", description: "Vue de dos" })
    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    expect(screen.getByText("Salamandre du jardin")).toBeInTheDocument()
    expect(screen.getByText("Vue de dos")).toBeInTheDocument()
    expect(screen.getByText("Photo Information")).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/photos/photo-1/similar"))
  })

  it("falls back to the original filename when there is no title", async () => {
    const photo = makePhoto({ title: null, originalName: "IMG_0042.jpg" })
    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("IMG_0042.jpg")).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it("shows a loading state for same-individual photos while similar photos load", async () => {
    let resolveFetch: (value: Response) => void = () => {}
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
      )
    )

    const photo = makePhoto()
    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    expect(screen.getByText("Chargement...")).toBeInTheDocument()

    resolveFetch(jsonResponse(200, []))
    await waitFor(() =>
      expect(screen.getByText("Aucune autre photo du même individu trouvée.")).toBeInTheDocument()
    )
  })

  it("displays only same-individual matches confirmed by the verifier", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        "/similar": () =>
          Promise.resolve(
            jsonResponse(200, [
              {
                id: "s1",
                filename: "s1.jpg",
                url: "/s1.jpg",
                croppedUrl: null,
                segmentedUrl: null,
                title: "Same one",
                description: null,
                takenAt: null,
                latitude: null,
                longitude: null,
                distance: 0.1,
                similarityScore: 0.9,
                isSame: true,
              },
              {
                id: "s2",
                filename: "s2.jpg",
                url: "/s2.jpg",
                croppedUrl: null,
                segmentedUrl: null,
                title: "Different one",
                description: null,
                takenAt: null,
                latitude: null,
                longitude: null,
                distance: 0.5,
                similarityScore: 0.4,
                isSame: false,
              },
            ])
          ),
      })
    )

    const photo = makePhoto()
    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    expect(await screen.findByText("Même individu (1)")).toBeInTheDocument()
    expect(screen.getByAltText("Same one")).toBeInTheDocument()
    expect(screen.queryByAltText("Different one")).not.toBeInTheDocument()
  })

  it("enters edit mode, edits the fields, and saves via fetchWithCsrf", async () => {
    const user = userEvent.setup()
    const photo = makePhoto({ title: "Old title", description: "Old description" })
    const updatedPhoto = makePhoto({ title: "New title", description: "New description" })
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(200, { photo: updatedPhoto }))

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))

    const titleInput = screen.getByPlaceholderText("Add a title")
    await user.clear(titleInput)
    await user.type(titleInput, "New title")

    const descriptionInput = screen.getByPlaceholderText("Add a description")
    await user.clear(descriptionInput)
    await user.type(descriptionInput, "New description")

    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/photos/photo-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ title: "New title", description: "New description" }),
        })
      )
    )
    expect(onUpdate).toHaveBeenCalledWith(updatedPhoto)
    expect(screen.queryByPlaceholderText("Add a title")).not.toBeInTheDocument()
  })

  it("discards edits when cancel is clicked", async () => {
    const user = userEvent.setup()
    const photo = makePhoto({ title: "Old title", description: "Old description" })

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))
    const titleInput = screen.getByPlaceholderText("Add a title")
    await user.clear(titleInput)
    await user.type(titleInput, "Discarded title")

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByPlaceholderText("Add a title")).not.toBeInTheDocument()
    expect(screen.getByText("Old title")).toBeInTheDocument()
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("does not save or call onUpdate when the save request fails", async () => {
    const user = userEvent.setup()
    const photo = makePhoto({ title: "Old title" })
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(500, { error: "boom" }))

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => expect(fetchWithCsrf).toHaveBeenCalled())
    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText("Add a title")).toBeInTheDocument()
  })

  it("deletes the photo after confirmation", async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const photo = makePhoto()
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(200, {}))

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to delete this photo?")
    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith("/api/photos/photo-1", { method: "DELETE" })
    )
    expect(onDelete).toHaveBeenCalledWith("photo-1")
  })

  it("does not delete the photo when the confirmation is declined", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const photo = makePhoto()

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(fetchWithCsrf).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it("reprocesses the photo, shows the result, and refreshes photo + similar data", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()
    const refreshedPhoto = makePhoto({ croppedUrl: "/cropped.jpg" })

    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, {
        results: [
          {
            photoId: "photo-1",
            success: true,
            salamanderDetected: true,
            hasCropped: true,
            hasSegmented: true,
            hasEmbedding: true,
          },
        ],
      })
    )
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        "/api/photos/photo-1": () => Promise.resolve(jsonResponse(200, { photo: refreshedPhoto })),
      })
    )

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: /Retraiter/ }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/photos/bulk-process",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ photoIds: ["photo-1"] }),
        })
      )
    )

    expect(await screen.findByText("Retraitement terminé")).toBeInTheDocument()
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(refreshedPhoto))
  })

  it("shows an error panel when reprocessing fails", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(500, { error: "Erreur inconnue" }))

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    await user.click(screen.getByRole("button", { name: /Retraiter/ }))

    expect(await screen.findByText("Erreur : Erreur inconnue")).toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it("opens the assign-individual modal from the actions bar", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()

    render(<PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />)

    expect(screen.queryByText("Assign to Individual")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Assign Individual" }))

    expect(await screen.findByText("Assign to Individual")).toBeInTheDocument()
  })

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()

    const { container } = render(
      <PhotoDetailsModal photo={photo} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />
    )

    await user.click(closeButton(container))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("renders navigation buttons only for the directions that are available", async () => {
    const photo = makePhoto()
    const onNavigate = vi.fn()

    const { rerender } = render(
      <PhotoDetailsModal
        photo={photo}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onNavigate={onNavigate}
        hasPrev={false}
        hasNext={true}
      />
    )

    expect(screen.queryByLabelText("Photo précédente")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Photo suivante")).toBeInTheDocument()

    rerender(
      <PhotoDetailsModal
        photo={photo}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onNavigate={onNavigate}
        hasPrev={true}
        hasNext={false}
      />
    )

    expect(screen.getByLabelText("Photo précédente")).toBeInTheDocument()
    expect(screen.queryByLabelText("Photo suivante")).not.toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it("navigates via on-screen buttons and arrow keys", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()
    const onNavigate = vi.fn()

    render(
      <PhotoDetailsModal
        photo={photo}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onNavigate={onNavigate}
        hasPrev={true}
        hasNext={true}
      />
    )

    await user.click(screen.getByLabelText("Photo suivante"))
    expect(onNavigate).toHaveBeenCalledWith("next")

    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(onNavigate).toHaveBeenCalledWith("prev")
  })

  it("ignores arrow-key navigation while editing", async () => {
    const user = userEvent.setup()
    const photo = makePhoto()
    const onNavigate = vi.fn()

    render(
      <PhotoDetailsModal
        photo={photo}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onNavigate={onNavigate}
        hasPrev={true}
        hasNext={true}
      />
    )

    await user.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.keyDown(window, { key: "ArrowRight" })

    expect(onNavigate).not.toHaveBeenCalled()
  })
})
