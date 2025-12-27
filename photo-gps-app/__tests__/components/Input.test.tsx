import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Input from "@/components/Input"

describe("Input Component", () => {
  it("renders input field", () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument()
  })

  it("renders with label", () => {
    render(<Input label="Email" />)
    expect(screen.getByText("Email")).toBeInTheDocument()
  })

  it("handles user input", async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)

    const input = screen.getByPlaceholderText("Type here")
    await user.type(input, "Hello")

    expect(input).toHaveValue("Hello")
  })

  it("calls onChange handler", async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Input onChange={handleChange} placeholder="Type here" />)

    const input = screen.getByPlaceholderText("Type here")
    await user.type(input, "A")

    expect(handleChange).toHaveBeenCalled()
  })

  it("displays error message", () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText("This field is required")).toBeInTheDocument()
  })

  it("applies error styling when error is present", () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole("textbox")
    expect(input).toHaveClass("border-destructive")
  })

  it("accepts custom className", () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole("textbox")
    expect(input).toHaveClass("custom-input")
  })

  it("supports different input types", () => {
    const { container, rerender } = render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email")

    rerender(<Input type="password" placeholder="Password" />)
    const passwordInput = screen.getByPlaceholderText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")
  })

  it("can be disabled", () => {
    render(<Input disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("supports required attribute", () => {
    render(<Input required />)
    expect(screen.getByRole("textbox")).toBeRequired()
  })
})
