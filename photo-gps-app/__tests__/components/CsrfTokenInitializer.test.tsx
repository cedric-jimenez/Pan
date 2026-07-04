import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import CsrfTokenInitializer from "@/components/CsrfTokenInitializer"
import { initializeCsrfToken } from "@/lib/fetch-with-csrf"

vi.mock("@/lib/fetch-with-csrf", () => ({
  initializeCsrfToken: vi.fn(),
}))

describe("CsrfTokenInitializer Component", () => {
  beforeEach(() => {
    vi.mocked(initializeCsrfToken).mockReset()
  })

  it("renders nothing", () => {
    vi.mocked(initializeCsrfToken).mockResolvedValue(undefined)
    const { container } = render(<CsrfTokenInitializer />)
    expect(container).toBeEmptyDOMElement()
  })

  it("calls initializeCsrfToken on mount", () => {
    vi.mocked(initializeCsrfToken).mockResolvedValue(undefined)
    render(<CsrfTokenInitializer />)
    expect(initializeCsrfToken).toHaveBeenCalledTimes(1)
  })

  it("logs an error when initialization fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("network failure")
    vi.mocked(initializeCsrfToken).mockRejectedValue(error)

    render(<CsrfTokenInitializer />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to initialize CSRF token:", error)
    })

    consoleErrorSpy.mockRestore()
  })
})
