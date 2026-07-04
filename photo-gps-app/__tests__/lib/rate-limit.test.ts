import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { InMemoryRateLimiter, getRateLimiter } from "@/lib/rate-limit"

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = new InMemoryRateLimiter()
  })

  afterEach(() => {
    limiter.stopCleanup()
    vi.useRealTimers()
  })

  describe("check", () => {
    it("allows the first request under the limit", async () => {
      const result = await limiter.check("user:1", 5, 60_000)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
    })

    it("decrements remaining as requests come in", async () => {
      await limiter.check("user:1", 3, 60_000)
      await limiter.check("user:1", 3, 60_000)
      const third = await limiter.check("user:1", 3, 60_000)

      expect(third.success).toBe(true)
      expect(third.remaining).toBe(0)
    })

    it("denies requests once the limit is exceeded", async () => {
      await limiter.check("user:1", 2, 60_000)
      await limiter.check("user:1", 2, 60_000)
      const third = await limiter.check("user:1", 2, 60_000)

      expect(third.success).toBe(false)
      expect(third.remaining).toBe(0)
      expect(third.retryAfter).toBeGreaterThan(0)
    })

    it("tracks separate identifiers independently", async () => {
      await limiter.check("user:1", 1, 60_000)
      const other = await limiter.check("user:2", 1, 60_000)

      expect(other.success).toBe(true)
    })

    it("allows requests again once the sliding window has passed", async () => {
      await limiter.check("user:1", 1, 60_000)
      const blocked = await limiter.check("user:1", 1, 60_000)
      expect(blocked.success).toBe(false)

      vi.advanceTimersByTime(60_001)

      const allowedAgain = await limiter.check("user:1", 1, 60_000)
      expect(allowedAgain.success).toBe(true)
    })

    it("only counts requests within the current window (sliding, not fixed)", async () => {
      await limiter.check("user:1", 2, 60_000)
      vi.advanceTimersByTime(30_000)
      await limiter.check("user:1", 2, 60_000)

      // Both requests are still within the last 60s window
      const third = await limiter.check("user:1", 2, 60_000)
      expect(third.success).toBe(false)

      // Advance past the first request's window, but not the second's
      vi.advanceTimersByTime(30_001)
      const fourth = await limiter.check("user:1", 2, 60_000)
      expect(fourth.success).toBe(true)
    })
  })

  describe("getCount", () => {
    it("returns 0 for an identifier with no requests", () => {
      expect(limiter.getCount("unknown", 60_000)).toBe(0)
    })

    it("returns the number of requests within the window", async () => {
      await limiter.check("user:1", 10, 60_000)
      await limiter.check("user:1", 10, 60_000)

      expect(limiter.getCount("user:1", 60_000)).toBe(2)
    })
  })

  describe("reset", () => {
    it("clears the record for an identifier", async () => {
      await limiter.check("user:1", 1, 60_000)
      expect((await limiter.check("user:1", 1, 60_000)).success).toBe(false)

      limiter.reset("user:1")

      expect((await limiter.check("user:1", 1, 60_000)).success).toBe(true)
    })
  })

  describe("cleanup", () => {
    it("removes entries whose requests are all older than 24h", async () => {
      await limiter.check("user:1", 10, 60_000)
      expect(limiter.getStoreSize()).toBe(1)

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)
      vi.advanceTimersByTime(5 * 60 * 1000) // trigger the internal cleanup interval

      expect(limiter.getStoreSize()).toBe(0)
    })
  })

  describe("getRateLimiter", () => {
    it("returns the same singleton instance across calls", () => {
      expect(getRateLimiter()).toBe(getRateLimiter())
    })
  })
})
