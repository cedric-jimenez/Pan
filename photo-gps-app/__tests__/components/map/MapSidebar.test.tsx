import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MapSidebar from "@/components/map/MapSidebar"
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
    takenAt: new Date("2024-01-01T00:00:00.000Z"),
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    title: "Sample",
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

function baseProps() {
  return {
    datePreset: "all" as const,
    onDatePresetChange: vi.fn(),
    customStart: "",
    onCustomStartChange: vi.fn(),
    customEnd: "",
    onCustomEndChange: vi.fn(),
    featured: null,
    onShowDetails: vi.fn(),
    nearby: [] as Photo[],
    coords: null,
    onSelectNearby: vi.fn(),
    exportDisabled: false,
    onExport: vi.fn(),
  }
}

describe("MapSidebar Component", () => {
  it("renders the exploration heading", () => {
    render(<MapSidebar {...baseProps()} />)
    expect(screen.getByRole("heading", { name: "Exploration" })).toBeInTheDocument()
  })

  it("renders the date range filter", () => {
    render(<MapSidebar {...baseProps()} />)
    expect(screen.getByText("Date d'observation")).toBeInTheDocument()
  })

  it("renders the empty featured card message when there is no featured photo", () => {
    render(<MapSidebar {...baseProps()} />)
    expect(screen.getByText("Aucune observation.")).toBeInTheDocument()
  })

  it("renders the featured photo when present", () => {
    render(<MapSidebar {...baseProps()} featured={makePhoto({ title: "Featured" })} />)
    expect(screen.getByRole("heading", { name: "Featured" })).toBeInTheDocument()
  })

  it("does not render the nearby list when there are no nearby photos", () => {
    render(<MapSidebar {...baseProps()} />)
    expect(screen.queryByText("Observations à proximité")).not.toBeInTheDocument()
  })

  it("renders the nearby list when there are nearby photos", () => {
    render(<MapSidebar {...baseProps()} nearby={[makePhoto({ title: "Nearby One" })]} />)
    expect(screen.getByText("Observations à proximité")).toBeInTheDocument()
    expect(screen.getByText("Nearby One")).toBeInTheDocument()
  })

  it("calls onExport when the export button is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<MapSidebar {...props} />)
    await user.click(screen.getByText("Exporter les données locales"))
    expect(props.onExport).toHaveBeenCalledTimes(1)
  })

  it("disables the export button when exportDisabled is true", () => {
    render(<MapSidebar {...baseProps()} exportDisabled />)
    expect(screen.getByText("Exporter les données locales").closest("button")).toBeDisabled()
  })
})
