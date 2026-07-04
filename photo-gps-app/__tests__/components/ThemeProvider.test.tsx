import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ThemeProvider, { useTheme } from "@/components/ThemeProvider"

function ThemeConsumer() {
  const { theme, toggleTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
    </div>
  )
}

function ThrowingConsumer() {
  useTheme()
  return null
}

describe("ThemeProvider Component", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
  })

  it("defaults to light theme when nothing is stored", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
  })

  it("reads the persisted theme from localStorage on mount", () => {
    localStorage.setItem("theme", "dark")
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark")
  })

  it("ignores invalid stored theme values", () => {
    localStorage.setItem("theme", "purple")
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
  })

  it("sets the data-theme attribute on the document element", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(document.documentElement).toHaveAttribute("data-theme", "light")
  })

  it("toggles between light and dark", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark")
    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
    expect(localStorage.getItem("theme")).toBe("dark")

    await user.click(screen.getByText("Toggle"))
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
    expect(localStorage.getItem("theme")).toBe("light")
  })

  it("sets an explicit theme via setTheme", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText("Set Dark"))
    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark")
    expect(localStorage.getItem("theme")).toBe("dark")

    await user.click(screen.getByText("Set Light"))
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
    expect(localStorage.getItem("theme")).toBe("light")
  })

  it("throws an error when useTheme is used outside a ThemeProvider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ThrowingConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    )
    consoleErrorSpy.mockRestore()
  })
})
