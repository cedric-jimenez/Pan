import "@testing-library/jest-dom"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
process.env.NEXTAUTH_SECRET = "test-secret"
process.env.NEXTAUTH_URL = "http://localhost:3000"
process.env.DATABASE_URL = "file:./test.db"
