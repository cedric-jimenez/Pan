import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import RegisterPage from "@/app/register/page"
import { fetchWithCsrf } from "@/lib/fetch-with-csrf"

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}))

vi.mock("@/lib/fetch-with-csrf", () => ({
  fetchWithCsrf: vi.fn(),
}))

const mockedUseRouter = vi.mocked(useRouter)
const mockedSignIn = vi.mocked(signIn)
const mockedFetchWithCsrf = vi.mocked(fetchWithCsrf)

function jsonResponse(status: number, data: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { password = "longenoughpassword", confirmPassword = "longenoughpassword" } = {}
) {
  const passwordFields = screen.getAllByPlaceholderText("••••••••")
  await user.type(screen.getByPlaceholderText("Your name"), "Jane Doe")
  await user.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com")
  await user.type(passwordFields[0], password)
  await user.type(passwordFields[1], confirmPassword)
}

describe("RegisterPage", () => {
  const push = vi.fn()
  const refresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedUseRouter.mockReturnValue({ push, refresh } as any)
  })

  it("renders the registration form", () => {
    render(<RegisterPage />)
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login")
  })

  it("shows an error when passwords do not match", async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user, { password: "longenoughpassword", confirmPassword: "different-password" })
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument()
    expect(mockedFetchWithCsrf).not.toHaveBeenCalled()
  })

  it("shows an error when the password is too short", async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user, { password: "short", confirmPassword: "short" })
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(
      await screen.findByText("Password must be at least 12 characters")
    ).toBeInTheDocument()
    expect(mockedFetchWithCsrf).not.toHaveBeenCalled()
  })

  it("shows the server error when registration fails", async () => {
    mockedFetchWithCsrf.mockResolvedValue(jsonResponse(400, { error: "User already exists" }))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(await screen.findByText("User already exists")).toBeInTheDocument()
    expect(mockedSignIn).not.toHaveBeenCalled()
  })

  it("falls back to a generic error message when the server omits one", async () => {
    mockedFetchWithCsrf.mockResolvedValue(jsonResponse(400, {}))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(await screen.findByText("Registration failed")).toBeInTheDocument()
  })

  it("logs in and redirects to the gallery after successful registration", async () => {
    mockedFetchWithCsrf.mockResolvedValue(jsonResponse(201, { user: { id: "1" } }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedSignIn.mockResolvedValue({ error: undefined } as any)
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(await screen.findByRole("button", { name: "Create Account" })).toBeInTheDocument()
    expect(mockedSignIn).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "longenoughpassword",
      redirect: false,
    })
    expect(push).toHaveBeenCalledWith("/gallery")
    expect(refresh).toHaveBeenCalled()
  })

  it("shows an error when auto-login fails after registration", async () => {
    mockedFetchWithCsrf.mockResolvedValue(jsonResponse(201, { user: { id: "1" } }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedSignIn.mockResolvedValue({ error: "CredentialsSignin" } as any)
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(
      await screen.findByText("Registration successful, but login failed. Please try logging in.")
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("shows a generic error when the registration request throws", async () => {
    mockedFetchWithCsrf.mockRejectedValue(new Error("network down"))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))

    expect(await screen.findByText("An error occurred. Please try again.")).toBeInTheDocument()
  })

  it("signs in with Google when clicking the Google button", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedSignIn.mockResolvedValue(undefined as any)
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Continue with Google" }))

    expect(mockedSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/gallery" })
  })

  it("shows an error when Google sign-in throws", async () => {
    mockedSignIn.mockRejectedValue(new Error("oauth failed"))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Continue with Google" }))

    expect(
      await screen.findByText("An error occurred with Google sign-in. Please try again.")
    ).toBeInTheDocument()
  })
})
