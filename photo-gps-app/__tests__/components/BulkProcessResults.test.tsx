import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import BulkProcessResults from "@/components/BulkProcessResults"
import { PhotoProcessResult } from "@/types/photo"

function makeResult(overrides: Partial<PhotoProcessResult>): PhotoProcessResult {
  return {
    photoId: "photo-1",
    success: true,
    salamanderDetected: false,
    hasCropped: false,
    hasSegmented: false,
    hasEmbedding: false,
    ...overrides,
  }
}

describe("BulkProcessResults Component", () => {
  it("computes and displays the aggregate counts", () => {
    const results: PhotoProcessResult[] = [
      makeResult({
        photoId: "1",
        salamanderDetected: true,
        hasCropped: true,
        hasSegmented: true,
        hasEmbedding: true,
      }),
      makeResult({ photoId: "2", salamanderDetected: true, hasCropped: true }),
      makeResult({ photoId: "3" }),
    ]
    render(<BulkProcessResults results={results} />)

    expect(screen.getByText("Salamandres detectees").previousSibling).toHaveTextContent("2")
    expect(screen.getByText("Images recadrees").previousSibling).toHaveTextContent("2")
    expect(screen.getByText("Images segmentees").previousSibling).toHaveTextContent("1")
    expect(screen.getByText("Vecteurs generes").previousSibling).toHaveTextContent("1")
  })

  it("does not render an error section when there are no failures", () => {
    const results: PhotoProcessResult[] = [makeResult({ photoId: "1" })]
    render(<BulkProcessResults results={results} />)
    expect(screen.queryByText(/erreur/)).not.toBeInTheDocument()
  })

  it("renders a singular error message for one failure", () => {
    const results: PhotoProcessResult[] = [
      makeResult({ photoId: "1", success: false, error: "Timeout" }),
    ]
    render(<BulkProcessResults results={results} />)
    expect(screen.getByText("1 erreur")).toBeInTheDocument()
    expect(screen.getByText("- Timeout")).toBeInTheDocument()
  })

  it("renders a plural error message and default text for missing error messages", () => {
    const results: PhotoProcessResult[] = [
      makeResult({ photoId: "1", success: false, error: undefined }),
      makeResult({ photoId: "2", success: false, error: "Bad crop" }),
    ]
    render(<BulkProcessResults results={results} />)
    expect(screen.getByText("2 erreurs")).toBeInTheDocument()
    expect(screen.getByText("- Erreur inconnue")).toBeInTheDocument()
    expect(screen.getByText("- Bad crop")).toBeInTheDocument()
  })

  it("caps the visible failure list and shows a remainder count", () => {
    const results: PhotoProcessResult[] = Array.from({ length: 5 }, (_, i) =>
      makeResult({ photoId: `${i}`, success: false, error: `Error ${i}` })
    )
    render(<BulkProcessResults results={results} />)

    expect(screen.getByText("5 erreurs")).toBeInTheDocument()
    expect(screen.getByText("- Error 0")).toBeInTheDocument()
    expect(screen.getByText("- Error 1")).toBeInTheDocument()
    expect(screen.getByText("- Error 2")).toBeInTheDocument()
    expect(screen.queryByText("- Error 3")).not.toBeInTheDocument()
    expect(screen.getByText("... et 2 autres")).toBeInTheDocument()
  })
})
