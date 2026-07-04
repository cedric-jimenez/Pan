import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import Navbar from "@/components/Navbar"
import { useTheme } from "@/components/ThemeProvider"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: vi.fn(),
}))

const mockedUsePathname = vi.mocked(usePathname)
const mockedUseSession = vi.mocked(useSession)
const mockedUseTheme = vi.mocked(useTheme)
const mockedSignOut = vi.mocked(signOut)

function mockAuthenticated(pathname = "/accueil", theme: "dark" | "light" = "light") {
  mockedUsePathname.mockReturnValue(pathname)
  mockedUseSession.mockReturnValue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { user: { email: "researcher@example.com" } } as any,
    status: "authenticated",
    update: vi.fn(),
  })
  mockedUseTheme.mockReturnValue({ theme, toggleTheme: vi.fn(), setTheme: vi.fn() })
}

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when there is no session", () => {
    mockedUsePathname.mockReturnValue("/accueil")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedUseSession.mockReturnValue({ data: null, status: "unauthenticated", update: vi.fn() } as any)
    mockedUseTheme.mockReturnValue({ theme: "light", toggleTheme: vi.fn(), setTheme: vi.fn() })

    const { container } = render(<Navbar />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the nav links when authenticated", () => {
    mockAuthenticated()
    render(<Navbar />)

    expect(screen.getByText("SalamanTrack")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Gallery" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Identification" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Individuals" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Carte" })).toBeInTheDocument()
  })

  it("highlights the link matching the current pathname", () => {
    mockAuthenticated("/gallery")
    render(<Navbar />)

    const links = screen.getAllByRole("link", { name: "Gallery" })
    expect(links[0]).toHaveClass("text-primary", "font-bold")

    const accueilLinks = screen.getAllByRole("link", { name: "Accueil" })
    expect(accueilLinks[0]).not.toHaveClass("text-primary")
  })

  it("shows the signed-in user's email", () => {
    mockAuthenticated()
    render(<Navbar />)
    expect(screen.getAllByText("researcher@example.com").length).toBeGreaterThan(0)
  })

  it("calls signOut with the login callback when signing out", async () => {
    mockAuthenticated()
    const user = userEvent.setup()
    render(<Navbar />)

    const signOutButtons = screen.getAllByText("Sign Out")
    await user.click(signOutButtons[0])
    expect(mockedSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" })
  })

  it("calls toggleTheme when the theme button is clicked", async () => {
    const toggleTheme = vi.fn()
    mockedUsePathname.mockReturnValue("/accueil")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedUseSession.mockReturnValue({
      data: { user: { email: "researcher@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    } as any)
    mockedUseTheme.mockReturnValue({ theme: "light", toggleTheme, setTheme: vi.fn() })

    const user = userEvent.setup()
    render(<Navbar />)

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }))
    expect(toggleTheme).toHaveBeenCalledTimes(1)
  })

  it("shows the light-theme toggle label when the theme is dark", () => {
    mockAuthenticated("/accueil", "dark")
    render(<Navbar />)
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument()
  })

  it("opens and closes the mobile menu", async () => {
    mockAuthenticated()
    const user = userEvent.setup()
    render(<Navbar />)

    expect(screen.queryAllByText("Sign Out")).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Toggle menu" }))
    expect(screen.queryAllByText("Sign Out")).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: "Toggle menu" }))
    expect(screen.queryAllByText("Sign Out")).toHaveLength(1)
  })

  it("closes the mobile menu when a nav link is clicked", async () => {
    mockAuthenticated()
    const user = userEvent.setup()
    render(<Navbar />)

    await user.click(screen.getByRole("button", { name: "Toggle menu" }))
    expect(screen.queryAllByText("Sign Out")).toHaveLength(2)

    const mobileGalleryLink = screen.getAllByRole("link", { name: "Gallery" })[1]
    await user.click(mobileGalleryLink)

    expect(screen.queryAllByText("Sign Out")).toHaveLength(1)
  })
})
