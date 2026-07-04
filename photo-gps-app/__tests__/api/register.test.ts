import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/register/route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

function mockUserCreate() {
  vi.mocked(prisma.user.create).mockImplementation(
    ({ data }) =>
      ({
        id: "user-1",
        email: data.email as string,
        name: (data.name as string | null) ?? null,
        password: data.password as string,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as unknown as ReturnType<typeof prisma.user.create>
  )
}

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/register", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an invalid email", async () => {
    const response = await POST(makeRequest({ email: "not-an-email", password: "longenoughpassword" }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it("rejects a password shorter than the minimum length", async () => {
    const response = await POST(makeRequest({ email: "test@example.com", password: "short" }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Validation failed")
  })

  it("rejects when a user with the same email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: null,
      password: "hashed",
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await POST(
      makeRequest({ email: "test@example.com", password: "longenoughpassword" })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("User already exists")
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it("creates the user with a bcrypt-hashed password and returns 201", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    mockUserCreate()

    const response = await POST(
      makeRequest({ email: "new@example.com", password: "longenoughpassword", name: "New User" })
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.user).toEqual({ id: "user-1", email: "new@example.com", name: "New User" })

    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0]
    expect(createCall.data.email).toBe("new@example.com")
    expect(createCall.data.password).not.toBe("longenoughpassword")
    expect(createCall.data.password).toMatch(/^\$2[aby]\$/) // bcrypt hash prefix
  })

  it("defaults name to null when not provided", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    mockUserCreate()

    const response = await POST(
      makeRequest({ email: "new@example.com", password: "longenoughpassword" })
    )
    const data = await response.json()

    expect(data.user.name).toBeNull()
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB unreachable"))

    const response = await POST(
      makeRequest({ email: "new@example.com", password: "longenoughpassword" })
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Internal server error")
  })
})
