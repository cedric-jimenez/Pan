import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Button from "@/components/Button"

describe("Button Component", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("calls onClick handler when clicked", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByText("Click me"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("applies primary variant styles by default", () => {
    render(<Button>Primary</Button>)
    const button = screen.getByText("Primary")
    expect(button).toHaveClass("bg-primary")
  })

  it("applies secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByText("Secondary")
    expect(button).toHaveClass("bg-secondary")
  })

  it("applies destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByText("Delete")
    expect(button).toHaveClass("bg-destructive")
  })

  it("shows loading state", () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("is disabled when loading", () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("does not call onClick when disabled", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    )

    await user.click(screen.getByText("Disabled"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByText("Custom")
    expect(button).toHaveClass("custom-class")
  })
})
