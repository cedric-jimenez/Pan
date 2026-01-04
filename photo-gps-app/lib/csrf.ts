import { NextRequest, NextResponse } from "next/server"

/**
 * CSRF Protection Implementation
 * Generates and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 * Uses Web Crypto API for Edge Runtime compatibility
 */

const CSRF_TOKEN_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"
const TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token using Web Crypto API
 * Compatible with Edge Runtime
 */
export function generateCsrfToken(): string {
  // Use Web Crypto API (available in Edge Runtime)
  const array = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Get CSRF token from request (cookie or header)
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  // Try to get from cookie first
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value
  if (cookieToken) {
    return cookieToken
  }

  // Try to get from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  return headerToken
}

/**
 * Check if the request method requires CSRF protection
 */
function isProtectedMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
}

/**
 * Check if the path should be excluded from CSRF protection
 */
function isExcludedPath(pathname: string): boolean {
  const excludedPaths = [
    "/api/auth/", // NextAuth routes handle their own CSRF
  ]

  return excludedPaths.some((path) => pathname.startsWith(path))
}

/**
 * Middleware to handle CSRF protection
 * - Generates token for GET requests
 * - Validates token for POST/PUT/PATCH/DELETE requests
 */
export async function csrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, origin } = request.nextUrl

  // Skip CSRF for excluded paths
  if (isExcludedPath(pathname)) {
    return null
  }

  // Skip CSRF for non-API routes (static files, pages, etc.)
  if (!pathname.startsWith("/api/")) {
    return null
  }

  const method = request.method

  // For safe methods (GET, HEAD, OPTIONS), generate or refresh token
  if (!isProtectedMethod(method)) {
    // Check if token already exists
    let token = request.cookies.get(CSRF_TOKEN_NAME)?.value

    // Generate new token if none exists
    if (!token) {
      token = generateCsrfToken()
    }

    // Clone the response and set the token cookie
    const response = NextResponse.next()
    response.cookies.set({
      name: CSRF_TOKEN_NAME,
      value: token,
      httpOnly: false, // Must be readable by JavaScript to include in requests
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })

    // Also send token in header for easier access
    response.headers.set(CSRF_HEADER_NAME, token)

    return response
  }

  // For unsafe methods (POST, PUT, PATCH, DELETE), validate token
  // Step 1: Verify Origin header matches Host (recommended by Next.js)
  const requestOrigin = request.headers.get("origin")
  const requestHost = request.headers.get("host")

  if (requestOrigin && requestHost) {
    const originUrl = new URL(requestOrigin)
    // Check if origin's host matches request host
    if (originUrl.host !== requestHost) {
      return NextResponse.json(
        {
          error: "Origin validation failed",
          message: "Request origin does not match host",
        },
        { status: 403 }
      )
    }
  }

  // Step 2: Validate CSRF token (double-submit cookie pattern)
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Token must be present in both cookie and header
  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      {
        error: "CSRF token missing",
        message: "CSRF token is required for this request",
      },
      { status: 403 }
    )
  }

  // Tokens must match (double-submit cookie pattern)
  if (cookieToken !== headerToken) {
    return NextResponse.json(
      {
        error: "CSRF token mismatch",
        message: "Invalid CSRF token",
      },
      { status: 403 }
    )
  }

  // All checks passed, allow the request to proceed
  return null
}

/**
 * Get the CSRF token name for client-side usage
 */
export function getCsrfTokenName(): string {
  return CSRF_TOKEN_NAME
}

/**
 * Get the CSRF header name for client-side usage
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME
}
