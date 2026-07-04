import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rate-limit", () => ({
  getRateLimiter: vi.fn(),
}))

import { middleware } from "@/middleware"
import { getRateLimiter } from "@/lib/rate-limit"

function makeRequest(
  url: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    cookies?: Record<string, string>
  }
) {
  const request = new NextRequest(url, {
    method: init?.method ?? "GET",
    headers: init?.headers,
  })
  for (const [name, value] of Object.entries(init?.cookies ?? {})) {
    request.cookies.set(name, value)
  }
  return request
}

function rateLimitResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    success: true,
    limit: 200,
    remaining: 199,
    reset: 1_700_000_000,
    ...overrides,
  }
}

describe("middleware", () => {
  const check = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    check.mockReset()
    vi.mocked(getRateLimiter).mockReturnValue({
      check,
    } as unknown as ReturnType<typeof getRateLimiter>)
  })

  it("skips rate limiting and CSRF entirely for non-API routes", async () => {
    const request = makeRequest("http://localhost:3000/gallery")

    const response = await middleware(request)

    expect(check).not.toHaveBeenCalled()
    expect(response.headers.get("X-RateLimit-Limit")).toBeNull()
  })

  it("returns 429 when the global rate limit is exceeded", async () => {
    check.mockResolvedValueOnce(
      rateLimitResult({ success: false, remaining: 0, retryAfter: 42, limit: 200 })
    )

    const request = makeRequest("http://localhost:3000/api/photos")

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("Rate limit exceeded")
    expect(response.headers.get("Retry-After")).toBe("42")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(check).toHaveBeenCalledTimes(1)
  })

  it("returns 429 with route-specific info when a route limit is exceeded", async () => {
    check
      .mockResolvedValueOnce(rateLimitResult()) // global check passes
      .mockResolvedValueOnce(
        rateLimitResult({ success: false, remaining: 0, retryAfter: 30, limit: 100 })
      ) // route-specific "modify" limit fails

    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    })

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.limit).toBe(100)
    expect(check).toHaveBeenCalledTimes(2)
  })

  it("uses the user identifier (session cookie) for authenticated routes when present", async () => {
    check.mockResolvedValue(rateLimitResult())

    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "x-csrf-token": "token-a",
      },
      cookies: { "csrf-token": "token-a", "next-auth.session-token": "session-abc" },
    })

    await middleware(request)

    expect(check).toHaveBeenNthCalledWith(2, "user:session-abc", 100, 60 * 60 * 1000)
  })

  it("falls back to an IP-based identifier when there is no session cookie", async () => {
    check.mockResolvedValue(rateLimitResult())

    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "x-csrf-token": "token-a",
        "x-forwarded-for": "203.0.113.5, 70.41.3.18",
      },
      cookies: { "csrf-token": "token-a" },
    })

    await middleware(request)

    expect(check).toHaveBeenNthCalledWith(2, "ip:203.0.113.5", 100, 60 * 60 * 1000)
  })

  it("preserves rate-limit headers when CSRF validation rejects the request", async () => {
    check.mockResolvedValue(rateLimitResult({ remaining: 99, limit: 100 }))

    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
      // no CSRF token at all -> csrfMiddleware rejects
    })

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("CSRF token missing")
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("99")
  })

  it("passes through with rate-limit headers when everything succeeds", async () => {
    check.mockResolvedValue(rateLimitResult({ remaining: 77, limit: 100 }))

    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "x-csrf-token": "token-a",
      },
      cookies: { "csrf-token": "token-a" },
    })

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("77")
  })

  it("only checks the global limit for routes with no specific rate limit config", async () => {
    check.mockResolvedValue(rateLimitResult({ remaining: 150, limit: 200 }))

    const request = makeRequest("http://localhost:3000/api/photos")

    await middleware(request)

    expect(check).toHaveBeenCalledTimes(1)
  })

  it("sets global rate-limit headers when a mutating request with no route limit clears CSRF", async () => {
    check.mockResolvedValue(rateLimitResult({ remaining: 150, limit: 200 }))

    // /api/individuals has no route-specific rate limit configured
    const request = makeRequest("http://localhost:3000/api/individuals", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
        "x-csrf-token": "token-a",
      },
      cookies: { "csrf-token": "token-a" },
    })

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get("X-RateLimit-Limit")).toBe("200")
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("150")
  })

  it("returns the CSRF token-issuing response for a safe GET with no route limit", async () => {
    check.mockResolvedValue(rateLimitResult())

    const request = makeRequest("http://localhost:3000/api/photos")

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.cookies.get("csrf-token")?.value).toMatch(/^[0-9a-f]{64}$/)
  })
})
