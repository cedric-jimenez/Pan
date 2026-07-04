import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhotoNavButtons from "@/components/photo-details/PhotoNavButtons"

describe("PhotoNavButtons Component", () => {
  it("renders nothing when onNavigate is not provided", () => {
    const { container } = render(<PhotoNavButtons hasPrev={true} hasNext={true} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders both buttons when hasPrev and hasNext are true", () => {
    render(<PhotoNavButtons onNavigate={vi.fn()} hasPrev={true} hasNext={true} />)
    expect(screen.getByLabelText("Photo précédente")).toBeInTheDocument()
    expect(screen.getByLabelText("Photo suivante")).toBeInTheDocument()
  })

  it("hides the previous button when hasPrev is false", () => {
    render(<PhotoNavButtons onNavigate={vi.fn()} hasPrev={false} hasNext={true} />)
    expect(screen.queryByLabelText("Photo précédente")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Photo suivante")).toBeInTheDocument()
  })

  it("hides the next button when hasNext is false", () => {
    render(<PhotoNavButtons onNavigate={vi.fn()} hasPrev={true} hasNext={false} />)
    expect(screen.getByLabelText("Photo précédente")).toBeInTheDocument()
    expect(screen.queryByLabelText("Photo suivante")).not.toBeInTheDocument()
  })

  it("renders neither button when both hasPrev and hasNext are false", () => {
    render(<PhotoNavButtons onNavigate={vi.fn()} hasPrev={false} hasNext={false} />)
    expect(screen.queryByLabelText("Photo précédente")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Photo suivante")).not.toBeInTheDocument()
  })

  it("calls onNavigate with 'prev' when the previous button is clicked", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<PhotoNavButtons onNavigate={onNavigate} hasPrev={true} hasNext={true} />)

    await user.click(screen.getByLabelText("Photo précédente"))
    expect(onNavigate).toHaveBeenCalledWith("prev")
  })

  it("calls onNavigate with 'next' when the next button is clicked", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<PhotoNavButtons onNavigate={onNavigate} hasPrev={true} hasNext={true} />)

    await user.click(screen.getByLabelText("Photo suivante"))
    expect(onNavigate).toHaveBeenCalledWith("next")
  })
})
