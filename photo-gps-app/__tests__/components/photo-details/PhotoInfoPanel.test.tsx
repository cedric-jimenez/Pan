import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import PhotoInfoPanel from "@/components/photo-details/PhotoInfoPanel"
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

describe("PhotoInfoPanel Component", () => {
  it("renders the panel heading", () => {
    render(<PhotoInfoPanel photo={makePhoto()} />)
    expect(screen.getByText("Photo Information")).toBeInTheDocument()
  })

  it("does not render optional sections when data is missing", () => {
    render(<PhotoInfoPanel photo={makePhoto()} />)
    expect(screen.queryByText("Individual")).not.toBeInTheDocument()
    expect(screen.queryByText("Date Taken")).not.toBeInTheDocument()
    expect(screen.queryByText("Location")).not.toBeInTheDocument()
    expect(screen.queryByText("Camera")).not.toBeInTheDocument()
    expect(screen.queryByText("Camera Settings")).not.toBeInTheDocument()
  })

  it("renders the individual name when assigned", () => {
    render(
      <PhotoInfoPanel
        photo={makePhoto({ individual: { id: "ind-1", name: "Spotty" } })}
      />
    )
    expect(screen.getByText("Individual")).toBeInTheDocument()
    expect(screen.getByText("Spotty")).toBeInTheDocument()
  })

  it("renders the formatted date when takenAt is present", () => {
    render(<PhotoInfoPanel photo={makePhoto({ takenAt: "2024-03-15T10:30:00.000Z" })} />)
    expect(screen.getByText("Date Taken")).toBeInTheDocument()
  })

  it("renders the location with coordinates fixed to 6 decimals", () => {
    render(<PhotoInfoPanel photo={makePhoto({ latitude: 45.123456789, longitude: 4.987654321 })} />)
    expect(screen.getByText("Location")).toBeInTheDocument()
    expect(screen.getByText("45.123457, 4.987654")).toBeInTheDocument()
  })

  it("does not render location when only latitude is present", () => {
    render(<PhotoInfoPanel photo={makePhoto({ latitude: 45.1 })} />)
    expect(screen.queryByText("Location")).not.toBeInTheDocument()
  })

  it("renders the camera make and model joined together", () => {
    render(<PhotoInfoPanel photo={makePhoto({ cameraMake: "Canon", cameraModel: "EOS R5" })} />)
    expect(screen.getByText("Camera")).toBeInTheDocument()
    expect(screen.getByText("Canon EOS R5")).toBeInTheDocument()
  })

  it("renders the camera make only when the model is missing", () => {
    render(<PhotoInfoPanel photo={makePhoto({ cameraMake: "Canon" })} />)
    expect(screen.getByText("Canon")).toBeInTheDocument()
  })

  it("renders camera settings chips for the fields that are present", () => {
    render(
      <PhotoInfoPanel
        photo={makePhoto({ iso: 400, aperture: "f/2.8", shutterSpeed: "1/200", focalLength: "50mm" })}
      />
    )
    expect(screen.getByText("Camera Settings")).toBeInTheDocument()
    expect(screen.getByText("ISO 400")).toBeInTheDocument()
    expect(screen.getByText("f/2.8")).toBeInTheDocument()
    expect(screen.getByText("1/200")).toBeInTheDocument()
    expect(screen.getByText("50mm")).toBeInTheDocument()
  })

  it("renders only the present camera setting chips", () => {
    render(<PhotoInfoPanel photo={makePhoto({ iso: 200 })} />)
    expect(screen.getByText("Camera Settings")).toBeInTheDocument()
    expect(screen.getByText("ISO 200")).toBeInTheDocument()
  })
})
