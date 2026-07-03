import { describe, it, expect, vi, beforeEach } from "vitest"
import bcrypt from "bcryptjs"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { authorizeCredentials } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function makeMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    password: null,
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe("Authentication Utils", () => {
  describe("Password Hashing", () => {
    it("hashes password correctly", async () => {
      const password = "mySecurePassword123"
      const hashedPassword = await bcrypt.hash(password, 12)

      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword).toHaveLength(60) // bcrypt hash length
    })

    it("verifies correct password", async () => {
      const password = "mySecurePassword123"
      const hashedPassword = await bcrypt.hash(password, 12)

      const isValid = await bcrypt.compare(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    it("rejects incorrect password", async () => {
      const password = "mySecurePassword123"
      const wrongPassword = "wrongPassword"
      const hashedPassword = await bcrypt.hash(password, 12)

      const isValid = await bcrypt.compare(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })

    it("generates different hashes for same password", async () => {
      const password = "mySecurePassword123"
      const hash1 = await bcrypt.hash(password, 12)
      const hash2 = await bcrypt.hash(password, 12)

      expect(hash1).not.toBe(hash2)

      // But both should validate the same password
      expect(await bcrypt.compare(password, hash1)).toBe(true)
      expect(await bcrypt.compare(password, hash2)).toBe(true)
    })
  })

  describe("authorizeCredentials", () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("throws when email is missing", async () => {
      await expect(
        authorizeCredentials({ password: "password123" })
      ).rejects.toThrow("Invalid credentials")
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it("throws when password is missing", async () => {
      await expect(
        authorizeCredentials({ email: "test@example.com" })
      ).rejects.toThrow("Invalid credentials")
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it("throws when credentials are undefined", async () => {
      await expect(authorizeCredentials(undefined)).rejects.toThrow("Invalid credentials")
    })

    it("throws when no user matches the email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(
        authorizeCredentials({ email: "unknown@example.com", password: "password123" })
      ).rejects.toThrow("Invalid credentials")
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "unknown@example.com" },
      })
    })

    it("throws when the user has no password (OAuth-only account)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        makeMockUser({ email: "oauth@example.com", name: "OAuth User", password: null })
      )

      await expect(
        authorizeCredentials({ email: "oauth@example.com", password: "password123" })
      ).rejects.toThrow("Invalid credentials")
    })

    it("throws when the password does not match", async () => {
      const hashedPassword = await bcrypt.hash("correctPassword", 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(makeMockUser({ password: hashedPassword }))

      await expect(
        authorizeCredentials({ email: "test@example.com", password: "wrongPassword" })
      ).rejects.toThrow("Invalid credentials")
    })

    it("returns the user shape when credentials are valid", async () => {
      const hashedPassword = await bcrypt.hash("correctPassword", 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(makeMockUser({ password: hashedPassword }))

      const result = await authorizeCredentials({
        email: "test@example.com",
        password: "correctPassword",
      })

      expect(result).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      })
    })
  })
})
