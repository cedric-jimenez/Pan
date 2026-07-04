import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import SessionProvider from "@/components/SessionProvider"

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-auth-session-provider">{children}</div>
  ),
}))

describe("SessionProvider Component", () => {
  it("renders its children", () => {
    render(
      <SessionProvider>
        <div>Child content</div>
      </SessionProvider>
    )
    expect(screen.getByText("Child content")).toBeInTheDocument()
  })

  it("wraps children with the NextAuth SessionProvider", () => {
    render(
      <SessionProvider>
        <span>Wrapped</span>
      </SessionProvider>
    )
    const wrapper = screen.getByTestId("next-auth-session-provider")
    expect(wrapper).toContainElement(screen.getByText("Wrapped"))
  })
})
