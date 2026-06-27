// Shape returned by GET /api/photos/[id]/similar — a candidate photo ranked
// against the uploaded query photo, optionally already linked to an individual.
export interface SimilarPhotoResult {
  id: string
  filename: string
  url: string
  croppedUrl: string | null
  segmentedUrl: string | null
  title: string | null
  description: string | null
  takenAt: string | null
  latitude: number | null
  longitude: number | null
  individualId: string | null
  individualName: string | null
  distance: number
  similarityScore: number
  confidence?: string
  isSame?: boolean
}

// One of the individuals returned in a 409 conflict from the confirm endpoint.
export interface ConflictIndividual {
  id: string
  name: string
  photoCount: number
}
