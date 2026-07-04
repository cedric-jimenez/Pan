import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DaySection from "@/components/DaySection"
import { Photo } from "@/types/photo"

vi.mock("@/components/PhotoGrid", () => ({
  default: ({ photos }: { photos: Photo[] }) => (
    <div data-testid="photo-grid">{photos.length} photos rendered</div>
  ),
}))

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void

let observerInstances: { callback: ObserverCallback; observe: ReturnType<typeof vi.fn> }[] = []

class MockIntersectionObserver {
  callback: ObserverCallback
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(callback: ObserverCallback) {
    this.callback = callback
    observerInstances.push(this)
  }
}

function makeIntersect() {
  act(() => {
    observerInstances[observerInstances.length - 1].callback([{ isIntersecting: true }])
  })
}

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

const baseProps = {
  date: new Date("2024-03-15T00:00:00.000Z"),
  dateKey: "2024-03-15",
  count: 2,
  isCollapsed: false,
  gridSize: "medium" as const,
  photos: undefined,
  isLoading: false,
  openMobileMenu: null,
  onToggleCollapse: vi.fn(),
  onNeedLoad: vi.fn(),
  onPhotoClick: vi.fn(),
  onProcess: vi.fn(),
  onDownload: vi.fn(),
  onDelete: vi.fn(),
  onToggleMobileMenu: vi.fn(),
}

describe("DaySection Component", () => {
  beforeEach(() => {
    observerInstances = []
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
    vi.clearAllMocks()
  })

  it("renders the formatted date and pluralized photo count", () => {
    render(<DaySection {...baseProps} />)
    expect(screen.getByText(/vendredi 15 mars 2024/i)).toBeInTheDocument()
    expect(screen.getByText("2 photos")).toBeInTheDocument()
  })

  it("uses the singular photo count label", () => {
    render(<DaySection {...baseProps} count={1} />)
    expect(screen.getByText("1 photo")).toBeInTheDocument()
  })

  it("calls onToggleCollapse with the dateKey when the header is clicked", async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()
    render(<DaySection {...baseProps} onToggleCollapse={onToggleCollapse} />)

    await user.click(screen.getByText(/vendredi 15 mars 2024/i))
    expect(onToggleCollapse).toHaveBeenCalledWith("2024-03-15")
  })

  it("does not render photos when collapsed", () => {
    render(<DaySection {...baseProps} isCollapsed photos={[makePhoto()]} />)
    expect(screen.queryByTestId("photo-grid")).not.toBeInTheDocument()
  })

  it("shows a loading spinner when expanded but photos are not loaded yet", () => {
    const { container } = render(<DaySection {...baseProps} photos={undefined} />)
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
    expect(screen.queryByTestId("photo-grid")).not.toBeInTheDocument()
  })

  it("renders the PhotoGrid once photos are loaded", () => {
    render(<DaySection {...baseProps} photos={[makePhoto(), makePhoto({ id: "photo-2" })]} />)
    expect(screen.getByTestId("photo-grid")).toHaveTextContent("2 photos rendered")
  })

  it("calls onNeedLoad once the section becomes visible while expanded and unloaded", () => {
    const onNeedLoad = vi.fn()
    render(<DaySection {...baseProps} photos={undefined} onNeedLoad={onNeedLoad} />)

    expect(onNeedLoad).not.toHaveBeenCalled()
    makeIntersect()
    expect(onNeedLoad).toHaveBeenCalledWith("2024-03-15")
  })

  it("does not call onNeedLoad when the section is collapsed", () => {
    const onNeedLoad = vi.fn()
    render(<DaySection {...baseProps} isCollapsed photos={undefined} onNeedLoad={onNeedLoad} />)

    makeIntersect()
    expect(onNeedLoad).not.toHaveBeenCalled()
  })

  it("does not call onNeedLoad when photos are already loaded", () => {
    const onNeedLoad = vi.fn()
    render(<DaySection {...baseProps} photos={[makePhoto()]} onNeedLoad={onNeedLoad} />)

    makeIntersect()
    expect(onNeedLoad).not.toHaveBeenCalled()
  })

  it("does not call onNeedLoad while already loading", () => {
    const onNeedLoad = vi.fn()
    render(<DaySection {...baseProps} photos={undefined} isLoading onNeedLoad={onNeedLoad} />)

    makeIntersect()
    expect(onNeedLoad).not.toHaveBeenCalled()
  })

  it("calls onProcess, onDownload, and onDelete from the desktop action buttons", async () => {
    const user = userEvent.setup()
    const onProcess = vi.fn()
    const onDownload = vi.fn()
    const onDelete = vi.fn()
    render(
      <DaySection {...baseProps} onProcess={onProcess} onDownload={onDownload} onDelete={onDelete} />
    )

    await user.click(screen.getByTitle("Retraiter cette journée"))
    expect(onProcess).toHaveBeenCalledWith(baseProps.date)

    await user.click(screen.getByTitle("Télécharger cette journée"))
    expect(onDownload).toHaveBeenCalledWith(baseProps.date)

    await user.click(screen.getByTitle("Supprimer cette journée"))
    expect(onDelete).toHaveBeenCalledWith(baseProps.date, baseProps.count)
  })

  it("toggles the mobile menu open when the actions button is clicked", async () => {
    const user = userEvent.setup()
    const onToggleMobileMenu = vi.fn()
    render(<DaySection {...baseProps} openMobileMenu={null} onToggleMobileMenu={onToggleMobileMenu} />)

    await user.click(screen.getByTitle("Actions"))
    expect(onToggleMobileMenu).toHaveBeenCalledWith("2024-03-15")
  })

  it("closes the mobile menu when the actions button is clicked again while open", async () => {
    const user = userEvent.setup()
    const onToggleMobileMenu = vi.fn()
    render(
      <DaySection
        {...baseProps}
        openMobileMenu="2024-03-15"
        onToggleMobileMenu={onToggleMobileMenu}
      />
    )

    await user.click(screen.getByTitle("Actions"))
    expect(onToggleMobileMenu).toHaveBeenCalledWith(null)
  })

  it("closes the mobile dropdown and fires the action when a dropdown item is clicked", async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    const onToggleMobileMenu = vi.fn()
    render(
      <DaySection
        {...baseProps}
        openMobileMenu="2024-03-15"
        onDownload={onDownload}
        onToggleMobileMenu={onToggleMobileMenu}
      />
    )

    const dropdownDownloadButtons = screen.getAllByText("Télécharger")
    await user.click(dropdownDownloadButtons[dropdownDownloadButtons.length - 1])

    expect(onDownload).toHaveBeenCalledWith(baseProps.date)
    expect(onToggleMobileMenu).toHaveBeenCalledWith(null)
  })

  it("closes the mobile menu when the backdrop is clicked", async () => {
    const user = userEvent.setup()
    const onToggleMobileMenu = vi.fn()
    const { container } = render(
      <DaySection
        {...baseProps}
        openMobileMenu="2024-03-15"
        onToggleMobileMenu={onToggleMobileMenu}
      />
    )

    const backdrop = container.querySelector(".fixed.inset-0.z-10")
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)
    expect(onToggleMobileMenu).toHaveBeenCalledWith(null)
  })
})
