import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"
import imageCompression from "browser-image-compression"
import PhotoUpload from "@/components/PhotoUpload"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}))

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

const mockedImageCompression = vi.mocked(imageCompression)
const mockedFetchWithCsrf = vi.mocked(fetchWithCsrf)

function makeFile(name: string, sizeBytes = 1024, type = "image/jpeg"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

function jsonResponse(status: number, ok: boolean, body: unknown): Response {
  return { ok, status, json: async () => body } as Response
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error("file input not found")
  return input as HTMLInputElement
}

/** Select files on the dropzone's hidden input and let the async onDrop chain settle. */
async function selectFiles(container: HTMLElement, files: File[]) {
  await act(async () => {
    fireEvent.change(getFileInput(container), { target: { files } })
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe("PhotoUpload Component", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockedImageCompression.mockReset()
    mockedFetchWithCsrf.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the dropzone prompt", () => {
    render(<PhotoUpload onUploadComplete={vi.fn()} />)
    expect(screen.getByText("Drag & drop photos here, or click to select")).toBeInTheDocument()
  })

  it("uploads a file successfully and calls onUploadComplete after the delay", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(
      jsonResponse(201, true, { photo: { salamanderDetected: true } })
    )
    const onUploadComplete = vi.fn()
    const { container } = render(<PhotoUpload onUploadComplete={onUploadComplete} />)

    await selectFiles(container, [makeFile("newt.jpg")])

    expect(screen.getByText("✓ newt.jpg importé avec succès")).toBeInTheDocument()
    expect(onUploadComplete).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(onUploadComplete).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("✓ newt.jpg importé avec succès")).not.toBeInTheDocument()
  })

  it("compresses files at or above the max upload size before sending them", async () => {
    const compressed = makeFile("newt.jpg", 1024)
    mockedImageCompression.mockResolvedValueOnce(compressed)
    mockedFetchWithCsrf.mockResolvedValueOnce(
      jsonResponse(201, true, { photo: { salamanderDetected: true } })
    )
    const { container } = render(<PhotoUpload onUploadComplete={vi.fn()} />)

    await selectFiles(container, [makeFile("newt.jpg", 5 * 1024 * 1024)])

    expect(mockedImageCompression).toHaveBeenCalledTimes(1)
    expect(screen.getByText("✓ newt.jpg importé avec succès")).toBeInTheDocument()
  })

  it("does not compress files below the max upload size", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(
      jsonResponse(201, true, { photo: { salamanderDetected: true } })
    )
    const { container } = render(<PhotoUpload onUploadComplete={vi.fn()} />)

    await selectFiles(container, [makeFile("newt.jpg", 1024)])

    expect(mockedImageCompression).not.toHaveBeenCalled()
  })

  it("shows a distinct message and still completes when no salamander is detected", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(
      jsonResponse(201, true, { photo: { salamanderDetected: false } })
    )
    const onUploadComplete = vi.fn()
    const { container } = render(<PhotoUpload onUploadComplete={onUploadComplete} />)

    await selectFiles(container, [makeFile("blurry.jpg")])

    expect(screen.getByText("⚠ blurry.jpg : aucune salamandre détectée")).toBeInTheDocument()
    expect(screen.getByText("Aucune salamandre détectée sur cette photo")).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(onUploadComplete).toHaveBeenCalledTimes(1)
  })

  it("maps a 401 upload error to the French auth message", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(jsonResponse(401, false, { error: "unauthorized" }))
    const onUploadComplete = vi.fn()
    const { container } = render(<PhotoUpload onUploadComplete={onUploadComplete} />)

    await selectFiles(container, [makeFile("newt.jpg")])

    expect(
      screen.getByText("✗ newt.jpg : Vous devez être connecté pour uploader des photos")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Certains fichiers n'ont pas pu être uploadés. Consultez les détails ci-dessus.")
    ).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(onUploadComplete).not.toHaveBeenCalled()
  })

  it("maps a 409 upload error to the duplicate-file message", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(jsonResponse(409, false, { error: "duplicate" }))
    const { container } = render(<PhotoUpload onUploadComplete={vi.fn()} />)

    await selectFiles(container, [makeFile("newt.jpg")])

    expect(
      screen.getByText("✗ newt.jpg : Ce fichier existe déjà dans votre galerie")
    ).toBeInTheDocument()
  })

  it("falls back to a generic status message for unmapped error codes", async () => {
    mockedFetchWithCsrf.mockResolvedValueOnce(jsonResponse(418, false, { error: "teapot" }))
    const { container } = render(<PhotoUpload onUploadComplete={vi.fn()} />)

    await selectFiles(container, [makeFile("newt.jpg")])

    expect(screen.getByText("✗ newt.jpg : Erreur 418: teapot")).toBeInTheDocument()
  })
})
