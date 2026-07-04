import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import BulkProcessSummary from "@/components/BulkProcessSummary"

describe("BulkProcessSummary Component", () => {
  it("shows the loading message while ids are loading", () => {
    render(<BulkProcessSummary isLoadingIds={true} loadError={null} photoCount={0} />)
    expect(screen.getByText("Chargement des photos...")).toBeInTheDocument()
  })

  it("shows the load error message when present", () => {
    render(
      <BulkProcessSummary isLoadingIds={false} loadError="Impossible de charger" photoCount={0} />
    )
    expect(screen.getByText("Impossible de charger")).toBeInTheDocument()
  })

  it("prioritizes the error message even while loading", () => {
    render(<BulkProcessSummary isLoadingIds={true} loadError="Erreur réseau" photoCount={0} />)
    expect(screen.getByText("Erreur réseau")).toBeInTheDocument()
    expect(screen.queryByText("Chargement des photos...")).not.toBeInTheDocument()
  })

  it("shows the singular photo count message", () => {
    render(<BulkProcessSummary isLoadingIds={false} loadError={null} photoCount={1} />)
    expect(screen.getByText("1 photo à retraiter")).toBeInTheDocument()
  })

  it("shows the plural photo count message", () => {
    render(<BulkProcessSummary isLoadingIds={false} loadError={null} photoCount={5} />)
    expect(screen.getByText("5 photos à retraiter")).toBeInTheDocument()
  })

  it("shows the informational message about replaced images", () => {
    render(<BulkProcessSummary isLoadingIds={false} loadError={null} photoCount={5} />)
    expect(screen.getByText("Les images existantes seront remplacées")).toBeInTheDocument()
  })
})
