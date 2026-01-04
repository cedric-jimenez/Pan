import { NextRequest, NextResponse } from "next/server"
import { csrfMiddleware } from "@/lib/csrf"
import { getRateLimiter } from "@/lib/rate-limit"
import { getRateLimitForRoute, isPublicRoute, RATE_LIMITS } from "@/lib/rate-limit-config"

/**
 * Get IP address from request
 */
function getIP(request: NextRequest): string {
  // Try various headers for IP (compatible with proxies/CDNs)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  const cfConnectingIP = request.headers.get("cf-connecting-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP.trim()
  }

  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  // Fallback to a default value
  return "unknown-ip"
}

/**
 * Get user ID from session cookie (simplified)
 * For public routes, returns null
 */
function getUserId(request: NextRequest): string | null {
  try {
    // Get session token from cookies
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value

    if (!sessionToken) {
      return null
    }

    // For now, use the session token as user identifier
    // In production, you might want to decode the JWT to get actual user ID
    return sessionToken
  } catch {
    return null
  }
}

/**
 * Get identifier for rate limiting (user ID or IP)
 */
function getIdentifier(request: NextRequest, pathname: string): string {
  if (isPublicRoute(pathname)) {
    // Public routes: use IP
    return `ip:${getIP(request)}`
  }

  // Authenticated routes: try user ID first, fallback to IP
  const userId = getUserId(request)
  if (userId) {
    return `user:${userId}`
  }

  return `ip:${getIP(request)}`
}

/**
 * Apply rate limiting to the request
 */
async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const method = request.method

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return null
  }

  const rateLimiter = getRateLimiter()

  // 1. Check global rate limit (by IP)
  const globalIdentifier = `global:${getIP(request)}`
  const globalResult = await rateLimiter.check(
    globalIdentifier,
    RATE_LIMITS.global.max,
    RATE_LIMITS.global.window
  )

  if (!globalResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: RATE_LIMITS.global.message,
        retryAfter: globalResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": RATE_LIMITS.global.max.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": globalResult.reset.toString(),
          "Retry-After": globalResult.retryAfter!.toString(),
        },
      }
    )
  }

  // 2. Check route-specific rate limit
  const routeLimit = getRateLimitForRoute(pathname, method)

  if (routeLimit) {
    const identifier = getIdentifier(request, pathname)
    const result = await rateLimiter.check(identifier, routeLimit.max, routeLimit.window)

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: routeLimit.message,
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": result.retryAfter!.toString(),
          },
        }
      )
    }

    // Add rate limit headers to successful responses too
    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", result.limit.toString())
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
    response.headers.set("X-RateLimit-Reset", result.reset.toString())

    // Continue to CSRF check
    const csrfResponse = await csrfMiddleware(request)
    if (csrfResponse) {
      // Preserve rate limit headers on CSRF failure
      csrfResponse.headers.set("X-RateLimit-Limit", result.limit.toString())
      csrfResponse.headers.set("X-RateLimit-Remaining", result.remaining.toString())
      csrfResponse.headers.set("X-RateLimit-Reset", result.reset.toString())
      return csrfResponse
    }

    return response
  }

  // 3. No specific rate limit for this route, just apply CSRF
  const csrfResponse = await csrfMiddleware(request)
  if (csrfResponse) {
    return csrfResponse
  }

  // Add global rate limit headers
  const response = NextResponse.next()
  response.headers.set("X-RateLimit-Limit", RATE_LIMITS.global.max.toString())
  response.headers.set("X-RateLimit-Remaining", globalResult.remaining.toString())
  response.headers.set("X-RateLimit-Reset", globalResult.reset.toString())

  return response
}

/**
 * Next.js Middleware
 * Runs on all requests before they reach the application
 *
 * This middleware:
 * 1. Applies rate limiting to prevent abuse
 * 2. Applies CSRF protection to API routes
 */
export async function middleware(request: NextRequest) {
  // Apply rate limiting and CSRF protection
  const response = await applyRateLimit(request)

  if (response) {
    return response
  }

  // All checks passed, continue to the route
  return NextResponse.next()
}

/**
 * Configure which routes this middleware applies to
 * Currently applies to all API routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
