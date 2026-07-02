import type { SimilarPhotoResult } from "@/types/identification"

/**
 * A match to an already-catalogued individual, derived from the similar-photo
 * candidates returned by GET /api/photos/[id]/similar.
 */
export interface ExistingMatch {
  individualId: string
  individualName: string
  similarityScore: number
  /** The candidate photo backing this suggestion (for context/thumbnail). */
  photoId: string
}

/**
 * Pick the best existing-individual match among similarity candidates.
 *
 * A candidate qualifies only when the cross-verifier confirmed it as the same
 * individual (`isSame === true`) AND it is already attached to an individual
 * (`individualId` present). We do not trust raw cosine similarity for this
 * judgement — only SIFT-verified matches. Returns the qualifying candidate with
 * the highest `similarityScore`, or `null` when none qualifies.
 */
export function bestExistingMatch(results: SimilarPhotoResult[]): ExistingMatch | null {
  let best: ExistingMatch | null = null

  for (const result of results) {
    if (result.isSame !== true) continue
    if (!result.individualId || !result.individualName) continue

    if (best === null || result.similarityScore > best.similarityScore) {
      best = {
        individualId: result.individualId,
        individualName: result.individualName,
        similarityScore: result.similarityScore,
        photoId: result.id,
      }
    }
  }

  return best
}
