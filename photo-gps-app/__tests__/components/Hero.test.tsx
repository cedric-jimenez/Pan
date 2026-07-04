import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Hero from "@/components/Hero"

describe("Hero Component", () => {
  it("renders the heading", () => {
    render(<Hero />)
    expect(
      screen.getByRole("heading", { name: "Protégez la faune, une observation à la fois." })
    ).toBeInTheDocument()
  })

  it("renders the description text", () => {
    render(<Hero />)
    expect(screen.getByText(/Rejoignez la communauté SalamanTrack/)).toBeInTheDocument()
  })

  it("renders the primary CTA link pointing to the gallery upload section", () => {
    render(<Hero />)
    const cta = screen.getByText("Commencer l'identification")
    expect(cta.closest("a")).toHaveAttribute("href", "/gallery#upload")
  })

  it("renders the secondary link pointing to the learn-more anchor", () => {
    render(<Hero />)
    const link = screen.getByText("En savoir plus")
    expect(link.closest("a")).toHaveAttribute("href", "#en-savoir-plus")
  })

  it("renders the hero image with descriptive alt text", () => {
    render(<Hero />)
    expect(
      screen.getByAltText("Salamandre tachetée (Salamandra salamandra) sur de la mousse")
    ).toBeInTheDocument()
  })
})
