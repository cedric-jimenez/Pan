import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import StatsCards, { PhotoStats } from "@/components/StatsCards"

describe("StatsCards Component", () => {
  it("renders placeholder dashes when stats is null", () => {
    render(<StatsCards stats={null} />)
    const dashes = screen.getAllByText("–")
    expect(dashes).toHaveLength(5)
  })

  it("renders all stat labels", () => {
    render(<StatsCards stats={null} />)
    expect(screen.getByText("Total Photos")).toBeInTheDocument()
    expect(screen.getByText("With GPS")).toBeInTheDocument()
    expect(screen.getByText("With EXIF")).toBeInTheDocument()
    expect(screen.getByText("Cropped Photos")).toBeInTheDocument()
    expect(screen.getByText("Storage Used")).toBeInTheDocument()
  })

  it("renders numeric stat values", () => {
    const stats: PhotoStats = {
      total: 42,
      withGPS: 10,
      withEXIF: 30,
      cropped: 5,
      totalStorage: 500,
    }
    render(<StatsCards stats={stats} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("30")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("formats storage size in KB when below 1 MB", () => {
    const stats: PhotoStats = { total: 1, withGPS: 0, withEXIF: 0, cropped: 0, totalStorage: 2048 }
    render(<StatsCards stats={stats} />)
    expect(screen.getByText("2.0 KB")).toBeInTheDocument()
  })

  it("formats storage size in MB when below 1 GB", () => {
    const stats: PhotoStats = {
      total: 1,
      withGPS: 0,
      withEXIF: 0,
      cropped: 0,
      totalStorage: 5 * 1024 * 1024,
    }
    render(<StatsCards stats={stats} />)
    expect(screen.getByText("5.0 MB")).toBeInTheDocument()
  })

  it("formats storage size in GB when at or above 1 GB", () => {
    const stats: PhotoStats = {
      total: 1,
      withGPS: 0,
      withEXIF: 0,
      cropped: 0,
      totalStorage: 2 * 1024 * 1024 * 1024,
    }
    render(<StatsCards stats={stats} />)
    expect(screen.getByText("2.00 GB")).toBeInTheDocument()
  })
})
