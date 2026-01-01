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
      orderBy: [
        { takenAt: "desc" },
        { createdAt: "desc" }
      ],
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
      orderBy: [
        { takenAt: "desc" },
        { createdAt: "desc" }
      ],
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
      orderBy: [
        { takenAt: "desc" },
        { createdAt: "desc" }
      ],
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
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=title&sortOrder=asc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [
        { title: "asc" },
        { originalName: "asc" }
      ],
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
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=size&sortOrder=desc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { fileSize: "desc" },
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
    vi.mocked(prisma.photo.findMany).mockResolvedValue([])

    // Create request with sort params
    const request = new Request("http://localhost:3000/api/photos?sortBy=camera&sortOrder=asc")

    // Execute
    await GET(request)

    // Assert
    expect(prisma.photo.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: [
        { cameraModel: "asc" },
        { cameraMake: "asc" }
      ],
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
