/**
 * Conditional logger that only logs in development environment
 * Prevents sensitive data from being logged in production
 */

const isDevelopment = process.env.NODE_ENV === "development"

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args)
    } else {
      // In production, only log error messages without sensitive details
      console.error("An error occurred. Check monitoring for details.")
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
}
