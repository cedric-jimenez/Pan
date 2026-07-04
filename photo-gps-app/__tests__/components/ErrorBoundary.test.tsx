import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Boom!")
  }
  return <div>Safe content</div>
}

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Safe content")).toBeInTheDocument()
  })

  it("renders the default fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument()
    expect(
      screen.getByText("An unexpected error occurred. Please try refreshing the page.")
    ).toBeInTheDocument()
  })

  it("displays the error details in the default fallback", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Error details")).toBeInTheDocument()
    expect(screen.getByText("Error: Boom!")).toBeInTheDocument()
  })

  it("reloads the page when the refresh button is clicked", async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    })

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )

    await user.click(screen.getByText("Refresh page"))
    expect(reloadMock).toHaveBeenCalledTimes(1)

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    })
  })

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Custom error UI")).toBeInTheDocument()
    expect(screen.queryByText("Oops! Something went wrong")).not.toBeInTheDocument()
  })
})
