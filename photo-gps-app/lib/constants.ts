/**
 * Configuration constants for the application
 */

// Image processing configuration
export const IMAGE_CONFIG = {
  // Upload constraints
  MAX_UPLOAD_SIZE_MB: 4,
  MAX_UPLOAD_SIZE_BYTES: 4 * 1024 * 1024,

  // Image compression
  TARGET_SIZE_MB: 3.5,
  TARGET_SIZE_BYTES: 3.5 * 1024 * 1024,
  COMPRESSION_QUALITY: 70,
  COMPRESSION_QUALITY_HIGH: 80,

  // Image dimensions
  FULL_IMAGE_SIZE: 600,
  CROPPED_IMAGE_SIZE: 400,
  THUMBNAIL_SIZE: 800,
} as const

// API timeouts
export const API_TIMEOUTS = {
  DEFAULT_TIMEOUT_MS: 10000,
  RAILWAY_TIMEOUT_MS: 60000,
  UPLOAD_TIMEOUT_MS: 30000,
} as const

// Pagination
export const PAGINATION = {
  PHOTOS_PER_PAGE: 20,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const

// YOLO/Crop detection
export const CROP_DETECTION = {
  MIN_CONFIDENCE: 0.5,
  HIGH_CONFIDENCE: 0.7,
  ENABLED: true,
} as const

// File validation
export const FILE_VALIDATION = {
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_NAME_LENGTH: 100,
} as const

// Storage
export const STORAGE = {
  CACHE_DURATION_HOURS: 24,
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,
} as const

// Authentication
export const AUTH = {
  MIN_PASSWORD_LENGTH: 6, // TODO: Increase to 12 in security improvements
  SESSION_MAX_AGE_DAYS: 30,
  SESSION_MAX_AGE_SECONDS: 30 * 24 * 60 * 60,
} as const

// Rate Limiting
export const RATE_LIMIT_WINDOWS = {
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_MINUTE: 60 * 1000,
} as const

export const RATE_LIMIT_MAX = {
  REGISTER: 5, // per 15 minutes
  LOGIN: 10, // per 15 minutes
  UPLOAD_HOURLY: 60, // per hour
  UPLOAD_DAILY: 200, // per day
  MODIFY: 100, // per hour
  BULK_DELETE: 20, // per hour
  GLOBAL: 200, // per minute
} as const
