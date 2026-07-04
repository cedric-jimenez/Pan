import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BulkImportDropzone, {
  BulkImportResult,
} from "@/components/identification/BulkImportDropzone"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

function jsonResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "p1",
    userId: "u1",
    individualId: null,
    filename: "p1.jpg",
    originalName: "p1.jpg",
    fileSize: 100,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: "/p1.jpg",
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

function makeFile(name: string): File {
  return new File(["content"], name, { type: "image/jpeg" })
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

describe("BulkImportDropzone", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the initial dropzone prompt", () => {
    render(<BulkImportDropzone onComplete={vi.fn()} />)
    expect(screen.getByText("Glissez-déposez vos photos ici")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sélectionner des images" })).toBeInTheDocument()
  })

  it("applies a disabled visual state when busy", () => {
    const { container } = render(<BulkImportDropzone onComplete={vi.fn()} busy />)
    const root = container.querySelector(".border-dashed")
    expect(root).toHaveClass("opacity-90")
  })

  it("uploads a detected photo and reports it through onComplete", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const photo = makePhoto({ salamanderDetected: true })
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(200, { photo }))

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, makeFile("salamander.jpg"))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const result: BulkImportResult = onComplete.mock.calls[0][0]
    expect(result.detected).toEqual([photo])
    expect(result.noDetection).toEqual([])
    expect(result.errors).toEqual([])

    expect(fetchWithCsrf).toHaveBeenCalledWith(
      "/api/photos/upload",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    )

    expect(screen.getByText("Glissez-déposez vos photos ici")).toBeInTheDocument()
  })

  it("reports photos with no detection separately from detected ones", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const photo = makePhoto({ salamanderDetected: false })
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(200, { photo }))

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, makeFile("no-salamander.jpg"))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const result: BulkImportResult = onComplete.mock.calls[0][0]
    expect(result.detected).toEqual([])
    expect(result.noDetection).toEqual(["no-salamander.jpg"])
    expect(result.errors).toEqual([])
  })

  it("maps a duplicate (409) response to a friendly error message", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(409, { error: "duplicate" }))

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, makeFile("dup.jpg"))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const result: BulkImportResult = onComplete.mock.calls[0][0]
    expect(result.errors).toEqual([
      { filename: "dup.jpg", message: "Cette photo existe déjà dans votre galerie" },
    ])
    expect(result.detected).toEqual([])
    expect(result.noDetection).toEqual([])
  })

  it("processes multiple files sequentially and buckets each outcome", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const detectedPhoto = makePhoto({ id: "p-detected", salamanderDetected: true })
    const noDetectionPhoto = makePhoto({ id: "p-none", salamanderDetected: false })

    vi.mocked(fetchWithCsrf)
      .mockResolvedValueOnce(jsonResponse(200, { photo: detectedPhoto }))
      .mockResolvedValueOnce(jsonResponse(200, { photo: noDetectionPhoto }))
      .mockResolvedValueOnce(jsonResponse(500, { error: "boom" }))

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, [
      makeFile("one.jpg"),
      makeFile("two.jpg"),
      makeFile("three.jpg"),
    ])

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const result: BulkImportResult = onComplete.mock.calls[0][0]
    expect(result.detected).toEqual([detectedPhoto])
    expect(result.noDetection).toEqual(["two.jpg"])
    expect(result.errors).toEqual([
      {
        filename: "three.jpg",
        message: "Erreur lors du traitement de l'image. Réessayez avec une autre photo",
      },
    ])
    expect(fetchWithCsrf).toHaveBeenCalledTimes(3)
  })

  it("shows an upload-in-progress state while requests are pending", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetchWithCsrf).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
    )

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, makeFile("pending.jpg"))

    expect(await screen.findByText("Photos importées")).toBeInTheDocument()
    expect(screen.getByText("0 / 1")).toBeInTheDocument()
    expect(screen.queryByText("Glissez-déposez vos photos ici")).not.toBeInTheDocument()

    resolveFetch(jsonResponse(200, { photo: makePhoto() }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it("reports an error when the upload response has no photo payload", async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(200, {}))

    const { container } = render(<BulkImportDropzone onComplete={onComplete} />)
    const input = getFileInput(container)

    await user.upload(input, makeFile("weird.jpg"))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    const result: BulkImportResult = onComplete.mock.calls[0][0]
    expect(result.errors).toEqual([
      { filename: "weird.jpg", message: "Réponse inattendue du serveur" },
    ])
  })
})
