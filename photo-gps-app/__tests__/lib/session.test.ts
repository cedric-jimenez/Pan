import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCurrentUser, requireAuth } from "@/lib/session"

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

import { auth } from "@/lib/auth"

describe("Session Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getCurrentUser", () => {
    it("returns user when session exists", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockUser,
        expires: "2025-12-31",
      })

      const user = await getCurrentUser()

      expect(user).toEqual(mockUser)
      expect(auth).toHaveBeenCalled()
    })

    it("returns undefined when no session", async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const user = await getCurrentUser()

      expect(user).toBeUndefined()
    })

    it("returns undefined when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: undefined,
        expires: "2025-12-31",
      })

      const user = await getCurrentUser()

      expect(user).toBeUndefined()
    })
  })

  describe("requireAuth", () => {
    it("returns user when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      }

      vi.mocked(auth).mockResolvedValue({
        user: mockUser,
        expires: "2025-12-31",
      })

      const user = await requireAuth()

      expect(user).toEqual(mockUser)
    })

    it("throws error when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })

    it("throws error when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: undefined,
        expires: "2025-12-31",
      })

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })
  })
})
