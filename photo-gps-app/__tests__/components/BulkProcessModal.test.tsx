import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BulkProcessModal from "@/components/BulkProcessModal"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

const testDate = new Date(2024, 2, 15)

describe("BulkProcessModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when isOpen is false", () => {
    global.fetch = vi.fn()
    render(
      <BulkProcessModal date={testDate} isOpen={false} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("loads the photo ids for the day and shows the count", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: ["p1", "p2", "p3"] }))
    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )

    expect(global.fetch).toHaveBeenCalledWith("/api/photos/ids-by-day?date=2024-03-15")
    expect(await screen.findByText("3 photos à retraiter")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retraiter" })).toBeEnabled()
  })

  it("shows a load error and disables processing when the id lookup fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Erreur serveur" }, false))
    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retraiter" })).toBeDisabled()
  })

  it("disables the process button while ids are still loading", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )

    expect(screen.getByRole("button", { name: "Retraiter" })).toBeDisabled()
    expect(screen.getByText("Chargement des photos...")).toBeInTheDocument()
  })

  it("processes all photo ids in a single batch and shows the results", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: ["p1", "p2", "p3"] }))
    vi.mocked(fetchWithCsrf).mockResolvedValue(
      jsonResponse({
        results: [
          {
            photoId: "p1",
            success: true,
            salamanderDetected: true,
            hasCropped: true,
            hasSegmented: true,
            hasEmbedding: true,
          },
          {
            photoId: "p2",
            success: true,
            salamanderDetected: true,
            hasCropped: true,
            hasSegmented: true,
            hasEmbedding: true,
          },
          { photoId: "p3", success: true, salamanderDetected: false },
        ],
      })
    )
    const user = userEvent.setup()

    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )
    await screen.findByText("3 photos à retraiter")

    await user.click(screen.getByRole("button", { name: "Retraiter" }))

    await waitFor(() =>
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        "/api/photos/bulk-process",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ photoIds: ["p1", "p2", "p3"] }),
        })
      )
    )
    expect(await screen.findByText("Terminé : 3 réussites, 0 échec")).toBeInTheDocument()
  })

  it("splits photo ids into batches of 5", async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `p${i + 1}`)
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: ids }))
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ results: [] }))
    const user = userEvent.setup()

    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )
    await screen.findByText("7 photos à retraiter")

    await user.click(screen.getByRole("button", { name: "Retraiter" }))

    await waitFor(() => expect(fetchWithCsrf).toHaveBeenCalledTimes(2))
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      1,
      "/api/photos/bulk-process",
      expect.objectContaining({ body: JSON.stringify({ photoIds: ids.slice(0, 5) }) })
    )
    expect(fetchWithCsrf).toHaveBeenNthCalledWith(
      2,
      "/api/photos/bulk-process",
      expect.objectContaining({ body: JSON.stringify({ photoIds: ids.slice(5) }) })
    )
  })

  it("records failures for a batch when the server returns an error", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: ["p1"] }))
    vi.mocked(fetchWithCsrf).mockResolvedValue(jsonResponse({ error: "Erreur inconnue" }, false))
    const user = userEvent.setup()

    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={vi.fn()} onProcessComplete={vi.fn()} />
    )
    await screen.findByText("1 photo à retraiter")

    await user.click(screen.getByRole("button", { name: "Retraiter" }))

    expect(await screen.findByText("Terminé : 0 réussite, 1 échec")).toBeInTheDocument()
    expect(screen.getByText("1 erreur")).toBeInTheDocument()
  })

  it(
    "calls onProcessComplete after processing finishes",
    async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: ["p1"] }))
      vi.mocked(fetchWithCsrf).mockResolvedValue(
        jsonResponse({ results: [{ photoId: "p1", success: true }] })
      )
      const onProcessComplete = vi.fn()
      const user = userEvent.setup()

      render(
        <BulkProcessModal
          date={testDate}
          isOpen={true}
          onClose={vi.fn()}
          onProcessComplete={onProcessComplete}
        />
      )
      await screen.findByText("1 photo à retraiter")

      await user.click(screen.getByRole("button", { name: "Retraiter" }))

      await waitFor(() => expect(onProcessComplete).toHaveBeenCalledTimes(1), { timeout: 3000 })
    },
    10000
  )

  it("calls onClose when Annuler is clicked while idle", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ photoIds: [] }))
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <BulkProcessModal date={testDate} isOpen={true} onClose={onClose} onProcessComplete={vi.fn()} />
    )
    await screen.findByText("0 photo à retraiter")

    await user.click(screen.getByRole("button", { name: "Annuler" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(fetchWithCsrf).not.toHaveBeenCalled()
  })
})
