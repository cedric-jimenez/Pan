// @vitest-environment node
import { describe, it, expect, vi } from "vitest"

const { capturedConfig } = vi.hoisted(() => ({
  capturedConfig: { current: null as unknown },
}))

vi.mock("next-auth", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn((config: any) => {
    capturedConfig.current = config
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  }),
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}))

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({})),
}))

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}))

import "@/lib/auth"

interface JwtCallback {
  (args: { token: Record<string, unknown>; user?: { id: string } }): Promise<
    Record<string, unknown>
  >
}

interface SessionCallback {
  (args: {
    session: { user?: { id: string } }
    token: Record<string, unknown>
  }): Promise<{ user?: { id: string } }>
}

function getCallbacks() {
  const config = capturedConfig.current as {
    callbacks: { jwt: JwtCallback; session: SessionCallback }
  }
  return config.callbacks
}

describe("NextAuth jwt callback", () => {
  it("attaches the user id to the token on sign-in", async () => {
    const { jwt } = getCallbacks()
    const token = await jwt({ token: {}, user: { id: "user-42" } })
    expect(token.id).toBe("user-42")
  })

  it("leaves the token unchanged when there is no user (token refresh)", async () => {
    const { jwt } = getCallbacks()
    const token = await jwt({ token: { id: "existing-id" } })
    expect(token.id).toBe("existing-id")
  })
})

describe("NextAuth session callback", () => {
  it("propagates the token id onto session.user.id", async () => {
    const { session } = getCallbacks()
    const result = await session({
      session: { user: { id: "" } },
      token: { id: "user-42" },
    })
    expect(result.user?.id).toBe("user-42")
  })

  it("does nothing when the session has no user", async () => {
    const { session } = getCallbacks()
    const result = await session({ session: { user: undefined }, token: { id: "user-42" } })
    expect(result.user).toBeUndefined()
  })
})
