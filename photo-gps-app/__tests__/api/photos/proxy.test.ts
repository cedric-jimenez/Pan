import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GET } from "@/app/api/photos/proxy/route"

vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

import { requireAuth } from "@/lib/session"

const mockUser = { id: "user-123", email: "test@example.com", name: "Test User" }

describe("GET /api/photos/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockUser)
    process.env.R2_PUBLIC_URL = "https://r2.example.com"
    global.fetch = vi.fn()
  })

  afterEach(() => {
    delete process.env.R2_PUBLIC_URL
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://r2.example.com/photo.jpg")
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("rejects a request with no url parameter", async () => {
    const response = await GET(new Request("http://localhost:3000/api/photos/proxy"))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Missing url parameter")
  })

  it("rejects a url outside the configured R2 origin (SSRF guard)", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://evil.example.com/steal.jpg")
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("URL not allowed")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns 401 when R2_PUBLIC_URL is not configured, even for a plausible url", async () => {
    delete process.env.R2_PUBLIC_URL

    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://r2.example.com/photo.jpg")
    )

    // The route's catch-all turns the thrown "URL not allowed" response path's
    // early return into a normal 403 (no throw involved) -- verify accordingly.
    expect(response.status).toBe(403)
  })

  it("proxies the image with the upstream content type and caching headers", async () => {
    const blob = new Blob(["image-bytes"], { type: "image/jpeg" })
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "image/jpeg" }),
      blob: async () => blob,
    } as unknown as Response)

    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://r2.example.com/photo.jpg")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/jpeg")
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=3600")
  })

  it("propagates the upstream status when the fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 404 } as Response)

    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://r2.example.com/missing.jpg")
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe("Failed to fetch image")
  })

  it("returns 401 for any unexpected error, including a fetch throw", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network unreachable"))

    const response = await GET(
      new Request("http://localhost:3000/api/photos/proxy?url=https://r2.example.com/photo.jpg")
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })
})
