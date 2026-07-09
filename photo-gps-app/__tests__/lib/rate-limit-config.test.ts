import { describe, it, expect } from "vitest"
import { getRateLimitForRoute, RATE_LIMITS } from "@/lib/rate-limit-config"

describe("getRateLimitForRoute", () => {
  it("matches register POST", () => {
    expect(getRateLimitForRoute("/api/register", "POST")).toBe(RATE_LIMITS.register)
  })

  it("does not match register on other methods", () => {
    expect(getRateLimitForRoute("/api/register", "GET")).toBeNull()
  })

  it("matches NextAuth login callback POST", () => {
    expect(getRateLimitForRoute("/api/auth/callback/credentials", "POST")).toBe(
      RATE_LIMITS.login
    )
  })

  it("matches upload POST", () => {
    expect(getRateLimitForRoute("/api/photos/upload", "POST")).toBe(RATE_LIMITS.upload)
  })

  it("matches bulk-delete POST", () => {
    expect(getRateLimitForRoute("/api/photos/bulk-delete", "POST")).toBe(RATE_LIMITS.bulkDelete)
  })

  it("matches PATCH and DELETE on a single photo (modify)", () => {
    expect(getRateLimitForRoute("/api/photos/abc123", "PATCH")).toBe(RATE_LIMITS.modify)
    expect(getRateLimitForRoute("/api/photos/abc123", "DELETE")).toBe(RATE_LIMITS.modify)
  })

  it("does not match modify for nested photo sub-routes", () => {
    expect(getRateLimitForRoute("/api/photos/abc123/similar", "PATCH")).toBeNull()
  })

  it("does not match modify for GET requests", () => {
    expect(getRateLimitForRoute("/api/photos/abc123", "GET")).toBeNull()
  })

  it("returns null for unrelated routes", () => {
    expect(getRateLimitForRoute("/api/individuals", "GET")).toBeNull()
    expect(getRateLimitForRoute("/", "GET")).toBeNull()
  })
})
