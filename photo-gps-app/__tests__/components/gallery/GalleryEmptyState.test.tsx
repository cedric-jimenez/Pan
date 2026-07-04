import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import GalleryEmptyState from "@/components/gallery/GalleryEmptyState"

describe("GalleryEmptyState Component", () => {
  it("renders the generic empty state when there is no search query", () => {
    render(<GalleryEmptyState searchQuery="" onClearSearch={vi.fn()} />)
    expect(screen.getByText("No photos yet")).toBeInTheDocument()
    expect(screen.getByText("Upload your first photo to get started")).toBeInTheDocument()
    expect(screen.queryByText("Effacer la recherche")).not.toBeInTheDocument()
  })

  it("renders the generic empty state when the search query is only whitespace", () => {
    render(<GalleryEmptyState searchQuery="   " onClearSearch={vi.fn()} />)
    expect(screen.getByText("No photos yet")).toBeInTheDocument()
  })

  it("renders the no-results state when a search query is present", () => {
    render(<GalleryEmptyState searchQuery="salamander" onClearSearch={vi.fn()} />)
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument()
    expect(screen.getByText('Aucune photo ne correspond à "salamander"')).toBeInTheDocument()
  })

  it("calls onClearSearch when the clear button is clicked", async () => {
    const user = userEvent.setup()
    const onClearSearch = vi.fn()
    render(<GalleryEmptyState searchQuery="salamander" onClearSearch={onClearSearch} />)

    await user.click(screen.getByText("Effacer la recherche"))
    expect(onClearSearch).toHaveBeenCalledTimes(1)
  })
})
