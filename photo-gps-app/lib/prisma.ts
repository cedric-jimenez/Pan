import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in development to prevent sensitive data exposure
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "info", "warn", "error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
