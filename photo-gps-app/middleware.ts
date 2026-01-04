import { NextRequest, NextResponse } from "next/server"
import { csrfMiddleware } from "@/lib/csrf"

/**
 * Next.js Middleware
 * Runs on all requests before they reach the application
 *
 * This middleware:
 * 1. Applies CSRF protection to API routes
 * 2. Can be extended with other security checks
 */
export async function middleware(request: NextRequest) {
  // Apply CSRF protection
  const csrfResponse = await csrfMiddleware(request)

  // If CSRF middleware returns a response, it means validation failed
  if (csrfResponse) {
    return csrfResponse
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
