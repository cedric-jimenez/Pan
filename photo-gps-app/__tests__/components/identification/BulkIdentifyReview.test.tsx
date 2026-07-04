import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BulkIdentifyReview from "@/components/identification/BulkIdentifyReview"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Photo } from "@/types/photo"
import { SimilarPhotoResult } from "@/types/identification"

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

function makeSimilarResult(overrides: Partial<SimilarPhotoResult> = {}): SimilarPhotoResult {
  return {
    id: "s1",
    filename: "s1.jpg",
    url: "/s1.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    title: null,
    description: null,
    takenAt: null,
    latitude: null,
    longitude: null,
    individualId: "ind-1",
    individualName: "Hugo",
    distance: 0.1,
    similarityScore: 0.9,
    isSame: true,
    ...overrides,
  }
}

describe("BulkIdentifyReview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows an analyzing progress bar while similarity requests are in flight", async () => {
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
    render(<BulkIdentifyReview detected={[photo]} />)

    expect(screen.getByText("Analyse des correspondances")).toBeInTheDocument()
    expect(screen.getByText("Analyse en cours…")).toBeInTheDocument()

    resolveFetch(jsonResponse(200, []))
    await waitFor(() => expect(screen.queryByText("Analyse en cours…")).not.toBeInTheDocument())
  })

  it("suggests the best verified existing match once analysis completes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, [
          makeSimilarResult({ individualName: "Hugo", similarityScore: 0.6 }),
          makeSimilarResult({ individualName: "Milo", similarityScore: 0.95, individualId: "ind-2" }),
        ])
      )
    )

    const photo = makePhoto()
    render(<BulkIdentifyReview detected={[photo]} />)

    expect(await screen.findByText(/Correspond à Milo/)).toBeInTheDocument()
    expect(screen.getByText("(95%)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rattacher à Milo" })).toBeInTheDocument()
  })

  it("shows no-match state when nothing qualifies, noting analysis failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, {})))

    const photo = makePhoto()
    render(<BulkIdentifyReview detected={[photo]} />)

    expect(
      await screen.findByText("Aucun individu existant (analyse indisponible)")
    ).toBeInTheDocument()
  })

  it("attaches a photo to the suggested individual and calls onAttached", async () => {
    const user = userEvent.setup()
    const onAttached = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, [makeSimilarResult({ individualName: "Hugo" })]))
    )
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, { individual: { name: "Hugo" } })
    )

    const photo = makePhoto({ id: "p42" })
    render(<BulkIdentifyReview detected={[photo]} onAttached={onAttached} />)

    const attachButton = await screen.findByRole("button", { name: "Rattacher à Hugo" })
    await user.click(attachButton)

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/identification/confirm",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ photoIds: ["p42"], individualId: "ind-1" }),
        })
      )
    )

    expect(await screen.findByText("Rattachée à Hugo ✓")).toBeInTheDocument()
    expect(onAttached).toHaveBeenCalledTimes(1)
    expect(screen.getByText("1 / 1 rattachée")).toBeInTheDocument()
  })

  it("shows an inline error and re-enables actions when attaching fails", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, [makeSimilarResult({ individualName: "Hugo" })]))
    )
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(500, { error: "Erreur serveur" }))

    const photo = makePhoto({ id: "p42" })
    render(<BulkIdentifyReview detected={[photo]} />)

    const attachButton = await screen.findByRole("button", { name: "Rattacher à Hugo" })
    await user.click(attachButton)

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rattacher à Hugo" })).toBeEnabled()
  })

  it("marks a row as ignored and removes its action buttons", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, [])))

    const photo = makePhoto()
    render(<BulkIdentifyReview detected={[photo]} />)

    const ignoreButton = await screen.findByRole("button", { name: "Ignorer" })
    await user.click(ignoreButton)

    expect(screen.getByText("Ignorée")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ignorer" })).not.toBeInTheDocument()
  })

  it("opens the create-individual modal and attaches on success", async () => {
    const user = userEvent.setup()
    const onAttached = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/similar")) return Promise.resolve(jsonResponse(200, []))
        return Promise.resolve(jsonResponse(200, { name: "Suggested" }))
      })
    )
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, { individual: { name: "NewOne" }, assignedCount: 1 })
    )

    const photo = makePhoto({ id: "p7" })
    render(<BulkIdentifyReview detected={[photo]} onAttached={onAttached} />)

    const createButton = await screen.findByRole("button", { name: "Créer un nouvel individu" })
    await user.click(createButton)

    expect(await screen.findByText("Associer à un individu")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/identification/confirm",
        expect.objectContaining({
          body: JSON.stringify({ photoIds: ["p7"], newName: "Suggested" }),
        })
      )
    )

    expect(await screen.findByText("Rattachée à NewOne ✓")).toBeInTheDocument()
    expect(onAttached).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Associer à un individu")).not.toBeInTheDocument()
  })
})
