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
 * Ensure CSRF token exists by making a GET request if needed
 * This fetches a token from the server by making a lightweight GET request
 */
async function ensureCsrfToken(): Promise<string | null> {
  // Check if token already exists
  let token = getCsrfToken()
  if (token) {
    return token
  }

  // Token doesn't exist, fetch it with a lightweight GET request
  try {
    await fetch("/api/photos", {
      method: "GET",
      credentials: "same-origin",
    })

    // Token should now be in cookies
    token = getCsrfToken()
    return token
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error)
    return null
  }
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
    // Ensure we have a token (fetch it if necessary)
    const token = await ensureCsrfToken()

    if (!token) {
      console.error("Failed to obtain CSRF token")
      // Proceed anyway - let the server reject it with proper error
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
 * Pre-fetch CSRF token (useful for initial page load)
 * Call this when the app initializes to ensure token is ready
 */
export async function initializeCsrfToken(): Promise<void> {
  await ensureCsrfToken()
}

/**
 * Check if CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null
}
