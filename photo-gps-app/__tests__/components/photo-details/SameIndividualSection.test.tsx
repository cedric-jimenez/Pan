import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import SameIndividualSection from "@/components/photo-details/SameIndividualSection"
import { SimilarPhoto } from "@/types/photo"

function makeSimilar(overrides: Partial<SimilarPhoto> = {}): SimilarPhoto {
  return {
    id: "similar-1",
    filename: "similar.jpg",
    url: "https://example.com/similar.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    title: null,
    description: null,
    takenAt: null,
    latitude: null,
    longitude: null,
    distance: 0.1,
    similarityScore: 0.9,
    ...overrides,
  }
}

describe("SameIndividualSection Component", () => {
  it("shows a loading message while loading", () => {
    render(<SameIndividualSection photos={[]} isLoading />)
    expect(screen.getByText("Même individu")).toBeInTheDocument()
    expect(screen.getByText("Chargement...")).toBeInTheDocument()
  })

  it("shows an empty state when there are no matching photos", () => {
    render(<SameIndividualSection photos={[]} isLoading={false} />)
    expect(screen.getByText("Même individu")).toBeInTheDocument()
    expect(
      screen.getByText("Aucune autre photo du même individu trouvée.")
    ).toBeInTheDocument()
  })

  it("shows the count of matching photos in the heading", () => {
    render(
      <SameIndividualSection
        photos={[makeSimilar({ id: "a" }), makeSimilar({ id: "b" })]}
        isLoading={false}
      />
    )
    expect(screen.getByText("Même individu (2)")).toBeInTheDocument()
  })

  it("prefers segmentedUrl, then croppedUrl, then url for the image src", () => {
    render(
      <SameIndividualSection
        photos={[
          makeSimilar({
            id: "a",
            url: "https://example.com/full.jpg",
            croppedUrl: "https://example.com/crop.jpg",
            segmentedUrl: "https://example.com/seg.jpg",
            filename: "a.jpg",
          }),
        ]}
        isLoading={false}
      />
    )
    const img = screen.getByAltText("a.jpg") as HTMLImageElement
    expect(img.src).toContain(encodeURIComponent("https://example.com/seg.jpg"))
  })

  it("uses the title as alt text when present", () => {
    render(
      <SameIndividualSection
        photos={[makeSimilar({ title: "Nice shot", filename: "a.jpg" })]}
        isLoading={false}
      />
    )
    expect(screen.getByAltText("Nice shot")).toBeInTheDocument()
  })

  it("renders the confidence badge when confidence is a known value", () => {
    render(
      <SameIndividualSection photos={[makeSimilar({ confidence: "high" })]} isLoading={false} />
    )
    expect(screen.getByText("HIGH")).toBeInTheDocument()
  })

  it("does not render the confidence badge when confidence is unknown", () => {
    render(
      <SameIndividualSection
        photos={[makeSimilar({ confidence: "unknown" })]}
        isLoading={false}
      />
    )
    expect(screen.queryByText("UNKNOWN")).not.toBeInTheDocument()
  })

  it("shows the formatted date when takenAt is present", () => {
    render(
      <SameIndividualSection
        photos={[makeSimilar({ takenAt: new Date("2024-05-01T00:00:00.000Z") })]}
        isLoading={false}
      />
    )
    expect(screen.getByText("1 mai 2024")).toBeInTheDocument()
  })

  it("shows a fallback label when takenAt is missing", () => {
    render(<SameIndividualSection photos={[makeSimilar({ takenAt: null })]} isLoading={false} />)
    expect(screen.getByText("Date inconnue")).toBeInTheDocument()
  })
})
