import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchWithCsrf, initializeCsrfToken, hasCsrfToken } from "@/lib/fetch-with-csrf"

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    writable: true,
    configurable: true,
    value,
  })
}

describe("lib/fetch-with-csrf", () => {
  beforeEach(() => {
    setCookie("")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe("hasCsrfToken", () => {
    it("returns false when no cookie is set", () => {
      expect(hasCsrfToken()).toBe(false)
    })

    it("returns true when the csrf-token cookie is set", () => {
      setCookie("csrf-token=abc123")
      expect(hasCsrfToken()).toBe(true)
    })

    it("decodes an encoded cookie value", () => {
      setCookie("other=1; csrf-token=abc%3D123")
      expect(hasCsrfToken()).toBe(true)
    })
  })

  describe("fetchWithCsrf", () => {
    it("does not fetch a token for GET requests", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

      await fetchWithCsrf("/api/photos")

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith("/api/photos", undefined)
    })

    it("adds the csrf header for POST requests when a token already exists", async () => {
      setCookie("csrf-token=existing-token")
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

      await fetchWithCsrf("/api/photos", { method: "POST", body: "{}" })

      expect(fetch).toHaveBeenCalledTimes(1)
      const [url, options] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe("/api/photos")
      const headers = options?.headers as Headers
      expect(headers.get("x-csrf-token")).toBe("existing-token")
      expect(options?.credentials).toBe("same-origin")
    })

    it("fetches a token first when none exists, then retries the mutating request", async () => {
      vi.mocked(fetch).mockImplementation(async (input) => {
        if (input === "/api/photos" && (fetch as ReturnType<typeof vi.fn>).mock.calls.length === 1) {
          setCookie("csrf-token=fresh-token")
        }
        return new Response(null, { status: 200 })
      })

      await fetchWithCsrf("/api/photos/123", { method: "PUT" })

      expect(fetch).toHaveBeenCalledTimes(2)
      const [tokenCall] = vi.mocked(fetch).mock.calls[0]
      expect(tokenCall).toBe("/api/photos")

      const [, mutatingOptions] = vi.mocked(fetch).mock.calls[1]
      const headers = mutatingOptions?.headers as Headers
      expect(headers.get("x-csrf-token")).toBe("fresh-token")
    })

    it("proceeds without a token when it cannot be obtained", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"))
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))

      const response = await fetchWithCsrf("/api/photos", { method: "DELETE" })

      expect(response.status).toBe(200)
      expect(errorSpy).toHaveBeenCalledWith("Failed to fetch CSRF token:", expect.any(Error))
      expect(errorSpy).toHaveBeenCalledWith("Failed to obtain CSRF token")
    })

    it("respects an explicit credentials option", async () => {
      setCookie("csrf-token=existing-token")
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

      await fetchWithCsrf("/api/photos", { method: "PATCH", credentials: "include" })

      const [, options] = vi.mocked(fetch).mock.calls[0]
      expect(options?.credentials).toBe("include")
    })
  })

  describe("initializeCsrfToken", () => {
    it("ensures a token is fetched when missing", async () => {
      vi.mocked(fetch).mockImplementation(async () => {
        setCookie("csrf-token=init-token")
        return new Response(null, { status: 200 })
      })

      await initializeCsrfToken()

      expect(fetch).toHaveBeenCalledWith("/api/photos", { method: "GET", credentials: "same-origin" })
      expect(hasCsrfToken()).toBe(true)
    })

    it("does nothing when a token already exists", async () => {
      setCookie("csrf-token=already-there")

      await initializeCsrfToken()

      expect(fetch).not.toHaveBeenCalled()
    })
  })
})
