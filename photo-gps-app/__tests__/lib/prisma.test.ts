import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

type GlobalWithPrisma = typeof globalThis & { prisma?: unknown }

describe("lib/prisma", () => {
  beforeEach(() => {
    vi.resetModules()
    delete (globalThis as GlobalWithPrisma).prisma
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete (globalThis as GlobalWithPrisma).prisma
  })

  it("exports a PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma")
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe("function")
  })

  it("caches the client on globalThis outside production", async () => {
    vi.stubEnv("NODE_ENV", "test")
    const { prisma } = await import("@/lib/prisma")
    expect((globalThis as GlobalWithPrisma).prisma).toBe(prisma)
  })

  it("reuses the cached client across re-imports", async () => {
    vi.stubEnv("NODE_ENV", "test")
    const first = await import("@/lib/prisma")
    vi.resetModules()
    const second = await import("@/lib/prisma")
    expect(second.prisma).toBe(first.prisma)
  })

  it("does not cache the client on globalThis in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { prisma } = await import("@/lib/prisma")
    expect(prisma).toBeDefined()
    expect((globalThis as GlobalWithPrisma).prisma).toBeUndefined()
  })
})
