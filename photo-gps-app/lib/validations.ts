import { z } from "zod"
import { FILE_VALIDATION, AUTH } from "./constants"

/**
 * Validation schemas for API routes using Zod
 * Ensures data integrity and type safety across the application
 */

// User registration schema
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(AUTH.MIN_PASSWORD_LENGTH, `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`),
  name: z.string().max(FILE_VALIDATION.MAX_NAME_LENGTH).optional().nullable(),
})

// Photo update schema
export const photoUpdateSchema = z.object({
  title: z.string().max(FILE_VALIDATION.MAX_TITLE_LENGTH, "Title is too long").optional().nullable(),
  description: z
    .string()
    .max(FILE_VALIDATION.MAX_DESCRIPTION_LENGTH, "Description is too long")
    .optional()
    .nullable(),
})

// Bulk delete schema
export const bulkDeleteSchema = z.object({
  photoIds: z
    .array(z.string().uuid("Invalid photo ID"))
    .min(1, "At least one photo ID is required")
    .max(100, "Cannot delete more than 100 photos at once"),
})

// Query parameters schemas
export const photoQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(["date", "title", "size", "camera"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().max(200).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
})

/**
 * Helper function to validate data against a schema
 * Returns parsed data on success or throws ZodError on failure
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Safe validation that returns a result object instead of throwing
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
