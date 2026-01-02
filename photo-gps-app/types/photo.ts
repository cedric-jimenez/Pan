// Photo type from database
export interface Photo {
  id: string
  userId: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  url: string // Full image (resized to 800px)
  croppedUrl: string | null // YOLO cropped version (if salamander detected)

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

  createdAt: Date | string
  updatedAt: Date | string
}
