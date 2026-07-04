import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ObservationCard from "@/components/individuals/ObservationCard"
import type { IndividualPhoto } from "@/types/individual"

function makePhoto(overrides: Partial<IndividualPhoto> = {}): IndividualPhoto {
  return {
    id: "photo-1",
    url: "https://example.com/photo.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    title: null,
    description: null,
    takenAt: null,
    latitude: null,
    longitude: null,
    cameraMake: null,
    cameraModel: null,
    aperture: null,
    shutterSpeed: null,
    iso: null,
    focalLength: null,
    ...overrides,
  }
}

describe("ObservationCard Component", () => {
  it("falls back to 'Observation' as the heading when there is no title or date", () => {
    render(<ObservationCard photo={makePhoto()} isLatest={false} onViewDetails={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Observation" })).toBeInTheDocument()
  })

  it("uses the photo title as the heading when present", () => {
    render(
      <ObservationCard
        photo={makePhoto({ title: "First sighting" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByRole("heading", { name: "First sighting" })).toBeInTheDocument()
  })

  it("uses the formatted date as heading when there is no title", () => {
    render(
      <ObservationCard
        photo={makePhoto({ takenAt: "2024-05-01T10:00:00.000Z" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByRole("heading", { name: "1 mai 2024" })).toBeInTheDocument()
  })

  it("shows the 'Plus récente' badge when isLatest is true", () => {
    render(<ObservationCard photo={makePhoto()} isLatest onViewDetails={vi.fn()} />)
    expect(screen.getByText("Plus récente")).toBeInTheDocument()
  })

  it("does not show the 'Plus récente' badge when isLatest is false", () => {
    render(<ObservationCard photo={makePhoto()} isLatest={false} onViewDetails={vi.fn()} />)
    expect(screen.queryByText("Plus récente")).not.toBeInTheDocument()
  })

  it("renders the date and time when takenAt is present", () => {
    render(
      <ObservationCard
        photo={makePhoto({ takenAt: "2024-05-01T10:30:00.000Z" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Heure")).toBeInTheDocument()
  })

  it("does not render date/time fields when takenAt is missing", () => {
    render(<ObservationCard photo={makePhoto()} isLatest={false} onViewDetails={vi.fn()} />)
    expect(screen.queryByText("Date")).not.toBeInTheDocument()
    expect(screen.queryByText("Heure")).not.toBeInTheDocument()
  })

  it("renders the position when latitude and longitude are present", () => {
    render(
      <ObservationCard
        photo={makePhoto({ latitude: 45.123456, longitude: 4.987654 })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Position")).toBeInTheDocument()
    expect(screen.getByText("45.1235, 4.9877")).toBeInTheDocument()
  })

  it("renders the camera make and model", () => {
    render(
      <ObservationCard
        photo={makePhoto({ cameraMake: "Nikon", cameraModel: "D850" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Appareil")).toBeInTheDocument()
    expect(screen.getByText("Nikon D850")).toBeInTheDocument()
  })

  it("renders camera setting chips via CameraSettingsChips", () => {
    render(
      <ObservationCard
        photo={makePhoto({ iso: 400, aperture: "f/4" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Réglages")).toBeInTheDocument()
    expect(screen.getByText("ISO 400")).toBeInTheDocument()
    expect(screen.getByText("f/4")).toBeInTheDocument()
  })

  it("renders the description when present", () => {
    render(
      <ObservationCard
        photo={makePhoto({ description: "Found near the pond" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByText("Found near the pond")).toBeInTheDocument()
  })

  it("does not render a description paragraph when missing", () => {
    render(<ObservationCard photo={makePhoto()} isLatest={false} onViewDetails={vi.fn()} />)
    expect(screen.queryByText("Found near the pond")).not.toBeInTheDocument()
  })

  it("calls onViewDetails when the details link is clicked", async () => {
    const onViewDetails = vi.fn()
    const user = userEvent.setup()
    render(<ObservationCard photo={makePhoto()} isLatest={false} onViewDetails={onViewDetails} />)
    await user.click(screen.getByText("Voir les détails →"))
    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })

  it("uses croppedUrl for the image when present, falling back to url", () => {
    render(
      <ObservationCard
        photo={makePhoto({ croppedUrl: "https://example.com/crop.jpg", title: "Crop test" })}
        isLatest={false}
        onViewDetails={vi.fn()}
      />
    )
    expect(screen.getByAltText("Crop test")).toBeInTheDocument()
  })
})
