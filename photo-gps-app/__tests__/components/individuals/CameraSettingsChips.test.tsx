import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import CameraSettingsChips from "@/components/individuals/CameraSettingsChips"

describe("CameraSettingsChips Component", () => {
  it("renders nothing when no camera settings are present", () => {
    const { container } = render(
      <CameraSettingsChips
        photo={{ aperture: null, iso: null, shutterSpeed: null, focalLength: null }}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the aperture chip", () => {
    render(
      <CameraSettingsChips
        photo={{ aperture: "f/2.8", iso: null, shutterSpeed: null, focalLength: null }}
      />
    )
    expect(screen.getByText("f/2.8")).toBeInTheDocument()
  })

  it("renders the ISO chip with an ISO prefix", () => {
    render(
      <CameraSettingsChips
        photo={{ aperture: null, iso: 400, shutterSpeed: null, focalLength: null }}
      />
    )
    expect(screen.getByText("ISO 400")).toBeInTheDocument()
  })

  it("renders the shutter speed chip", () => {
    render(
      <CameraSettingsChips
        photo={{ aperture: null, iso: null, shutterSpeed: "1/250s", focalLength: null }}
      />
    )
    expect(screen.getByText("1/250s")).toBeInTheDocument()
  })

  it("renders the focal length chip", () => {
    render(
      <CameraSettingsChips
        photo={{ aperture: null, iso: null, shutterSpeed: null, focalLength: "50mm" }}
      />
    )
    expect(screen.getByText("50mm")).toBeInTheDocument()
  })

  it("renders all chips together and the section label", () => {
    render(
      <CameraSettingsChips
        photo={{ aperture: "f/2.8", iso: 400, shutterSpeed: "1/250s", focalLength: "50mm" }}
      />
    )
    expect(screen.getByText("Réglages")).toBeInTheDocument()
    expect(screen.getByText("f/2.8")).toBeInTheDocument()
    expect(screen.getByText("ISO 400")).toBeInTheDocument()
    expect(screen.getByText("1/250s")).toBeInTheDocument()
    expect(screen.getByText("50mm")).toBeInTheDocument()
  })
})
