/**
 * Configurable logger that supports different log levels
 * Set ENABLE_LOGGING=true to enable logs in production
 * Set LOG_LEVEL to control verbosity (error, warn, info, debug)
 */

const isDevelopment = process.env.NODE_ENV === "development"
const enableLogging = process.env.ENABLE_LOGGING === "true" || isDevelopment
const logLevel = process.env.LOG_LEVEL || "info"

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const currentLevel = LOG_LEVELS[logLevel as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info

export const logger = {
  log: (...args: unknown[]) => {
    if (enableLogging && currentLevel >= LOG_LEVELS.info) {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (enableLogging && currentLevel >= LOG_LEVELS.warn) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors
    if (enableLogging) {
      console.error(...args)
    } else {
      // In production with logging disabled, only log generic message
      console.error("An error occurred. Check monitoring for details.")
    }
  },

  info: (...args: unknown[]) => {
    if (enableLogging && currentLevel >= LOG_LEVELS.info) {
      console.info(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (enableLogging && currentLevel >= LOG_LEVELS.debug) {
      console.debug(...args)
    }
  },
}
