import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import Footer from "@/components/Footer"

describe("Footer Component", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the brand name", () => {
    render(<Footer />)
    expect(screen.getByText("SalamanTrack")).toBeInTheDocument()
  })

  it("renders the tagline", () => {
    render(<Footer />)
    expect(
      screen.getByText("Ensemble, suivons et protégeons les joyaux cachés de nos forêts.")
    ).toBeInTheDocument()
  })

  it("renders the current year in the copyright notice", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-04T00:00:00Z"))

    render(<Footer />)
    expect(screen.getByText("© 2026 SalamanTrack. All rights reserved.")).toBeInTheDocument()
  })

  it("renders the link columns", () => {
    render(<Footer />)
    expect(screen.getByText("Plateforme")).toBeInTheDocument()
    expect(screen.getByText("Légal")).toBeInTheDocument()
    expect(screen.getByText("About Us")).toBeInTheDocument()
    expect(screen.getByText("Research Partners")).toBeInTheDocument()
    expect(screen.getByText("Data Privacy")).toBeInTheDocument()
    expect(screen.getByText("Contact")).toBeInTheDocument()
  })

  it("renders links as anchor elements", () => {
    render(<Footer />)
    expect(screen.getByText("About Us").closest("a")).toHaveAttribute("href", "#")
  })
})
