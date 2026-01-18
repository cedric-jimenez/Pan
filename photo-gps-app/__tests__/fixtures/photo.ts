import { Photo } from "@prisma/client"

/**
 * Creates a complete mock Photo object with all required fields.
 * Use this to ensure test fixtures stay in sync with schema changes.
 */
export function createMockPhoto(overrides: Partial<Photo> = {}): Photo {
  const now = new Date()
  return {
    id: "photo-1",
    userId: "user-123",
    filename: "photo1.jpg",
    originalName: "vacation.jpg",
    fileSize: 1000,
    mimeType: "image/jpeg",
    url: "https://blob.vercel-storage.com/photo1.jpg",
    croppedUrl: null,
    segmentedUrl: null,
    latitude: 48.8566,
    longitude: 2.3522,
    takenAt: new Date("2024-01-15"),
    cameraMake: "Canon",
    cameraModel: "EOS R5",
    iso: 400,
    aperture: "f/2.8",
    shutterSpeed: "1/250s",
    focalLength: "50mm",
    title: "Paris Trip",
    description: "Eiffel Tower",
    isCropped: false,
    cropConfidence: null,
    salamanderDetected: true,
    embeddingDim: null,
    embedModel: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Creates a minimal mock Photo (no GPS, no camera info)
 */
export function createMinimalMockPhoto(overrides: Partial<Photo> = {}): Photo {
  return createMockPhoto({
    id: "photo-minimal",
    latitude: null,
    longitude: null,
    cameraMake: null,
    cameraModel: null,
    iso: null,
    aperture: null,
    shutterSpeed: null,
    focalLength: null,
    title: null,
    description: null,
    ...overrides,
  })
}
