import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ConfirmIndividualModal from "@/components/identification/ConfirmIndividualModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

function jsonResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

describe("ConfirmIndividualModal", () => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { name: "Lila" }))
    )
  })

  it("renders nothing when closed", () => {
    render(
      <ConfirmIndividualModal
        isOpen={false}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[]}
        onSuccess={onSuccess}
      />
    )
    expect(screen.queryByText("Associer à un individu")).not.toBeInTheDocument()
  })

  it("shows create mode and fetches a suggested name when there are no existing individuals", async () => {
    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1", "p2"]}
        existingIndividuals={[]}
        onSuccess={onSuccess}
      />
    )

    expect(screen.getByText("Associer à un individu")).toBeInTheDocument()
    expect(screen.getByText("2 photos seront rattachées au même individu.")).toBeInTheDocument()

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/individuals/suggest-name"))
    expect(await screen.findByDisplayValue("Lila")).toBeInTheDocument()
  })

  it("shows reuse mode with the existing individual's name", () => {
    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[{ id: "ind-1", name: "Hugo" }]}
        onSuccess={onSuccess}
      />
    )

    const name = screen.getByText("Hugo", { selector: "span" })
    expect(name).toBeInTheDocument()
    expect(name.parentElement?.textContent).toBe("Ces photos seront rattachées à l'individu Hugo.")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows conflict mode with a picker when multiple individuals are linked", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, { individual: { name: "Milo" }, assignedCount: 3 })
    )

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1", "p2", "p3"]}
        existingIndividuals={[
          { id: "ind-1", name: "Hugo" },
          { id: "ind-2", name: "Milo" },
        ]}
        onSuccess={onSuccess}
      />
    )

    expect(screen.getByText("Hugo")).toBeInTheDocument()
    expect(screen.getByText("Milo")).toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: /Milo/ }))
    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/identification/confirm",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ photoIds: ["p1", "p2", "p3"], individualId: "ind-2" }),
        })
      )
    )
    expect(onSuccess).toHaveBeenCalledWith({ individualName: "Milo", assignedCount: 3 })
  })

  it("submits a new individual name in create mode and reports success", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, { individual: { name: "Nina" }, assignedCount: 1 })
    )

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[]}
        onSuccess={onSuccess}
      />
    )

    await screen.findByDisplayValue("Lila")
    const input = screen.getByPlaceholderText("Nom")
    await user.clear(input)
    await user.type(input, "Nina")

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/identification/confirm",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ photoIds: ["p1"], newName: "Nina" }),
        })
      )
    )
    expect(onSuccess).toHaveBeenCalledWith({ individualName: "Nina", assignedCount: 1 })
  })

  it("shows an error and does not submit when the name is empty in create mode", async () => {
    const user = userEvent.setup()

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[]}
        onSuccess={onSuccess}
      />
    )

    await screen.findByDisplayValue("Lila")
    const input = screen.getByPlaceholderText("Nom")
    await user.clear(input)

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    expect(await screen.findByText("Veuillez saisir un nom")).toBeInTheDocument()
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })

  it("submits the reuse individual id automatically", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(200, { individual: { name: "Hugo" }, assignedCount: 2 })
    )

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1", "p2"]}
        existingIndividuals={[{ id: "ind-1", name: "Hugo" }]}
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/identification/confirm",
        expect.objectContaining({
          body: JSON.stringify({ photoIds: ["p1", "p2"], individualId: "ind-1" }),
        })
      )
    )
    expect(onSuccess).toHaveBeenCalledWith({ individualName: "Hugo", assignedCount: 2 })
  })

  it("switches to conflict mode when the server detects a conflict on submit", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse(409, {
        conflict: true,
        individuals: [
          { id: "ind-1", name: "Hugo", photoCount: 3 },
          { id: "ind-2", name: "Milo", photoCount: 1 },
        ],
      })
    )

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1", "p2"]}
        existingIndividuals={[{ id: "ind-1", name: "Hugo" }]}
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    expect(
      await screen.findByText(
        "Les photos sélectionnées appartiennent à plusieurs individus. Choisissez celui auquel tout rattacher :"
      )
    ).toBeInTheDocument()
    expect(screen.getByText("(3 photos)")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("surfaces the server error message on failure", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse(500, { error: "Erreur serveur" }))

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[{ id: "ind-1", name: "Hugo" }]}
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("calls onClose when clicking cancel", async () => {
    const user = userEvent.setup()

    render(
      <ConfirmIndividualModal
        isOpen={true}
        onClose={onClose}
        photoIds={["p1"]}
        existingIndividuals={[{ id: "ind-1", name: "Hugo" }]}
        onSuccess={onSuccess}
      />
    )

    await user.click(screen.getByRole("button", { name: "Annuler" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
