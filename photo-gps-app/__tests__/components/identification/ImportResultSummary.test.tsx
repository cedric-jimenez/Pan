import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ImportResultSummary from "@/components/identification/ImportResultSummary"
import type { BulkImportResult } from "@/components/identification/BulkImportDropzone"
import { Photo } from "@/types/photo"

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-1",
    userId: "user-1",
    individualId: null,
    filename: "photo.jpg",
    originalName: "photo.jpg",
    fileSize: 1000,
    croppedFileSize: null,
    segmentedFileSize: null,
    mimeType: "image/jpeg",
    url: "https://example.com/photo.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    latitude: null,
    longitude: null,
    takenAt: null,
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    title: null,
    description: null,
    isCropped: false,
    cropConfidence: null,
    salamanderDetected: false,
    individual: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeResult(overrides: Partial<BulkImportResult> = {}): BulkImportResult {
  return {
    detected: [],
    noDetection: [],
    errors: [],
    ...overrides,
  }
}

describe("ImportResultSummary Component", () => {
  it("shows a singular detected count", () => {
    render(
      <ImportResultSummary
        result={makeResult({ detected: [makePhoto()] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("✓ 1 détectée")).toBeInTheDocument()
  })

  it("shows a plural detected count", () => {
    render(
      <ImportResultSummary
        result={makeResult({ detected: [makePhoto({ id: "a" }), makePhoto({ id: "b" })] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("✓ 2 détectées")).toBeInTheDocument()
  })

  it("does not show the no-detection or errors tallies when empty", () => {
    render(<ImportResultSummary result={makeResult()} attachedCount={0} onReset={vi.fn()} />)
    expect(screen.queryByText(/sans salamandre/)).not.toBeInTheDocument()
    expect(screen.queryByText(/en échec/)).not.toBeInTheDocument()
  })

  it("shows the no-detection tally when present", () => {
    render(
      <ImportResultSummary
        result={makeResult({ noDetection: ["a.jpg", "b.jpg"] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("⚠ 2 sans salamandre")).toBeInTheDocument()
  })

  it("shows the errors tally when present", () => {
    render(
      <ImportResultSummary
        result={makeResult({ errors: [{ filename: "bad.jpg", message: "too large" }] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("✗ 1 en échec")).toBeInTheDocument()
  })

  it("does not show the attached banner when attachedCount is zero", () => {
    render(<ImportResultSummary result={makeResult()} attachedCount={0} onReset={vi.fn()} />)
    expect(screen.queryByText(/rattachée/)).not.toBeInTheDocument()
  })

  it("shows the attached banner with singular wording and a catalog link", () => {
    render(<ImportResultSummary result={makeResult()} attachedCount={1} onReset={vi.fn()} />)
    expect(screen.getByText(/1 photo rattachée à un individu\./)).toBeInTheDocument()
    expect(screen.getByText("Voir le catalogue").closest("a")).toHaveAttribute(
      "href",
      "/individuals"
    )
  })

  it("shows the attached banner with plural wording for multiple photos", () => {
    render(<ImportResultSummary result={makeResult()} attachedCount={3} onReset={vi.fn()} />)
    expect(screen.getByText(/3 photos rattachées à un individu\./)).toBeInTheDocument()
  })

  it("shows the no-usable-photos message when detected is empty", () => {
    render(<ImportResultSummary result={makeResult()} attachedCount={0} onReset={vi.fn()} />)
    expect(
      screen.getByText("Aucune photo exploitable pour l'identification dans ce lot.")
    ).toBeInTheDocument()
  })

  it("does not show the no-usable-photos message when photos were detected", () => {
    render(
      <ImportResultSummary
        result={makeResult({ detected: [makePhoto()] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(
      screen.queryByText("Aucune photo exploitable pour l'identification dans ce lot.")
    ).not.toBeInTheDocument()
  })

  it("lists the no-detection filenames with singular wording", () => {
    render(
      <ImportResultSummary
        result={makeResult({ noDetection: ["only.jpg"] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(
      screen.getByText("Aucune salamandre détectée sur 1 photo")
    ).toBeInTheDocument()
    expect(screen.getByText(/only\.jpg — bien importée mais non comparable aux individus/)).toBeInTheDocument()
  })

  it("lists the no-detection filenames with plural wording", () => {
    render(
      <ImportResultSummary
        result={makeResult({ noDetection: ["one.jpg", "two.jpg"] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("Aucune salamandre détectée sur 2 photos")).toBeInTheDocument()
    expect(
      screen.getByText(/one\.jpg, two\.jpg — bien importées mais non comparables aux individus/)
    ).toBeInTheDocument()
  })

  it("lists errors with filename and message, singular wording", () => {
    render(
      <ImportResultSummary
        result={makeResult({ errors: [{ filename: "bad.jpg", message: "too large" }] })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("1 fichier non importé")).toBeInTheDocument()
    expect(screen.getByText("bad.jpg : too large")).toBeInTheDocument()
  })

  it("lists errors with plural wording for multiple failures", () => {
    render(
      <ImportResultSummary
        result={makeResult({
          errors: [
            { filename: "bad1.jpg", message: "too large" },
            { filename: "bad2.jpg", message: "duplicate" },
          ],
        })}
        attachedCount={0}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText("2 fichiers non importés")).toBeInTheDocument()
    expect(screen.getByText("bad1.jpg : too large")).toBeInTheDocument()
    expect(screen.getByText("bad2.jpg : duplicate")).toBeInTheDocument()
  })

  it("calls onReset when the reset button is clicked", async () => {
    const onReset = vi.fn()
    const user = userEvent.setup()
    render(<ImportResultSummary result={makeResult()} attachedCount={0} onReset={onReset} />)
    await user.click(screen.getByText("Importer d'autres photos"))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
