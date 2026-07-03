// Photo type from database
export interface Photo {
  id: string
  userId: string
  individualId: string | null
  filename: string
  originalName: string
  fileSize: number
  croppedFileSize: number | null
  segmentedFileSize: number | null
  mimeType: string
  url: string // Full image (resized to 800px)
  croppedUrl: string | null // YOLO cropped version (if salamander detected)
  segmentedUrl: string | null // Segmented version with background removed (if salamander detected)

  // EXIF data
  latitude: number | null
  longitude: number | null
  takenAt: Date | string | null
  cameraMake: string | null
  cameraModel: string | null
  aperture: string | null
  shutterSpeed: string | null
  iso: number | null
  focalLength: string | null

  // User editable
  title: string | null
  description: string | null

  // YOLO crop metadata
  isCropped: boolean
  cropConfidence: number | null
  salamanderDetected: boolean

  // Individual relationship
  individual?: {
    id: string
    name: string
  } | null

  createdAt: Date | string
  updatedAt: Date | string
}

// A candidate match returned by /api/photos/[id]/similar
export interface SimilarPhoto {
  id: string
  filename: string
  url: string
  croppedUrl: string | null
  segmentedUrl: string | null
  title: string | null
  description: string | null
  takenAt: Date | null
  latitude: number | null
  longitude: number | null
  distance: number
  similarityScore: number
  confidence?: string
  isSame?: boolean
  cosine_similarity?: number
  matches?: number
  inliers?: number
}

// Result of a single photo crop/segment/embed (re)processing run
export interface PhotoProcessResult {
  photoId: string
  success: boolean
  error?: string
  salamanderDetected?: boolean
  hasCropped?: boolean
  hasSegmented?: boolean
  hasEmbedding?: boolean
}
