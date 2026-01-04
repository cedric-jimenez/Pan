/**
 * In-Memory Rate Limiter
 * Uses sliding window algorithm for precise rate limiting
 * Compatible with Edge Runtime
 */

interface RequestRecord {
  timestamp: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

export class InMemoryRateLimiter {
  private store: Map<string, RequestRecord[]> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup process (runs every 5 minutes)
    this.startCleanup()
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (IP or user ID)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   */
  async check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get existing requests for this identifier
    let requests = this.store.get(identifier) || []

    // Filter out requests outside the current window (sliding window)
    requests = requests.filter((req) => req.timestamp > windowStart)

    // Calculate remaining and reset time
    const remaining = Math.max(0, limit - requests.length)
    const oldestRequest = requests[0]
    const reset = oldestRequest ? oldestRequest.timestamp + windowMs : now + windowMs

    // Check if limit exceeded
    if (requests.length >= limit) {
      const retryAfter = Math.ceil((reset - now) / 1000) // seconds

      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil(reset / 1000), // Unix timestamp in seconds
        retryAfter,
      }
    }

    // Add current request
    requests.push({ timestamp: now })
    this.store.set(identifier, requests)

    return {
      success: true,
      limit,
      remaining: remaining - 1, // -1 because we just added the current request
      reset: Math.ceil(reset / 1000),
    }
  }

  /**
   * Get current request count for an identifier
   */
  getCount(identifier: string, windowMs: number): number {
    const now = Date.now()
    const windowStart = now - windowMs
    const requests = this.store.get(identifier) || []
    return requests.filter((req) => req.timestamp > windowStart).length
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier)
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    const maxWindow = 24 * 60 * 60 * 1000 // 24 hours (longest window we use)

    for (const [identifier, requests] of this.store.entries()) {
      // Filter out old requests
      const validRequests = requests.filter((req) => now - req.timestamp < maxWindow)

      if (validRequests.length === 0) {
        // No valid requests, remove the entry
        this.store.delete(identifier)
      } else if (validRequests.length < requests.length) {
        // Some requests were removed, update the entry
        this.store.set(identifier, validRequests)
      }
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  /**
   * Stop cleanup process (useful for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get store size (for debugging)
   */
  getStoreSize(): number {
    return this.store.size
  }
}

// Singleton instance
let rateLimiterInstance: InMemoryRateLimiter | null = null

/**
 * Get the global rate limiter instance
 */
export function getRateLimiter(): InMemoryRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new InMemoryRateLimiter()
  }
  return rateLimiterInstance
}
