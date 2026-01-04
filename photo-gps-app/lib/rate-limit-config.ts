/**
 * Rate Limit Configuration
 * Defines limits for different routes and operations
 */

export interface RateLimitConfig {
  max: number // Maximum requests allowed
  window: number // Time window in milliseconds
  message: string // Error message in French
}

/**
 * Rate limit configurations by route type
 */
export const RATE_LIMITS = {
  // Public routes (by IP)
  register: {
    max: 5,
    window: 15 * 60 * 1000, // 15 minutes
    message: "Trop de tentatives d'inscription. Réessayez dans 15 minutes.",
  },

  login: {
    max: 10,
    window: 15 * 60 * 1000, // 15 minutes
    message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
  },

  // Authenticated routes (by user ID)
  upload: {
    max: 60,
    window: 60 * 60 * 1000, // 1 hour
    message: "Limite d'upload atteinte (60 photos par heure). Réessayez plus tard.",
  },

  uploadDaily: {
    max: 200,
    window: 24 * 60 * 60 * 1000, // 24 hours
    message: "Limite d'upload journalière atteinte (200 photos par jour).",
  },

  modify: {
    max: 100,
    window: 60 * 60 * 1000, // 1 hour
    message: "Trop de modifications. Réessayez dans une heure.",
  },

  bulkDelete: {
    max: 20,
    window: 60 * 60 * 1000, // 1 hour
    message: "Trop de suppressions en masse. Réessayez dans une heure.",
  },

  // Global limit (by IP)
  global: {
    max: 200,
    window: 60 * 1000, // 1 minute
    message: "Trop de requêtes. Veuillez ralentir.",
  },
} as const

/**
 * Get rate limit config for a specific route
 */
export function getRateLimitForRoute(
  pathname: string,
  method: string
): RateLimitConfig | null {
  // Register
  if (pathname === "/api/register" && method === "POST") {
    return RATE_LIMITS.register
  }

  // Login (NextAuth)
  if (pathname.startsWith("/api/auth/callback") && method === "POST") {
    return RATE_LIMITS.login
  }

  // Upload
  if (pathname === "/api/photos/upload" && method === "POST") {
    return RATE_LIMITS.upload
  }

  // Bulk delete
  if (pathname === "/api/photos/bulk-delete" && method === "POST") {
    return RATE_LIMITS.bulkDelete
  }

  // Modify photo (update or delete)
  if (pathname.match(/^\/api\/photos\/[^/]+$/) && ["PATCH", "DELETE"].includes(method)) {
    return RATE_LIMITS.modify
  }

  return null
}

/**
 * Check if a route is public (uses IP for identification)
 */
export function isPublicRoute(pathname: string): boolean {
  return pathname === "/api/register" || pathname.startsWith("/api/auth/")
}
