import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MapOverlayControls from "@/components/map/MapOverlayControls"

function baseProps() {
  return {
    search: "",
    onSearchChange: vi.fn(),
    collapsed: false,
    onToggleCollapsed: vi.fn(),
    layersOpen: false,
    onToggleLayersOpen: vi.fn(),
    basemap: "street" as const,
    onBasemapChange: vi.fn(),
    onLocate: vi.fn(),
  }
}

describe("MapOverlayControls Component", () => {
  it("renders the search input with its placeholder", () => {
    render(<MapOverlayControls {...baseProps()} />)
    expect(screen.getByPlaceholderText("Rechercher une espèce…")).toBeInTheDocument()
  })

  it("calls onSearchChange when the search input changes", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapOverlayControls {...props} />)
    await user.type(screen.getByPlaceholderText("Rechercher une espèce…"), "s")
    expect(props.onSearchChange).toHaveBeenCalled()
  })

  it("labels the collapse toggle for hiding the panel when expanded", () => {
    render(<MapOverlayControls {...baseProps()} collapsed={false} />)
    expect(screen.getByLabelText("Masquer le panneau")).toBeInTheDocument()
  })

  it("labels the collapse toggle for showing the panel when collapsed", () => {
    render(<MapOverlayControls {...baseProps()} collapsed />)
    expect(screen.getByLabelText("Afficher le panneau")).toBeInTheDocument()
  })

  it("calls onToggleCollapsed when the collapse button is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapOverlayControls {...props} />)
    await user.click(screen.getByLabelText("Masquer le panneau"))
    expect(props.onToggleCollapsed).toHaveBeenCalledTimes(1)
  })

  it("does not show the basemap list when layersOpen is false", () => {
    render(<MapOverlayControls {...baseProps()} layersOpen={false} />)
    expect(screen.queryByText("Rue")).not.toBeInTheDocument()
  })

  it("shows the basemap list when layersOpen is true", () => {
    render(<MapOverlayControls {...baseProps()} layersOpen />)
    expect(screen.getByText("Rue")).toBeInTheDocument()
    expect(screen.getByText("Satellite")).toBeInTheDocument()
    expect(screen.getByText("Heatmap")).toBeInTheDocument()
  })

  it("calls onBasemapChange when a basemap option is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapOverlayControls {...props} layersOpen />)
    await user.click(screen.getByText("Satellite"))
    expect(props.onBasemapChange).toHaveBeenCalledWith("satellite")
  })

  it("calls onToggleLayersOpen when the layers button is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapOverlayControls {...props} />)
    await user.click(screen.getByLabelText("Fonds de carte"))
    expect(props.onToggleLayersOpen).toHaveBeenCalledTimes(1)
  })

  it("calls onLocate when the locate button is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapOverlayControls {...props} />)
    await user.click(screen.getByLabelText("Me localiser"))
    expect(props.onLocate).toHaveBeenCalledTimes(1)
  })
})
