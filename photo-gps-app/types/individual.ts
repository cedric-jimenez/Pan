// Individual type from database
export interface Individual {
  id: string
  name: string
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

// Individual with photo count
export interface IndividualWithCount extends Individual {
  photoCount: number
}

// Photo as returned by GET /api/individuals/[id] (subset of the full Photo model)
export interface IndividualPhoto {
  id: string
  url: string
  croppedUrl: string | null
  segmentedUrl: string | null
  title: string | null
  description: string | null
  takenAt: Date | string | null
  latitude: number | null
  longitude: number | null
  cameraMake: string | null
  cameraModel: string | null
  aperture: string | null
  shutterSpeed: string | null
  iso: number | null
  focalLength: string | null
}

// Individual with photos
export interface IndividualWithPhotos extends Individual {
  photoCount: number
  photos: IndividualPhoto[]
}
