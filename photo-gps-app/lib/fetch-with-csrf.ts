/**
 * Fetch wrapper that automatically includes CSRF token
 * Use this instead of native fetch() for all API requests
 */

const CSRF_TOKEN_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"

/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null // Server-side, no cookies available
  }

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === CSRF_TOKEN_NAME) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Fetch with automatic CSRF token injection
 * Usage: fetchWithCsrf('/api/photos', { method: 'POST', body: JSON.stringify(data) })
 */
export async function fetchWithCsrf(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method?.toUpperCase() || "GET"

  // Only add CSRF token for mutating methods
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

  if (needsCsrf) {
    const token = getCsrfToken()

    if (!token) {
      // No token available - this might be the first request
      // Try to fetch anyway, the server will reject if needed
      console.warn("CSRF token not found in cookies")
    }

    // Add CSRF token to headers
    const headers = new Headers(options?.headers)
    if (token) {
      headers.set(CSRF_HEADER_NAME, token)
    }

    // Ensure we send credentials to include cookies
    const updatedOptions: RequestInit = {
      ...options,
      headers,
      credentials: options?.credentials || "same-origin",
    }

    return fetch(url, updatedOptions)
  }

  // For safe methods (GET, HEAD, OPTIONS), just use regular fetch
  return fetch(url, options)
}

/**
 * Fetch CSRF token from API (useful for initial page load)
 * This makes a GET request to any API endpoint to receive a token
 */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    // Make a lightweight GET request to get the token
    // The middleware will set it in cookies and headers
    const response = await fetch("/api/photos", {
      method: "GET",
      credentials: "same-origin",
    })

    if (response.ok) {
      // Token should now be in cookies
      return getCsrfToken()
    }

    return null
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error)
    return null
  }
}

/**
 * Check if CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null
}
