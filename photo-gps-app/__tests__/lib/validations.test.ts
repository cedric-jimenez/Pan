import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
  registerSchema,
  photoUpdateSchema,
  bulkDeleteSchema,
  bulkProcessSchema,
  individualCreateSchema,
  individualQuerySchema,
  identificationConfirmSchema,
  photoQuerySchema,
  validate,
  validateSafe,
} from "@/lib/validations"

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "longenoughpassword" })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "longenoughpassword",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a password shorter than the minimum length", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "short" })
    expect(result.success).toBe(false)
  })
})

describe("photoUpdateSchema", () => {
  it("allows null title/description", () => {
    expect(photoUpdateSchema.safeParse({ title: null, description: null }).success).toBe(true)
  })

  it("allows omitting title/description entirely", () => {
    expect(photoUpdateSchema.safeParse({}).success).toBe(true)
  })

  it("rejects a title over the max length", () => {
    const result = photoUpdateSchema.safeParse({ title: "x".repeat(1000) })
    expect(result.success).toBe(false)
  })
})

describe("bulkDeleteSchema / bulkProcessSchema", () => {
  it("rejects an empty photoIds array", () => {
    expect(bulkDeleteSchema.safeParse({ photoIds: [] }).success).toBe(false)
  })

  it("rejects more than 100 photoIds for bulk delete", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`)
    expect(bulkDeleteSchema.safeParse({ photoIds: ids }).success).toBe(false)
  })

  it("accepts exactly 100 photoIds for bulk delete", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`)
    expect(bulkDeleteSchema.safeParse({ photoIds: ids }).success).toBe(true)
  })

  it("rejects more than 50 photoIds for bulk process", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id-${i}`)
    expect(bulkProcessSchema.safeParse({ photoIds: ids }).success).toBe(false)
  })

  it("rejects an empty string photoId", () => {
    expect(bulkDeleteSchema.safeParse({ photoIds: [""] }).success).toBe(false)
  })
})

describe("individualCreateSchema", () => {
  it("trims the name", () => {
    const result = individualCreateSchema.safeParse({ name: "  Nebula  " })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe("Nebula")
  })

  it("rejects an empty name", () => {
    expect(individualCreateSchema.safeParse({ name: "" }).success).toBe(false)
  })

  it("rejects a name over 100 characters", () => {
    expect(individualCreateSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false)
  })
})

describe("identificationConfirmSchema", () => {
  it("accepts targeting an existing individual", () => {
    const result = identificationConfirmSchema.safeParse({
      photoIds: ["p1"],
      individualId: "i1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts creating a new individual by name", () => {
    const result = identificationConfirmSchema.safeParse({
      photoIds: ["p1"],
      newName: "Nebula",
    })
    expect(result.success).toBe(true)
  })

  it("rejects more than 200 photoIds", () => {
    const ids = Array.from({ length: 201 }, (_, i) => `id-${i}`)
    expect(identificationConfirmSchema.safeParse({ photoIds: ids }).success).toBe(false)
  })

  it("rejects an empty photoIds array", () => {
    expect(identificationConfirmSchema.safeParse({ photoIds: [] }).success).toBe(false)
  })
})

describe.each([
  ["photoQuerySchema", photoQuerySchema],
  ["individualQuerySchema", individualQuerySchema],
])("%s page/limit transform", (_name, schema) => {
  it("defaults page to 1 and limit to 20 when omitted", () => {
    const result = schema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it("defaults page/limit when the string is null", () => {
    const result = schema.safeParse({ page: null, limit: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it("parses valid numeric strings", () => {
    const result = schema.safeParse({ page: "3", limit: "50" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(50)
    }
  })

  it("rejects a zero or negative page", () => {
    expect(schema.safeParse({ page: "0" }).success).toBe(false)
    expect(schema.safeParse({ page: "-1" }).success).toBe(false)
  })

  it("rejects a limit above the max of 100", () => {
    expect(schema.safeParse({ limit: "101" }).success).toBe(false)
  })

  it("rejects a non-numeric page string", () => {
    // "abc" -> parseInt -> NaN, which fails the positive-int check downstream.
    expect(schema.safeParse({ page: "abc" }).success).toBe(false)
  })
})

describe("photoQuerySchema sort/date fields", () => {
  it("defaults sortBy to 'date' and sortOrder to 'desc'", () => {
    const result = photoQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortBy).toBe("date")
      expect(result.data.sortOrder).toBe("desc")
    }
  })

  it("rejects an invalid sortBy value", () => {
    expect(photoQuerySchema.safeParse({ sortBy: "invalid" }).success).toBe(false)
  })

  it("rejects a malformed startDate", () => {
    expect(photoQuerySchema.safeParse({ startDate: "not-a-date" }).success).toBe(false)
  })

  it("accepts a valid ISO startDate", () => {
    expect(
      photoQuerySchema.safeParse({ startDate: "2026-01-01T00:00:00.000Z" }).success
    ).toBe(true)
  })
})

describe("validate", () => {
  it("returns the parsed data on success", () => {
    const data = validate(individualCreateSchema, { name: "Nebula" })
    expect(data).toEqual({ name: "Nebula" })
  })

  it("throws a ZodError on invalid data", () => {
    expect(() => validate(individualCreateSchema, { name: "" })).toThrow(z.ZodError)
  })
})

describe("validateSafe", () => {
  it("returns success:true with data on valid input", () => {
    const result = validateSafe(individualCreateSchema, { name: "Nebula" })
    expect(result).toEqual({ success: true, data: { name: "Nebula" } })
  })

  it("returns success:false with a ZodError on invalid input", () => {
    const result = validateSafe(individualCreateSchema, { name: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeInstanceOf(z.ZodError)
    }
  })
})
