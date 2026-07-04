import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import GalleryControls from "@/components/gallery/GalleryControls"

const baseProps = {
  total: 10,
  searchInput: "",
  onSearchInputChange: vi.fn(),
  sortBy: "date" as const,
  onSortByChange: vi.fn(),
  sortOrder: "desc" as const,
  onToggleSortOrder: vi.fn(),
  gridSize: "medium" as const,
  onGridSizeChange: vi.fn(),
}

describe("GalleryControls Component", () => {
  it("shows the pluralized total photo count", () => {
    render(<GalleryControls {...baseProps} total={10} />)
    expect(screen.getByText("10 photos")).toBeInTheDocument()
  })

  it("uses the singular photo label for a single photo", () => {
    render(<GalleryControls {...baseProps} total={1} />)
    expect(screen.getByText("1 photo")).toBeInTheDocument()
  })

  it("hides the count entirely when total is zero", () => {
    render(<GalleryControls {...baseProps} total={0} />)
    expect(screen.queryByText(/photo/)).not.toBeInTheDocument()
  })

  it("calls onSearchInputChange as the user types", () => {
    const onSearchInputChange = vi.fn()
    render(<GalleryControls {...baseProps} onSearchInputChange={onSearchInputChange} />)

    const input = screen.getByPlaceholderText("Rechercher...")
    fireEvent.change(input, { target: { value: "sala" } })
    expect(onSearchInputChange).toHaveBeenCalledWith("sala")
  })

  it("does not show the clear button when the search is empty", () => {
    render(<GalleryControls {...baseProps} searchInput="" />)
    expect(screen.queryByTitle("Effacer la recherche")).not.toBeInTheDocument()
  })

  it("shows the clear button when there is search text and clears it on click", async () => {
    const user = userEvent.setup()
    const onSearchInputChange = vi.fn()
    render(
      <GalleryControls {...baseProps} searchInput="sala" onSearchInputChange={onSearchInputChange} />
    )

    const clearButton = screen.getByTitle("Effacer la recherche")
    await user.click(clearButton)
    expect(onSearchInputChange).toHaveBeenCalledWith("")
  })

  it("calls onSortByChange when a different sort option is selected", async () => {
    const user = userEvent.setup()
    const onSortByChange = vi.fn()
    render(<GalleryControls {...baseProps} onSortByChange={onSortByChange} />)

    await user.selectOptions(screen.getByDisplayValue("Date"), "title")
    expect(onSortByChange).toHaveBeenCalledWith("title")
  })

  it("calls onToggleSortOrder when the order button is clicked", async () => {
    const user = userEvent.setup()
    const onToggleSortOrder = vi.fn()
    render(<GalleryControls {...baseProps} onToggleSortOrder={onToggleSortOrder} />)

    await user.click(screen.getByTitle("Décroissant"))
    expect(onToggleSortOrder).toHaveBeenCalledTimes(1)
  })

  it("shows the ascending title when sortOrder is asc", () => {
    render(<GalleryControls {...baseProps} sortOrder="asc" />)
    expect(screen.getByTitle("Croissant")).toBeInTheDocument()
  })

  it("calls onGridSizeChange with the clicked size", async () => {
    const user = userEvent.setup()
    const onGridSizeChange = vi.fn()
    render(<GalleryControls {...baseProps} onGridSizeChange={onGridSizeChange} />)

    await user.click(screen.getByTitle("Petites vignettes"))
    expect(onGridSizeChange).toHaveBeenCalledWith("small")

    await user.click(screen.getByTitle("Grandes vignettes"))
    expect(onGridSizeChange).toHaveBeenCalledWith("large")
  })

  it("highlights the active grid size button", () => {
    render(<GalleryControls {...baseProps} gridSize="large" />)
    expect(screen.getByTitle("Grandes vignettes")).toHaveClass("bg-background")
    expect(screen.getByTitle("Petites vignettes")).not.toHaveClass("bg-background")
  })
})
