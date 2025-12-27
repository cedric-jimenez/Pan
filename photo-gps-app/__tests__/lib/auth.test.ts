import { describe, it, expect } from "vitest"
import bcrypt from "bcryptjs"

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
})
