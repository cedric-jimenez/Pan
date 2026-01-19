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

// Individual with photos
export interface IndividualWithPhotos extends Individual {
  photoCount: number
  photos: {
    id: string
    url: string
    croppedUrl: string | null
    title: string | null
    takenAt: Date | string | null
  }[]
}
