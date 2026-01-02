import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/photos/route"
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/photos/[id]/route"

// Mock modules
vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock("@/lib/blob", () => ({
  deleteFromBlob: vi.fn(),
}))

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { deleteFromBlob } from "@/lib/blob"

describe("GET /api/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches all user photos", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    const mockPhotos = [
      {
        id: "photo-1",
        userId: "user-123",
        filename: "photo1.jpg",
        originalName: "vacation.jpg",
        fileSize: 1000,
        mimeType: "image/jpeg",
        url: "https://blob.vercel-storage.com/photo1.jpg",
        latitude: 48.8566,
        longitude: 2.3522,
        takenAt: new Date("2024-01-15"),
        cameraMake: "Canon",
        cameraModel: "EOS R5",
        iso: 400,
        aperture: "f/2.8",
        shutterSpeed: "1/250s",
        focalLength: "50mm",
        createdAt: new Date(),
        updatedAt: new Date(),
        title: "Paris Trip",
        description: "Eiffel Tower",
      },
      {
        id: "photo-2",
        userId: "user-123",
        filename: "photo2.jpg",
        originalName: "sunset.jpg",
        fileSize: 1500,
        mimeType: "image/jpeg",
        url: "https://blob.vercel-storage.com/photo2.jpg",
        latitude: null,
        longitude: null,
        takenAt: new Date("2024-01-14"),
        cameraMake: null,
        cameraModel: null,
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: null,
        description: null,
      },
    ]
    vi.mocked(prisma.photo.count).mockResolvedValue(2)
    vi.mocked(prisma.photo.findMany).mockResolvedValue(mockPhotos)

    // Create request
    const request = new Request("http://localhost:3000/api/photos")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.photos).toHaveLength(2)
    expect(data.photos[0]).toMatchObject({
      userId: "user-123",
      latitude: 48.8566,
      longitude: 2.3522,
      title: "Paris Trip",
    })
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("fetches photos with date range filter", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with date filters
    const request = new Request(
      "http://localhost:3000/api/photos?startDate=2024-01-01&endDate=2024-01-31"
    )

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        takenAt: {
          gte: new Date("2024-01-01"),
          lte: new Date("2024-01-31"),
        },
      },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("fetches photos with only start date", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with start date only
    const request = new Request("http://localhost:3000/api/photos?startDate=2024-01-01")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        takenAt: {
          gte: new Date("2024-01-01"),
        },
      },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("requires authentication", async () => {
    // Mock unauthorized
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    // Create request
    const request = new Request("http://localhost:3000/api/photos")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("sorts photos by title ascending", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=title&sortOrder=asc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ title: "asc" }, { originalName: "asc" }],
      skip: 0,
      take: 20,
    })
  })

  it("sorts photos by size descending", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=size&sortOrder=desc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { fileSize: "desc" },
      skip: 0,
      take: 20,
    })
  })

  it("sorts photos by camera model", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=camera&sortOrder=asc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ cameraModel: "asc" }, { cameraMake: "asc" }],
      skip: 0,
      take: 20,
    })
  })

  it("searches photos by title", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with search param
    const request = new Request("http://localhost:3000/api/photos?search=Paris")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        OR: [
          { title: { contains: "Paris", mode: "insensitive" } },
          { originalName: { contains: "Paris", mode: "insensitive" } },
          { description: { contains: "Paris", mode: "insensitive" } },
          { cameraMake: { contains: "Paris", mode: "insensitive" } },
          { cameraModel: { contains: "Paris", mode: "insensitive" } },
        ],
      },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("searches photos case-insensitively", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with lowercase search
    const request = new Request("http://localhost:3000/api/photos?search=canon")

    // Execute
    await GET(request)

    // Assert - should search with mode: 'insensitive'
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        OR: [
          { title: { contains: "canon", mode: "insensitive" } },
          { originalName: { contains: "canon", mode: "insensitive" } },
          { description: { contains: "canon", mode: "insensitive" } },
          { cameraMake: { contains: "canon", mode: "insensitive" } },
          { cameraModel: { contains: "canon", mode: "insensitive" } },
        ],
      },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("combines search with sorting", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with search and sort params
    const request = new Request(
      "http://localhost:3000/api/photos?search=sunset&sortBy=title&sortOrder=asc"
    )

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        OR: [
          { title: { contains: "sunset", mode: "insensitive" } },
          { originalName: { contains: "sunset", mode: "insensitive" } },
          { description: { contains: "sunset", mode: "insensitive" } },
          { cameraMake: { contains: "sunset", mode: "insensitive" } },
          { cameraModel: { contains: "sunset", mode: "insensitive" } },
        ],
      },
      orderBy: [{ title: "asc" }, { originalName: "asc" }],
      skip: 0,
      take: 20,
    })
  })

  it("ignores empty search query", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with empty search
    const request = new Request("http://localhost:3000/api/photos?search=   ")

    // Execute
    await GET(request)

    // Assert - should not include OR clause for empty/whitespace search
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("combines search with date range filter", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos
    vi.mocked(prisma.photo.count).mockResolvedValue(0)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with search and date range
    const request = new Request(
      "http://localhost:3000/api/photos?search=vacation&startDate=2024-01-01&endDate=2024-12-31"
    )

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        takenAt: {
          gte: new Date("2024-01-01"),
          lte: new Date("2024-12-31"),
        },
        OR: [
          { title: { contains: "vacation", mode: "insensitive" } },
          { originalName: { contains: "vacation", mode: "insensitive" } },
          { description: { contains: "vacation", mode: "insensitive" } },
          { cameraMake: { contains: "vacation", mode: "insensitive" } },
          { cameraModel: { contains: "vacation", mode: "insensitive" } },
        ],
      },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
  })

  it("paginates results with default page 1 and limit 20", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos and count
    vi.mocked(prisma.photo.count).mockResolvedValue(50)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request without pagination params
    const request = new Request("http://localhost:3000/api/photos")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(prisma.photo.count).toHaveBeenCalledWith({
      where: { userId: "user-123" },
    })
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 0,
      take: 20,
    })
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 50,
      hasMore: true,
    })
  })

  it("paginates to page 2", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos and count
    vi.mocked(prisma.photo.count).mockResolvedValue(50)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with page 2
    const request = new Request("http://localhost:3000/api/photos?page=2")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert - should skip 20 (page 1)
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 20,
      take: 20,
    })
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.hasMore).toBe(true)
  })

  it("paginates to page 3 with custom limit", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photos and count
    vi.mocked(prisma.photo.count).mockResolvedValue(100)
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with page 3 and limit 10
    const request = new Request("http://localhost:3000/api/photos?page=3&limit=10")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert - should skip 20 (2 pages * 10 per page)
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      skip: 20,
      take: 10,
    })
    expect(data.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 100,
      hasMore: true,
    })
  })

  it("indicates hasMore is false on last page", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock 15 total photos, requesting page 1 with 20 limit
    vi.mocked(prisma.photo.count).mockResolvedValue(15)
    const mockPhotos = Array(15)
      .fill(null)
      .map((_, i) => ({
        id: `photo-${i}`,
        userId: "user-123",
        filename: `photo${i}.jpg`,
        originalName: `photo${i}.jpg`,
        fileSize: 1000,
        mimeType: "image/jpeg",
        url: `https://blob.vercel-storage.com/photo${i}.jpg`,
        latitude: null,
        longitude: null,
        takenAt: new Date(),
        cameraMake: null,
        cameraModel: null,
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: null,
        description: null,
      }))
    vi.mocked(prisma.photo.findMany).mockResolvedValue(mockPhotos)

    // Create request
    const request = new Request("http://localhost:3000/api/photos")

    // Execute
    const response = await GET(request)
    const data = await response.json()

    // Assert - hasMore should be false since we got all 15 photos
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 15,
      hasMore: false,
    })
  })
})

describe("GET /api/photos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches single photo by ID", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photo
    const mockPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: 48.8566,
      longitude: 2.3522,
      takenAt: new Date("2024-01-15"),
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      iso: 400,
      aperture: "f/2.8",
      shutterSpeed: "1/250s",
      focalLength: "50mm",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Paris Trip",
      description: "Eiffel Tower",
    }
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(mockPhoto)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123")
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.photo).toMatchObject({
      id: "photo-123",
      userId: "user-123",
      latitude: 48.8566,
      longitude: 2.3522,
      title: "Paris Trip",
    })
    expect(prisma.photo.findFirst).toHaveBeenCalledWith({
      where: {
        id: "photo-123",
        userId: "user-123",
      },
    })
  })

  it("returns 404 for non-existent photo", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photo not found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-999")
    const params = Promise.resolve({ id: "photo-999" })

    // Execute
    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
  })

  it("returns 404 for photo belonging to different user", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photo not found (because it belongs to different user)
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-456")
    const params = Promise.resolve({ id: "photo-456" })

    // Execute
    const response = await GET_BY_ID(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
  })
})

describe("PATCH /api/photos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates photo title and description", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock existing photo
    const existingPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: 48.8566,
      longitude: 2.3522,
      takenAt: new Date("2024-01-15"),
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      iso: 400,
      aperture: "f/2.8",
      shutterSpeed: "1/250s",
      focalLength: "50mm",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    }
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(existingPhoto)

    // Mock updated photo
    const updatedPhoto = {
      ...existingPhoto,
      title: "Paris Trip",
      description: "Beautiful view of the Eiffel Tower",
    }
    vi.mocked(prisma.photo.update).mockResolvedValue(updatedPhoto)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "PATCH",
      body: JSON.stringify({
        title: "Paris Trip",
        description: "Beautiful view of the Eiffel Tower",
      }),
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.photo.title).toBe("Paris Trip")
    expect(data.photo.description).toBe("Beautiful view of the Eiffel Tower")
    expect(prisma.photo.update).toHaveBeenCalledWith({
      where: { id: "photo-123" },
      data: {
        title: "Paris Trip",
        description: "Beautiful view of the Eiffel Tower",
      },
    })
  })

  it("updates only title", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock existing photo
    vi.mocked(prisma.photo.findFirst).mockResolvedValue({
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: null,
      longitude: null,
      takenAt: new Date(),
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Old Title",
      description: "Old Description",
    })

    // Mock updated photo
    vi.mocked(prisma.photo.update).mockResolvedValue({
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: null,
      longitude: null,
      takenAt: new Date(),
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "New Title",
      description: "Old Description",
    })

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await PATCH(request, { params })

    // Assert
    expect(response.status).toBe(200)
    expect(prisma.photo.update).toHaveBeenCalled()
  })

  it("returns 404 for non-existent photo", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photo not found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-999", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    })
    const params = Promise.resolve({ id: "photo-999" })

    // Execute
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
    expect(prisma.photo.update).not.toHaveBeenCalled()
  })

  it("requires authentication", async () => {
    // Mock unauthorized
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await PATCH(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })
})

describe("DELETE /api/photos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes photo and blob", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock existing photo
    const mockPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: 48.8566,
      longitude: 2.3522,
      takenAt: new Date("2024-01-15"),
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      iso: 400,
      aperture: "f/2.8",
      shutterSpeed: "1/250s",
      focalLength: "50mm",
      createdAt: new Date(),
      updatedAt: new Date(),
      title: "Paris Trip",
      description: "Eiffel Tower",
    }
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(mockPhoto)

    // Mock blob deletion
    vi.mocked(deleteFromBlob).mockResolvedValue()

    // Mock database deletion
    vi.mocked(prisma.photo.delete).mockResolvedValue(mockPhoto)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(deleteFromBlob).toHaveBeenCalledWith("https://blob.vercel-storage.com/photo.jpg")
    expect(prisma.photo.delete).toHaveBeenCalledWith({
      where: { id: "photo-123" },
    })
  })

  it("continues deletion even if blob deletion fails", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock existing photo
    const mockPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "photo.jpg",
      originalName: "vacation.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      latitude: null,
      longitude: null,
      takenAt: new Date(),
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    }
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(mockPhoto)

    // Mock blob deletion failure
    vi.mocked(deleteFromBlob).mockRejectedValue(new Error("Blob not found"))

    // Mock database deletion
    vi.mocked(prisma.photo.delete).mockResolvedValue(mockPhoto)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert - should still succeed
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.photo.delete).toHaveBeenCalled()
  })

  it("returns 404 for non-existent photo", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock photo not found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-999", {
      method: "DELETE",
    })
    const params = Promise.resolve({ id: "photo-999" })

    // Execute
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Photo not found")
    expect(deleteFromBlob).not.toHaveBeenCalled()
    expect(prisma.photo.delete).not.toHaveBeenCalled()
  })

  it("requires authentication", async () => {
    // Mock unauthorized
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    // Create request
    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    })
    const params = Promise.resolve({ id: "photo-123" })

    // Execute
    const response = await DELETE(request, { params })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })
})
