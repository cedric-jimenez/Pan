import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import IndividualModal from "@/components/IndividualModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { Individual } from "@/types/individual"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

const individual: Individual = {
  id: "ind-1",
  name: "Salamandra",
  userId: "user-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
}

describe("IndividualModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when isOpen is false", () => {
    render(<IndividualModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the create form when open without an individual", () => {
    render(<IndividualModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Create Individual")).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
  })

  it("renders the edit form pre-filled with the individual's name", () => {
    render(<IndividualModal isOpen={true} onClose={vi.fn()} individual={individual} />)
    expect(screen.getByText("Edit Individual")).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toHaveValue("Salamandra")
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument()
  })

  it("submits a POST request to create a new individual", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ individual: { id: "new-1" } }))
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<IndividualModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText("Name"), "Bob")
    await user.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/individuals",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Bob" }),
        })
      )
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("submits a PATCH request to update an existing individual", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ individual }))
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(
      <IndividualModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} individual={individual} />
    )
    await user.clear(screen.getByLabelText("Name"))
    await user.type(screen.getByLabelText("Name"), "New Name")
    await user.click(screen.getByRole("button", { name: "Update" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/individuals/ind-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "New Name" }),
        })
      )
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it("shows a server error message and does not call onSuccess or onClose", async () => {
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ error: "Name already taken" }, false))
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<IndividualModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText("Name"), "Bob")
    await user.click(screen.getByRole("button", { name: "Create" }))

    expect(await screen.findByText("Name already taken")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("disables the form and shows a loading state while the request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetchWithCsrf).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    const user = userEvent.setup()

    render(<IndividualModal isOpen={true} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText("Name"), "Bob")
    await user.click(screen.getByRole("button", { name: "Create" }))

    expect(await screen.findByText("Loading...")).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()

    resolveFetch(jsonResponse({ individual: { id: "new-1" } }))
    await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument())
  })

  it("calls onClose when Cancel is clicked without making a request", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<IndividualModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })
})
