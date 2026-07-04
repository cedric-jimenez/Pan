import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AddPhotosToIndividualModal from "@/components/AddPhotosToIndividualModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

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

const photoOne = makePhoto({ id: "p1", title: "Photo One" })
const photoTwo = makePhoto({ id: "p2", title: "Photo Two" })
const alreadyAssignedElsewhere = makePhoto({
  id: "p3",
  title: "Photo Three",
  individualId: "other-ind",
  individual: { id: "other-ind", name: "Rex" },
})
const alreadyAssignedHere = makePhoto({ id: "p4", title: "Photo Four", individualId: "ind-1" })

describe("AddPhotosToIndividualModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when isOpen is false", () => {
    global.fetch = vi.fn()
    render(<AddPhotosToIndividualModal isOpen={false} onClose={vi.fn()} individualId="ind-1" />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("shows a loading state while photos are being fetched", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)

    expect(screen.getByText("Chargement des photos…")).toBeInTheDocument()
  })

  it("fetches photos and excludes those already assigned to this individual", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ photos: [photoOne, photoTwo, alreadyAssignedElsewhere, alreadyAssignedHere] })
    )
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)

    expect(global.fetch).toHaveBeenCalledWith("/api/photos?limit=100&sortBy=date&sortOrder=desc")
    expect(await screen.findByAltText("Photo One")).toBeInTheDocument()
    expect(screen.getByAltText("Photo Two")).toBeInTheDocument()
    expect(screen.getByAltText("Photo Three")).toBeInTheDocument()
    expect(screen.queryByAltText("Photo Four")).not.toBeInTheDocument()
    expect(screen.getByText("Rex")).toBeInTheDocument()
  })

  it("shows an empty state when there are no assignable photos", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [] }))
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)

    expect(await screen.findByText("Aucune photo disponible à assigner.")).toBeInTheDocument()
  })

  it("shows a load error when fetching photos fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, false))
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)

    expect(await screen.findByText("Échec du chargement des photos")).toBeInTheDocument()
  })

  it("shows a validation error when assigning without selecting a photo", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne, photoTwo] }))
    const user = userEvent.setup()
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)
    await screen.findByAltText("Photo One")

    await user.click(screen.getByRole("button", { name: "Assigner" }))

    expect(await screen.findByText("Sélectionnez au moins une photo")).toBeInTheDocument()
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("updates the selection count as photos are toggled", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne, photoTwo] }))
    const user = userEvent.setup()
    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)
    await screen.findByAltText("Photo One")

    expect(screen.getByText("0 sélectionnées")).toBeInTheDocument()

    await user.click(screen.getByAltText("Photo One"))
    expect(screen.getByText("1 sélectionnée")).toBeInTheDocument()

    await user.click(screen.getByAltText("Photo Two"))
    expect(screen.getByText("2 sélectionnées")).toBeInTheDocument()
  })

  it("assigns each selected photo to the individual", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne, photoTwo] }))
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}))
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <AddPhotosToIndividualModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        individualId="ind-1"
      />
    )
    await screen.findByAltText("Photo One")

    await user.click(screen.getByAltText("Photo One"))
    await user.click(screen.getByAltText("Photo Two"))
    await user.click(screen.getByRole("button", { name: "Assigner" }))

    await waitFor(() => expect(fetchWithCsrf).toHaveBeenCalledTimes(2))
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      1,
      "/api/individuals/ind-1/assign",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "p1" }) })
    )
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      2,
      "/api/individuals/ind-1/assign",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "p2" }) })
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows a server error and does not call onSuccess when an assignment fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne] }))
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}, false))
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(
      <AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} individualId="ind-1" />
    )
    await screen.findByAltText("Photo One")

    await user.click(screen.getByAltText("Photo One"))
    await user.click(screen.getByRole("button", { name: "Assigner" }))

    expect(await screen.findByText("Échec de l'assignation d'une photo")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("disables buttons and shows a loading state while assigning", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne] }))
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetchWithCsrf).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    const user = userEvent.setup()

    render(<AddPhotosToIndividualModal isOpen={true} onClose={vi.fn()} individualId="ind-1" />)
    await screen.findByAltText("Photo One")

    await user.click(screen.getByAltText("Photo One"))
    await user.click(screen.getByRole("button", { name: "Assigner" }))

    expect(await screen.findByText("Loading...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled()

    resolveFetch(jsonResponse({}))
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument())
  })

  it("calls onClose when Annuler is clicked without making a request", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photos: [photoOne] }))
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<AddPhotosToIndividualModal isOpen={true} onClose={onClose} individualId="ind-1" />)
    await screen.findByAltText("Photo One")

    await user.click(screen.getByRole("button", { name: "Annuler" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })
})
