import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ShootingGuide from "@/components/identification/ShootingGuide"

describe("ShootingGuide Component", () => {
  it("renders the guide heading", () => {
    render(<ShootingGuide />)
    expect(screen.getByText("Guide de prise de vue")).toBeInTheDocument()
  })

  it("renders each tip title and description", () => {
    render(<ShootingGuide />)
    expect(screen.getByText("Vue de dessus")).toBeInTheDocument()
    expect(
      screen.getByText("Photographiez l'animal bien à plat, de manière perpendiculaire au dos.")
    ).toBeInTheDocument()
    expect(screen.getByText("Lumière diffuse")).toBeInTheDocument()
    expect(screen.getByText("Mise au point")).toBeInTheDocument()
  })

  it("renders an image for each tip with the tip title as alt text", () => {
    render(<ShootingGuide />)
    expect(screen.getByAltText("Vue de dessus")).toBeInTheDocument()
    expect(screen.getByAltText("Lumière diffuse")).toBeInTheDocument()
    expect(screen.getByAltText("Mise au point")).toBeInTheDocument()
  })

  it("renders the animal welfare reminder callout", () => {
    render(<ShootingGuide />)
    expect(
      screen.getByText(
        /Ne manipulez jamais l'animal sans gants et veillez à son bien-être immédiat./
      )
    ).toBeInTheDocument()
  })
})
