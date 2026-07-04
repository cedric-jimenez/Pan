import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import {
  generateCsrfToken,
  getCsrfTokenFromRequest,
  csrfMiddleware,
  getCsrfTokenName,
  getCsrfHeaderName,
} from "@/lib/csrf"

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

describe("generateCsrfToken", () => {
  it("generates a 64-character hex string", () => {
    const token = generateCsrfToken()

    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it("generates different tokens on each call", () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken())
  })
})

describe("getCsrfTokenFromRequest", () => {
  it("prefers the cookie token over the header token", () => {
    const request = makeRequest("http://localhost:3000/api/photos", {
      cookies: { "csrf-token": "cookie-value" },
      headers: { "x-csrf-token": "header-value" },
    })

    expect(getCsrfTokenFromRequest(request)).toBe("cookie-value")
  })

  it("falls back to the header token when no cookie is set", () => {
    const request = makeRequest("http://localhost:3000/api/photos", {
      headers: { "x-csrf-token": "header-value" },
    })

    expect(getCsrfTokenFromRequest(request)).toBe("header-value")
  })

  it("returns null when neither is present", () => {
    const request = makeRequest("http://localhost:3000/api/photos")

    expect(getCsrfTokenFromRequest(request)).toBeNull()
  })
})

describe("getCsrfTokenName / getCsrfHeaderName", () => {
  it("exposes the cookie and header names used for the double-submit pattern", () => {
    expect(getCsrfTokenName()).toBe("csrf-token")
    expect(getCsrfHeaderName()).toBe("x-csrf-token")
  })
})

describe("csrfMiddleware", () => {
  it("skips non-API routes entirely", async () => {
    const request = makeRequest("http://localhost:3000/gallery")

    const result = await csrfMiddleware(request)

    expect(result).toBeNull()
  })

  it("skips NextAuth routes", async () => {
    const request = makeRequest("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
    })

    const result = await csrfMiddleware(request)

    expect(result).toBeNull()
  })

  it("issues a fresh token cookie on a GET request without one", async () => {
    const request = makeRequest("http://localhost:3000/api/photos")

    const result = await csrfMiddleware(request)

    expect(result).not.toBeNull()
    const setCookie = result!.cookies.get("csrf-token")
    expect(setCookie?.value).toMatch(/^[0-9a-f]{64}$/)
    expect(result!.headers.get("x-csrf-token")).toBe(setCookie?.value)
  })

  it("reuses the existing token cookie on a GET request", async () => {
    const request = makeRequest("http://localhost:3000/api/photos", {
      cookies: { "csrf-token": "existing-token" },
    })

    const result = await csrfMiddleware(request)

    expect(result!.cookies.get("csrf-token")?.value).toBe("existing-token")
    expect(result!.headers.get("x-csrf-token")).toBe("existing-token")
  })

  it("rejects a mutating request when the origin does not match the host", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "DELETE",
      headers: { origin: "https://evil.example.com", host: "localhost:3000" },
    })

    const result = await csrfMiddleware(request)

    expect(result?.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toBe("Origin validation failed")
  })

  it("rejects a mutating request with no CSRF token at all", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    })

    const result = await csrfMiddleware(request)

    expect(result?.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toBe("CSRF token missing")
  })

  it("rejects a mutating request when only the cookie token is present", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      cookies: { "csrf-token": "token-a" },
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    })

    const result = await csrfMiddleware(request)

    expect(result?.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toBe("CSRF token missing")
  })

  it("rejects a mutating request when cookie and header tokens differ", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      cookies: { "csrf-token": "token-a" },
      headers: {
        "x-csrf-token": "token-b",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    })

    const result = await csrfMiddleware(request)

    expect(result?.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toBe("CSRF token mismatch")
  })

  it("allows a mutating request when cookie and header tokens match", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      cookies: { "csrf-token": "token-a" },
      headers: {
        "x-csrf-token": "token-a",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    })

    const result = await csrfMiddleware(request)

    expect(result).toBeNull()
  })

  it("skips origin validation when no origin header is sent", async () => {
    const request = makeRequest("http://localhost:3000/api/photos/photo-1", {
      method: "PATCH",
      cookies: { "csrf-token": "token-a" },
      headers: { "x-csrf-token": "token-a", host: "localhost:3000" },
    })

    const result = await csrfMiddleware(request)

    expect(result).toBeNull()
  })
})
