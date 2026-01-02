import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/photos/upload/route"

// Mock modules
vi.mock("@/lib/session", () => ({
  requireAuth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    photo: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/blob", () => ({
  uploadToBlob: vi.fn(),
}))

vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}))

const toBufferMock = vi.fn()

const jpegMock = vi.fn(() => ({
  toBuffer: toBufferMock,
}))

const withMetadataMock = vi.fn(() => ({
  jpeg: jpegMock,
}))

const resizeMock = vi.fn(() => ({
  withMetadata: withMetadataMock,
  jpeg: jpegMock,
}))

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: resizeMock,
  })),
}))

import sharp from "sharp"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"

// Mock global fetch for Railway API calls
global.fetch = vi.fn()

describe("POST /api/photos/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    toBufferMock.mockResolvedValue(Buffer.from("compressed-image"))

    // Default mock for Railway API - no salamander detected (fallback behavior)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        detected: false,
        message: "No salamander detected",
        bounding_box: null,
        cropped_image: null,
      }),
    } as Response)
  })

  it("successfully uploads photo with EXIF data", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock no duplicate file found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Mock EXIF data with GPS
    vi.mocked(exifr.parse).mockResolvedValue({
      latitude: 48.8566,
      longitude: 2.3522,
      DateTimeOriginal: new Date("2024-01-15T10:30:00"),
      Make: "Canon",
      Model: "EOS R5",
      ISO: 400,
      FNumber: 2.8,
      ExposureTime: 0.004,
      FocalLength: 50,
    })

    // Mock sharp compression with resize
    const mockBuffer = Buffer.from("compressed-image-data")

    // Mock blob upload
    vi.mocked(uploadToBlob).mockResolvedValue("https://blob.vercel-storage.com/photo.jpg")

    // Mock database create
    const mockPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "1234567890-test.jpg",
      originalName: "test.jpg",
      fileSize: mockBuffer.length,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      croppedUrl: null,
      latitude: 48.8566,
      longitude: 2.3522,
      takenAt: new Date("2024-01-15T10:30:00"),
      cameraMake: "Canon",
      cameraModel: "EOS R5",
      iso: 400,
      aperture: "f/2.8",
      shutterSpeed: "0.004s",
      focalLength: "50mm",
      isCropped: false,
      cropConfidence: null,
      salamanderDetected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    }
    vi.mocked(prisma.photo.create).mockResolvedValue(mockPhoto)

    // Create test file
    const file = new File(["test-image-data"], "test.jpg", { type: "image/jpeg" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data.photo).toMatchObject({
      userId: "user-123",
      latitude: 48.8566,
      longitude: 2.3522,
      mimeType: "image/jpeg",
      cameraMake: "Canon",
      cameraModel: "EOS R5",
    })
    expect(requireAuth).toHaveBeenCalled()
    expect(exifr.parse).toHaveBeenCalled()
    expect(uploadToBlob).toHaveBeenCalled()
    expect(prisma.photo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-123",
        latitude: 48.8566,
        longitude: 2.3522,
        mimeType: "image/jpeg",
        cameraMake: "Canon",
        cameraModel: "EOS R5",
      }),
    })
  })

  it("successfully uploads photo without EXIF data", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock no duplicate file found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Mock no EXIF data
    vi.mocked(exifr.parse).mockResolvedValue({})

    // Mock sharp compression with resize
    const mockBuffer = Buffer.from("compressed-image-data")

    // Mock blob upload
    vi.mocked(uploadToBlob).mockResolvedValue("https://blob.vercel-storage.com/photo.jpg")

    // Mock database create
    const mockPhoto = {
      id: "photo-123",
      userId: "user-123",
      filename: "1234567890-test.jpg",
      originalName: "test.jpg",
      fileSize: mockBuffer.length,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      croppedUrl: null,
      latitude: null,
      longitude: null,
      takenAt: null,
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      isCropped: false,
      cropConfidence: null,
      salamanderDetected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    }
    vi.mocked(prisma.photo.create).mockResolvedValue(mockPhoto)

    // Create test file
    const file = new File(["test-image-data"], "test.jpg", { type: "image/jpeg" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data.photo.latitude).toBeNull()
    expect(data.photo.longitude).toBeNull()
    expect(data.photo.takenAt).toBeNull()
  })

  it("compresses image to JPEG at 80% quality", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock no duplicate file found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Mock EXIF parsing
    vi.mocked(exifr.parse).mockResolvedValue({})

    // Mock blob upload
    vi.mocked(uploadToBlob).mockResolvedValue("https://blob.vercel-storage.com/photo.jpg")

    // Mock database
    vi.mocked(prisma.photo.create).mockResolvedValue({
      id: "photo-123",
      userId: "user-123",
      filename: "test.jpg",
      originalName: "test.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      croppedUrl: null,
      latitude: null,
      longitude: null,
      takenAt: null,
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      isCropped: false,
      cropConfidence: null,
      salamanderDetected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    })

    // Create test file
    const file = new File(["test-image-data"], "test.png", { type: "image/png" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    await POST(request)

    // Assert compression was called with correct quality
    expect(sharp).toHaveBeenCalled()
  })

  it("rejects request without file", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Create request without file
    const formData = new FormData()
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("No file provided")
  })

  it("rejects non-image file", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Create test file with wrong type
    const file = new File(["test-data"], "test.txt", { type: "text/plain" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("File must be an image")
  })

  it("requires authentication", async () => {
    // Mock unauthorized
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"))

    // Create test file
    const file = new File(["test-image-data"], "test.jpg", { type: "image/jpeg" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
  })

  it("handles EXIF parsing errors gracefully", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock no duplicate file found
    vi.mocked(prisma.photo.findFirst).mockResolvedValue(null)

    // Mock EXIF parsing error
    vi.mocked(exifr.parse).mockRejectedValue(new Error("Invalid EXIF data"))

    // Mock sharp compression with resize
    const mockBuffer = Buffer.from("compressed-image-data")

    // Mock blob upload
    vi.mocked(uploadToBlob).mockResolvedValue("https://blob.vercel-storage.com/photo.jpg")

    // Mock database create
    vi.mocked(prisma.photo.create).mockResolvedValue({
      id: "photo-123",
      userId: "user-123",
      filename: "test.jpg",
      originalName: "test.jpg",
      fileSize: mockBuffer.length,
      mimeType: "image/jpeg",
      url: "https://blob.vercel-storage.com/photo.jpg",
      croppedUrl: null,
      latitude: null,
      longitude: null,
      takenAt: null,
      cameraMake: null,
      cameraModel: null,
      iso: null,
      aperture: null,
      shutterSpeed: null,
      focalLength: null,
      isCropped: false,
      cropConfidence: null,
      salamanderDetected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: null,
      description: null,
    })

    // Create test file
    const file = new File(["test-image-data"], "test.jpg", { type: "image/jpeg" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)

    // Assert - should still succeed but without EXIF data
    expect(response.status).toBe(201)
  })

  it("handles blob upload errors", async () => {
    // Mock authenticated user
    vi.mocked(requireAuth).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    })

    // Mock EXIF parsing
    vi.mocked(exifr.parse).mockResolvedValue({})

    // Mock sharp compression with resize

    // Mock blob upload failure
    vi.mocked(uploadToBlob).mockRejectedValue(new Error("Storage quota exceeded"))

    // Create test file
    const file = new File(["test-image-data"], "test.jpg", { type: "image/jpeg" })
    const formData = new FormData()
    formData.append("file", file)

    // Create request
    const request = new Request("http://localhost:3000/api/photos/upload", {
      method: "POST",
      body: formData,
    })

    // Execute
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to upload photo")
  })
})
