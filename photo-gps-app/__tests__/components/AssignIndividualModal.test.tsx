import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AssignIndividualModal from "@/components/AssignIndividualModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { IndividualWithCount } from "@/types/individual"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

const individuals: IndividualWithCount[] = [
  {
    id: "ind-1",
    name: "Fido",
    userId: "user-1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    photoCount: 3,
    coverUrl: null,
    lastObservedAt: null,
  },
  {
    id: "ind-2",
    name: "Rex",
    userId: "user-1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    photoCount: 1,
    coverUrl: null,
    lastObservedAt: null,
  },
]

describe("AssignIndividualModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ individuals }))
  })

  it("renders nothing when isOpen is false", () => {
    render(<AssignIndividualModal isOpen={false} onClose={vi.fn()} photoId="photo-1" />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("fetches and renders the list of individuals when opened", async () => {
    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)

    expect(global.fetch).toHaveBeenCalledWith("/api/individuals?limit=100")
    expect(await screen.findByText("Fido")).toBeInTheDocument()
    expect(screen.getByText("Rex")).toBeInTheDocument()
    expect(screen.getByText("3 photos")).toBeInTheDocument()
    expect(screen.getByText("1 photo")).toBeInTheDocument()
  })

  it("shows a validation error when assigning without a selection", async () => {
    const user = userEvent.setup()
    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "Assign" }))

    expect(await screen.findByText("Please select an individual")).toBeInTheDocument()
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("assigns the photo to the selected individual", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}))
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <AssignIndividualModal isOpen={true} onClose={onClose} onSuccess={onSuccess} photoId="photo-1" />
    )
    await screen.findByText("Fido")

    await user.click(screen.getAllByRole("radio")[0])
    await user.click(screen.getByRole("button", { name: "Assign" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/individuals/ind-1/assign",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "photo-1" }) })
      )
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("unassigns from the current individual before assigning the new one", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}))
    const user = userEvent.setup()

    render(
      <AssignIndividualModal
        isOpen={true}
        onClose={vi.fn()}
        photoId="photo-1"
        currentIndividualId="ind-1"
      />
    )
    await screen.findByText("Fido")

    await user.click(screen.getAllByRole("radio")[1])
    await user.click(screen.getByRole("button", { name: "Assign" }))

    await waitFor(() => expect(fetchWithCsrf).toHaveBeenCalledTimes(2))
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      1,
      "/api/individuals/ind-1/unassign",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "photo-1" }) })
    )
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      2,
      "/api/individuals/ind-2/assign",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "photo-1" }) })
    )
  })

  it("closes without a request when re-selecting the already-assigned individual", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <AssignIndividualModal
        isOpen={true}
        onClose={onClose}
        photoId="photo-1"
        currentIndividualId="ind-1"
      />
    )
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "Assign" }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("shows a server error and does not call onSuccess when assignment fails", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}, false))
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(
      <AssignIndividualModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} photoId="photo-1" />
    )
    await screen.findByText("Fido")

    await user.click(screen.getAllByRole("radio")[0])
    await user.click(screen.getByRole("button", { name: "Assign" }))

    expect(await screen.findByText("Failed to assign photo")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("shows a loading state while the assign request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetchWithCsrf).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    const user = userEvent.setup()

    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getAllByRole("radio")[0])
    await user.click(screen.getByRole("button", { name: "Assign" }))

    expect(await screen.findByText("Loading...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()

    resolveFetch(jsonResponse({}))
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument())
  })

  it("unassigns the photo when the Unassign button is clicked", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({}))
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <AssignIndividualModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        photoId="photo-1"
        currentIndividualId="ind-1"
      />
    )
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "Unassign" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/individuals/ind-1/unassign",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "photo-1" }) })
      )
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("switches to the create form and validates the name", async () => {
    const user = userEvent.setup()
    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "+ Create New Individual" }))
    expect(screen.getByText("New Individual Name")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Create & Assign" }))
    expect(await screen.findByText("Please enter a name")).toBeInTheDocument()
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("creates a new individual and assigns the photo to it", async () => {
    vi.mocked(fetchWithCsrf).mockImplementation(async (url) => {
      if (url === "/api/individuals") {
        return jsonResponse({ individual: { id: "ind-new" } })
      }
      return jsonResponse({})
    })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <AssignIndividualModal isOpen={true} onClose={onClose} onSuccess={onSuccess} photoId="photo-1" />
    )
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "+ Create New Individual" }))
    await user.type(screen.getByPlaceholderText("Enter name"), "Salamandra")
    await user.click(screen.getByRole("button", { name: "Create & Assign" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/individuals",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Salamandra" }) })
      )
    )
    expect(fetchWithCsrf).toHaveBeenCalledWith(
      "/api/individuals/ind-new/assign",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ photoId: "photo-1" }) })
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows a server error when creating the individual fails", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ error: "Name already exists" }, false))
    const user = userEvent.setup()

    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "+ Create New Individual" }))
    await user.type(screen.getByPlaceholderText("Enter name"), "Salamandra")
    await user.click(screen.getByRole("button", { name: "Create & Assign" }))

    expect(await screen.findByText("Name already exists")).toBeInTheDocument()
  })

  it("returns to the selection list when Back is clicked", async () => {
    const user = userEvent.setup()
    render(<AssignIndividualModal isOpen={true} onClose={vi.fn()} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "+ Create New Individual" }))
    await user.click(screen.getByRole("button", { name: "Back" }))

    expect(screen.getByText("Select existing individual:")).toBeInTheDocument()
  })

  it("calls onClose when Cancel is clicked without making a request", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<AssignIndividualModal isOpen={true} onClose={onClose} photoId="photo-1" />)
    await screen.findByText("Fido")

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })
})
