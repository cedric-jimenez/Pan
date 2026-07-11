// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/blob", () => ({
  uploadToBlob: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const toBufferMock = vi.fn()
const withMetadataMock = vi.fn()
const jpegMock = vi.fn(() => ({ toBuffer: toBufferMock }))
const resizeMock = vi.fn(() => ({ jpeg: jpegMock, withMetadata: withMetadataMock }))

vi.mock("sharp", () => ({
  default: vi.fn(() => ({ resize: resizeMock })),
}))

import sharp from "sharp"
import { uploadToBlob } from "@/lib/blob"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  getRailwayTimeoutMs,
  postFormDataToRailway,
  compressImage,
  processCropAndUpload,
  processSegmentAndEmbed,
  storeEmbedding,
  clearEmbedding,
} from "@/lib/photo-pipeline"

global.fetch = vi.fn()

function jsonResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => data } as Response
}

describe("getRailwayTimeoutMs", () => {
  it("defaults to API_TIMEOUTS.DEFAULT_TIMEOUT_MS", () => {
    vi.stubEnv("YOLO_TIMEOUT_MS", "")
    delete process.env.YOLO_TIMEOUT_MS
    expect(getRailwayTimeoutMs()).toBe(10000)
    vi.unstubAllEnvs()
  })

  it("uses YOLO_TIMEOUT_MS when set", () => {
    vi.stubEnv("YOLO_TIMEOUT_MS", "5000")
    expect(getRailwayTimeoutMs()).toBe(5000)
    vi.unstubAllEnvs()
  })
})

describe("postFormDataToRailway", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("RAILWAY_API_URL", "https://railway.example.com")
  })

  it("returns an error when RAILWAY_API_URL is not configured", async () => {
    vi.unstubAllEnvs()
    delete process.env.RAILWAY_API_URL

    const result = await postFormDataToRailway("/embed", new FormData())
    expect(result).toEqual({ ok: false, error: "Railway URL not configured" })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns ok:true with the parsed JSON on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ detected: true }))

    const result = await postFormDataToRailway("/crop-salamander", new FormData(), "?x=1")
    expect(result).toEqual({ ok: true, data: { detected: true } })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://railway.example.com/crop-salamander?x=1",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("returns ok:false with the status on a non-OK response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({}, false))

    const result = await postFormDataToRailway("/embed", new FormData())
    expect(result).toEqual({ ok: false, error: "Railway API error: 500" })
  })

  it("returns 'Timeout' when the request aborts", async () => {
    const abortError = new Error("aborted")
    abortError.name = "AbortError"
    vi.mocked(global.fetch).mockRejectedValue(abortError)

    const result = await postFormDataToRailway("/embed", new FormData())
    expect(result).toEqual({ ok: false, error: "Timeout" })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("returns the error message on a generic network failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network down"))

    const result = await postFormDataToRailway("/embed", new FormData())
    expect(result).toEqual({ ok: false, error: "Network down" })
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe("compressImage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toBufferMock.mockResolvedValue(Buffer.from("compressed"))
  })

  it("resizes to the given dimensions and applies JPEG quality", async () => {
    const buffer = Buffer.from("original")
    const result = await compressImage(buffer, { maxWidth: 400, maxHeight: 400, quality: 70 })

    expect(sharp).toHaveBeenCalledWith(buffer)
    expect(resizeMock).toHaveBeenCalledWith(400, 400, { fit: "inside", withoutEnlargement: true })
    expect(jpegMock).toHaveBeenCalledWith({ quality: 70 })
    expect(withMetadataMock).not.toHaveBeenCalled()
    expect(result).toEqual(Buffer.from("compressed"))
  })

  it("uses the default full-image size when no options are given", async () => {
    await compressImage(Buffer.from("original"))
    expect(resizeMock).toHaveBeenCalledWith(600, 600, { fit: "inside", withoutEnlargement: true })
  })

  it("preserves EXIF metadata when keepMetadata is true", async () => {
    withMetadataMock.mockReturnValue({ jpeg: jpegMock })
    await compressImage(Buffer.from("original"), { keepMetadata: true })
    expect(withMetadataMock).toHaveBeenCalled()
  })
})

describe("processCropAndUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("RAILWAY_API_URL", "https://railway.example.com")
    toBufferMock.mockResolvedValue(Buffer.from("compressed-crop"))
  })

  it("reports no detection when Railway finds no salamander", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ detected: false, bounding_box: null })
    )

    const result = await processCropAndUpload(Buffer.from("photo"), "photo.jpg")

    expect(result).toEqual({
      croppedBlobUrl: null,
      croppedFileSize: null,
      isCropped: false,
      cropConfidence: null,
      salamanderDetected: false,
    })
    expect(uploadToBlob).not.toHaveBeenCalled()
  })

  it("treats a Railway error the same as no detection", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Railway is down"))

    const result = await processCropAndUpload(Buffer.from("photo"), "photo.jpg")

    expect(result.salamanderDetected).toBe(false)
    expect(result.isCropped).toBe(false)
    expect(uploadToBlob).not.toHaveBeenCalled()
  })

  it("compresses and uploads the crop when a salamander is detected", async () => {
    const base64Image = Buffer.from("cropped-bytes").toString("base64")
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        detected: true,
        cropped_image: `data:image/jpeg;base64,${base64Image}`,
        bounding_box: { confidence: 0.87 },
      })
    )
    vi.mocked(uploadToBlob).mockResolvedValue("https://r2.example.com/photo-cropped.jpg")

    const result = await processCropAndUpload(Buffer.from("photo"), "photo.jpg")

    expect(result).toEqual({
      croppedBlobUrl: "https://r2.example.com/photo-cropped.jpg",
      croppedFileSize: Buffer.from("compressed-crop").length,
      isCropped: true,
      cropConfidence: 0.87,
      salamanderDetected: true,
    })
    expect(uploadToBlob).toHaveBeenCalledTimes(1)
    const uploadedFile = vi.mocked(uploadToBlob).mock.calls[0][0] as File
    expect(uploadedFile.name).toBe("photo-cropped.jpg")
  })
})

describe("processSegmentAndEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("RAILWAY_API_URL", "https://railway.example.com")
    toBufferMock.mockResolvedValue(Buffer.from("compressed-segment"))
  })

  it("short-circuits without calling Railway when no salamander was detected", async () => {
    const result = await processSegmentAndEmbed(Buffer.from("photo"), "photo.jpg", false)

    expect(result).toEqual({
      segmentedBlobUrl: null,
      segmentedFileSize: null,
      segmentedEmbedding: null,
      embeddingDim: null,
      embedModel: null,
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(uploadToBlob).not.toHaveBeenCalled()
  })

  it("returns empty result when segmentation finds nothing", async () => {
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse({ detected: false }))

    const result = await processSegmentAndEmbed(Buffer.from("photo"), "photo.jpg", true)

    expect(result.segmentedBlobUrl).toBeNull()
    expect(uploadToBlob).not.toHaveBeenCalled()
  })

  it("segments, embeds, and uploads on a full success path", async () => {
    const segmentedBase64 = Buffer.from("segmented-bytes").toString("base64")
    const embedding = Array.from({ length: 384 }, (_, i) => i / 384)

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          detected: true,
          segmented_image: `data:image/jpeg;base64,${segmentedBase64}`,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, embedding, embedding_dim: 384, model: "dinov2" })
      )
    vi.mocked(uploadToBlob).mockResolvedValue("https://r2.example.com/photo-segmented.jpg")

    const result = await processSegmentAndEmbed(Buffer.from("photo"), "photo.jpg", true)

    expect(result).toEqual({
      segmentedBlobUrl: "https://r2.example.com/photo-segmented.jpg",
      segmentedFileSize: Buffer.from("compressed-segment").length,
      segmentedEmbedding: embedding,
      embeddingDim: 384,
      embedModel: "dinov2",
    })
    const uploadedFile = vi.mocked(uploadToBlob).mock.calls[0][0] as File
    expect(uploadedFile.name).toBe("photo-segmented.jpg")
  })

  it("still uploads the segmented image when embedding fails", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          detected: true,
          segmented_image: `data:image/jpeg;base64,${Buffer.from("x").toString("base64")}`,
        })
      )
      .mockRejectedValueOnce(new Error("embed service down"))
    vi.mocked(uploadToBlob).mockResolvedValue("https://r2.example.com/photo-segmented.jpg")

    const result = await processSegmentAndEmbed(Buffer.from("photo"), "photo.jpg", true)

    expect(result.segmentedBlobUrl).toBe("https://r2.example.com/photo-segmented.jpg")
    expect(result.segmentedEmbedding).toBeNull()
  })
})

describe("storeEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("no-ops and returns false for a null embedding", async () => {
    const result = await storeEmbedding("photo-1", null)
    expect(result).toBe(false)
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled()
  })

  it("rejects a mismatched embedding dimension without touching the DB", async () => {
    const result = await storeEmbedding("photo-1", [1, 2, 3])
    expect(result).toBe(false)
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ expected: 384, received: 3 })
    )
  })

  it("stores a correctly-sized embedding as a pgvector literal", async () => {
    const embedding = Array.from({ length: 384 }, () => 0.5)
    const result = await storeEmbedding("photo-1", embedding)

    expect(result).toBe(true)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
      `[${embedding.join(",")}]`,
      "photo-1"
    )
  })
})

describe("clearEmbedding", () => {
  it("clears the embedding column for the given photo", async () => {
    vi.clearAllMocks()
    await clearEmbedding("photo-1")
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      `UPDATE "Photo" SET embedding = NULL WHERE id = $1`,
      "photo-1"
    )
  })
})
