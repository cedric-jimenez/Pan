import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import IndividualList from "@/components/IndividualList"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"
import { IndividualWithCount } from "@/types/individual"

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

const mockedFetchWithCsrf = vi.mocked(fetchWithCsrf)

function makeIndividual(overrides: Partial<IndividualWithCount> = {}): IndividualWithCount {
  return {
    id: "ind-1",
    name: "Spotty",
    userId: "user-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    photoCount: 3,
    coverUrl: null,
    lastObservedAt: null,
    ...overrides,
  }
}

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>
  fetchMock.mockResolvedValueOnce({
    ok,
    json: async () => body,
  } as Response)
}

describe("IndividualList Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
    mockedFetchWithCsrf.mockReset()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    vi.spyOn(window, "alert").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("shows a loading state and then the empty state", async () => {
    mockFetchOnce({ individuals: [] })
    render(<IndividualList />)

    expect(screen.getByText("Chargement des individus…")).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByText("Aucun individu pour le moment. Créez votre premier individu pour commencer.")
      ).toBeInTheDocument()
    })
  })

  it("shows an error message when the fetch fails", async () => {
    mockFetchOnce({ error: "boom" }, false)
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("Échec du chargement des individus")).toBeInTheDocument()
    })
  })

  it("renders the fetched individuals", async () => {
    mockFetchOnce({
      individuals: [makeIndividual({ id: "1", name: "Spotty", photoCount: 3 })],
    })
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    expect(screen.getByText("3 photos")).toBeInTheDocument()
  })

  it("uses the singular photo count label", async () => {
    mockFetchOnce({
      individuals: [makeIndividual({ id: "1", name: "Solo", photoCount: 1 })],
    })
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("1 photo")).toBeInTheDocument()
    })
  })

  it("does not render the create button when onCreateIndividual is not provided", async () => {
    mockFetchOnce({ individuals: [] })
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.queryByText("Chargement des individus…")).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Créer un individu")).not.toBeInTheDocument()
  })

  it("calls onCreateIndividual when the create button is clicked", async () => {
    mockFetchOnce({ individuals: [] })
    const user = userEvent.setup()
    const onCreateIndividual = vi.fn()
    render(<IndividualList onCreateIndividual={onCreateIndividual} />)

    await waitFor(() => {
      expect(screen.getByText("Créer un individu")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Créer un individu"))
    expect(onCreateIndividual).toHaveBeenCalledTimes(1)
  })

  it("calls onSelectIndividual when a card is clicked", async () => {
    const individual = makeIndividual({ id: "1", name: "Spotty" })
    mockFetchOnce({ individuals: [individual] })
    const user = userEvent.setup()
    const onSelectIndividual = vi.fn()
    render(<IndividualList onSelectIndividual={onSelectIndividual} />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Spotty"))
    expect(onSelectIndividual).toHaveBeenCalledWith(individual)
  })

  it("calls onEditIndividual without triggering onSelectIndividual", async () => {
    const individual = makeIndividual({ id: "1", name: "Spotty" })
    mockFetchOnce({ individuals: [individual] })
    const user = userEvent.setup()
    const onSelectIndividual = vi.fn()
    const onEditIndividual = vi.fn()
    render(<IndividualList onSelectIndividual={onSelectIndividual} onEditIndividual={onEditIndividual} />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: "Modifier" }))
    expect(onEditIndividual).toHaveBeenCalledWith(individual)
    expect(onSelectIndividual).not.toHaveBeenCalled()
  })

  it("deletes an individual after confirming", async () => {
    const individual = makeIndividual({ id: "1", name: "Spotty" })
    mockFetchOnce({ individuals: [individual] })
    mockedFetchWithCsrf.mockResolvedValueOnce({ ok: true } as Response)
    const user = userEvent.setup()
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: "Supprimer" }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockedFetchWithCsrf).toHaveBeenCalledWith("/api/individuals/1", { method: "DELETE" })
    })
    await waitFor(() => {
      expect(screen.queryByText("Spotty")).not.toBeInTheDocument()
    })
  })

  it("does not delete when the confirmation is cancelled", async () => {
    const individual = makeIndividual({ id: "1", name: "Spotty" })
    mockFetchOnce({ individuals: [individual] })
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: "Supprimer" }))

    expect(mockedFetchWithCsrf).not.toHaveBeenCalled()
    expect(screen.getByText("Spotty")).toBeInTheDocument()
  })

  it("alerts when the delete request fails", async () => {
    const individual = makeIndividual({ id: "1", name: "Spotty" })
    mockFetchOnce({ individuals: [individual] })
    mockedFetchWithCsrf.mockResolvedValueOnce({ ok: false } as Response)
    const user = userEvent.setup()
    render(<IndividualList />)

    await waitFor(() => {
      expect(screen.getByText("Spotty")).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: "Supprimer" }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Échec de la suppression de l'individu")
    })
  })

  it("refetches when the search input changes, after the debounce delay", async () => {
    vi.useFakeTimers()
    mockFetchOnce({ individuals: [] })
    render(<IndividualList />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledTimes(1)

    mockFetchOnce({ individuals: [] })
    fireEvent.change(screen.getByPlaceholderText("Rechercher un individu…"), {
      target: { value: "Spot" },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith("/api/individuals?search=Spot")
  })

  it("refetches when refreshTrigger increases", async () => {
    mockFetchOnce({ individuals: [] })
    const { rerender } = render(<IndividualList refreshTrigger={0} />)
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    mockFetchOnce({ individuals: [] })
    rerender(<IndividualList refreshTrigger={1} />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
