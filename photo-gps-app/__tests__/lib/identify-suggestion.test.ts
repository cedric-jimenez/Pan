import { describe, it, expect } from "vitest"
import { bestExistingMatch } from "@/lib/identify-suggestion"
import type { SimilarPhotoResult } from "@/types/identification"

function candidate(overrides: Partial<SimilarPhotoResult>): SimilarPhotoResult {
  return {
    id: "p1",
    filename: "p1.jpg",
    url: "u",
    croppedUrl: null,
    segmentedUrl: null,
    title: null,
    description: null,
    takenAt: null,
    latitude: null,
    longitude: null,
    individualId: null,
    individualName: null,
    distance: 0.1,
    similarityScore: 0.5,
    isSame: false,
    ...overrides,
  }
}

describe("bestExistingMatch", () => {
  it("returns null for an empty list", () => {
    expect(bestExistingMatch([])).toBeNull()
  })

  it("ignores isSame candidates that are not linked to an individual", () => {
    const results = [candidate({ isSame: true, individualId: null, individualName: null })]
    expect(bestExistingMatch(results)).toBeNull()
  })

  it("ignores linked candidates that were not verified as the same individual", () => {
    const results = [
      candidate({ isSame: false, individualId: "i1", individualName: "Nebula", similarityScore: 0.9 }),
    ]
    expect(bestExistingMatch(results)).toBeNull()
  })

  it("returns the qualifying candidate with the highest similarity score", () => {
    const results = [
      candidate({
        id: "a",
        isSame: true,
        individualId: "i1",
        individualName: "Nebula",
        similarityScore: 0.6,
      }),
      candidate({
        id: "b",
        isSame: true,
        individualId: "i2",
        individualName: "Ziggy",
        similarityScore: 0.82,
      }),
      candidate({
        id: "c",
        isSame: true,
        individualId: null,
        individualName: null,
        similarityScore: 0.95,
      }),
    ]
    expect(bestExistingMatch(results)).toEqual({
      individualId: "i2",
      individualName: "Ziggy",
      similarityScore: 0.82,
      photoId: "b",
    })
  })

  it("keeps the first candidate on a score tie", () => {
    const results = [
      candidate({
        id: "a",
        isSame: true,
        individualId: "i1",
        individualName: "Nebula",
        similarityScore: 0.7,
      }),
      candidate({
        id: "b",
        isSame: true,
        individualId: "i2",
        individualName: "Ziggy",
        similarityScore: 0.7,
      }),
    ]
    expect(bestExistingMatch(results)?.individualId).toBe("i1")
  })
})
