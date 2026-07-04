import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ProgressBar from "@/components/identification/ProgressBar"

describe("ProgressBar Component", () => {
  it("renders the label", () => {
    render(<ProgressBar done={2} total={10} label="photos importées" />)
    expect(screen.getByText("photos importées")).toBeInTheDocument()
  })

  it("renders the done/total counter", () => {
    render(<ProgressBar done={2} total={10} label="photos importées" />)
    expect(screen.getByText("2 / 10")).toBeInTheDocument()
  })

  it("sets accessible progressbar attributes", () => {
    render(<ProgressBar done={3} total={12} label="items" />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "3")
    expect(bar).toHaveAttribute("aria-valuemin", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "12")
  })

  it("computes the fill width as a rounded percentage", () => {
    render(<ProgressBar done={1} total={3} label="items" />)
    const bar = screen.getByRole("progressbar")
    const fill = bar.firstChild as HTMLElement
    expect(fill.style.width).toBe("33%")
  })

  it("renders a 0% width when total is 0", () => {
    render(<ProgressBar done={0} total={0} label="items" />)
    const bar = screen.getByRole("progressbar")
    const fill = bar.firstChild as HTMLElement
    expect(fill.style.width).toBe("0%")
    expect(screen.getByText("0 / 0")).toBeInTheDocument()
  })

  it("renders a 100% width when done equals total", () => {
    render(<ProgressBar done={5} total={5} label="items" />)
    const bar = screen.getByRole("progressbar")
    const fill = bar.firstChild as HTMLElement
    expect(fill.style.width).toBe("100%")
  })
})
