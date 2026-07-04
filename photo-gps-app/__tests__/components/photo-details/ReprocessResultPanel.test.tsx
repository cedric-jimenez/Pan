import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ReprocessResultPanel from "@/components/photo-details/ReprocessResultPanel"
import { PhotoProcessResult } from "@/types/photo"

describe("ReprocessResultPanel Component", () => {
  it("renders the error message when the result was not successful", () => {
    const result: PhotoProcessResult = {
      photoId: "1",
      success: false,
      error: "Timeout while calling Railway",
    }
    render(<ReprocessResultPanel result={result} />)
    expect(screen.getByText("Erreur : Timeout while calling Railway")).toBeInTheDocument()
  })

  it("renders the success heading and all check items when successful", () => {
    const result: PhotoProcessResult = {
      photoId: "1",
      success: true,
      salamanderDetected: true,
      hasCropped: true,
      hasSegmented: true,
      hasEmbedding: true,
    }
    render(<ReprocessResultPanel result={result} />)
    expect(screen.getByText("Retraitement terminé")).toBeInTheDocument()
    expect(screen.getByText("Salamandre détectée")).toBeInTheDocument()
    expect(screen.getByText("Image recadrée")).toBeInTheDocument()
    expect(screen.getByText("Image segmentée")).toBeInTheDocument()
    expect(screen.getByText("Vecteur généré")).toBeInTheDocument()
  })

  it("shows check marks for true flags and cross marks for false/undefined flags", () => {
    const result: PhotoProcessResult = {
      photoId: "1",
      success: true,
      salamanderDetected: true,
      hasCropped: false,
      hasSegmented: undefined,
      hasEmbedding: false,
    }
    render(<ReprocessResultPanel result={result} />)
    const checkMarks = screen.getAllByText("✓")
    const crossMarks = screen.getAllByText("✗")
    expect(checkMarks).toHaveLength(1)
    expect(crossMarks).toHaveLength(3)
  })
})
