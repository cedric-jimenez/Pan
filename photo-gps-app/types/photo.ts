// Photo type from database
export interface Photo {
  id: string
  userId: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  url: string

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

  createdAt: Date | string
  updatedAt: Date | string
}
