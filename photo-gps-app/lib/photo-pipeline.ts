import sharp from "sharp"
import { uploadToBlob } from "@/lib/blob"
import { prisma } from "@/lib/prisma"
import { IMAGE_CONFIG, API_TIMEOUTS, CROP_DETECTION } from "@/lib/constants"
import { logger } from "@/lib/logger"

const EXPECTED_EMBEDDING_DIM = 384

interface CropApiResult {
  detected: boolean
  croppedBuffer: Buffer | null
  confidence: number | null
  error?: string
}

interface SegmentApiResult {
  detected: boolean
  segmentedBuffer: Buffer | null
  error?: string
}

interface EmbedApiResult {
  success: boolean
  embedding: number[] | null
  embedding_dim: number | null
  model?: string | null
  error?: string
}

export interface CropUploadResult {
  croppedBlobUrl: string | null
  croppedFileSize: number | null
  isCropped: boolean
  cropConfidence: number | null
  salamanderDetected: boolean
}

export interface SegmentEmbedResult {
  segmentedBlobUrl: string | null
  segmentedFileSize: number | null
  segmentedEmbedding: number[] | null
  embeddingDim: number | null
  embedModel: string | null
}

export type RailwayResponse =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

export function getRailwayTimeoutMs(): number {
  return parseInt(process.env.YOLO_TIMEOUT_MS || String(API_TIMEOUTS.DEFAULT_TIMEOUT_MS), 10)
}

/** POST a pre-built FormData to a Railway ML endpoint, handling the timeout/abort/error boilerplate. */
export async function postFormDataToRailway(
  endpoint: string,
  formData: FormData,
  query = ""
): Promise<RailwayResponse> {
  const railwayUrl = process.env.RAILWAY_API_URL
  if (!railwayUrl) {
    return { ok: false, error: "Railway URL not configured" }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), getRailwayTimeoutMs())

  try {
    const response = await fetch(`${railwayUrl}${endpoint}${query}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, error: `Railway API error: ${response.status}` }
    }

    return { ok: true, data: await response.json() }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn(`Railway ${endpoint} timeout after ${getRailwayTimeoutMs()}ms`)
      return { ok: false, error: "Timeout" }
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.warn(`Railway ${endpoint} error: ${message}`)
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}

/** POST a single image buffer to a Railway ML endpoint, handling the FormData/timeout/error boilerplate. */
async function postToRailway(
  endpoint: string,
  buffer: Buffer,
  filename: string,
  query = ""
): Promise<RailwayResponse> {
  const formData = new FormData()
  formData.append("file", new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" }), filename)
  return postFormDataToRailway(endpoint, formData, query)
}

function base64ToBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64")
}

async function callRailwayCrop(buffer: Buffer): Promise<CropApiResult> {
  const confidenceThreshold = parseFloat(
    process.env.YOLO_CONFIDENCE_THRESHOLD || String(CROP_DETECTION.MIN_CONFIDENCE)
  )
  const result = await postToRailway(
    "/crop-salamander",
    buffer,
    "image.jpg",
    `?confidence=${confidenceThreshold}&return_base64=true`
  )

  if (!result.ok) {
    return { detected: false, croppedBuffer: null, confidence: null, error: result.error }
  }

  const data = result.data as { detected?: boolean; cropped_image?: string; bounding_box?: { confidence?: number } }
  const confidence = data.bounding_box?.confidence ?? null

  if (data.detected && data.cropped_image) {
    return { detected: true, croppedBuffer: base64ToBuffer(data.cropped_image), confidence }
  }

  return { detected: false, croppedBuffer: null, confidence }
}

async function callRailwaySegment(buffer: Buffer): Promise<SegmentApiResult> {
  const result = await postToRailway("/segment-salamander", buffer, "image.jpg")

  if (!result.ok) {
    return { detected: false, segmentedBuffer: null, error: result.error }
  }

  const data = result.data as { detected?: boolean; segmented_image?: string }
  if (data.detected && data.segmented_image) {
    return { detected: true, segmentedBuffer: base64ToBuffer(data.segmented_image) }
  }

  return { detected: false, segmentedBuffer: null }
}

async function callRailwayEmbed(buffer: Buffer): Promise<EmbedApiResult> {
  const result = await postToRailway("/embed", buffer, "segmented.jpg")

  if (!result.ok) {
    return { success: false, embedding: null, embedding_dim: null, error: result.error }
  }

  const data = result.data as {
    success?: boolean
    embedding?: unknown
    embedding_dim?: number | null
    model?: string | null
  }

  if (data.success && Array.isArray(data.embedding)) {
    return {
      success: true,
      embedding: data.embedding,
      embedding_dim: data.embedding_dim ?? null,
      model: data.model ?? null,
    }
  }

  return {
    success: false,
    embedding: null,
    embedding_dim: data.embedding_dim ?? null,
    model: data.model ?? null,
    error: "No embedding returned",
  }
}

export async function compressImage(
  buffer: Buffer,
  options?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    keepMetadata?: boolean
  }
): Promise<Buffer> {
  const {
    maxWidth = IMAGE_CONFIG.FULL_IMAGE_SIZE,
    maxHeight = IMAGE_CONFIG.FULL_IMAGE_SIZE,
    quality = IMAGE_CONFIG.COMPRESSION_QUALITY,
    keepMetadata = false,
  } = options || {}

  let image = sharp(buffer).resize(maxWidth, maxHeight, {
    fit: "inside",
    withoutEnlargement: true,
  })

  if (keepMetadata) {
    image = image.withMetadata()
  }

  return image.jpeg({ quality }).toBuffer()
}

function toUploadFile(buffer: Buffer, filename: string): File {
  return new File([new Blob([new Uint8Array(buffer)], { type: "image/jpeg" })], filename, {
    type: "image/jpeg",
  })
}

/** Detect + crop a salamander in `compressedBuffer` and upload the crop if found. */
export async function processCropAndUpload(
  compressedBuffer: Buffer,
  baseFilename: string
): Promise<CropUploadResult> {
  const cropResult = await callRailwayCrop(compressedBuffer)

  if (!cropResult.detected || !cropResult.croppedBuffer) {
    return {
      croppedBlobUrl: null,
      croppedFileSize: null,
      isCropped: false,
      cropConfidence: cropResult.confidence,
      salamanderDetected: cropResult.detected,
    }
  }

  const compressedCroppedBuffer = await compressImage(cropResult.croppedBuffer, {
    maxWidth: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
    maxHeight: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
    quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
  })

  const croppedBlobUrl = await uploadToBlob(
    toUploadFile(compressedCroppedBuffer, baseFilename.replace(/\.\w+$/, "-cropped.jpg"))
  )

  return {
    croppedBlobUrl,
    croppedFileSize: compressedCroppedBuffer.length,
    isCropped: true,
    cropConfidence: cropResult.confidence,
    salamanderDetected: true,
  }
}

const EMPTY_SEGMENT_RESULT: SegmentEmbedResult = {
  segmentedBlobUrl: null,
  segmentedFileSize: null,
  segmentedEmbedding: null,
  embeddingDim: null,
  embedModel: null,
}

async function tryEmbed(buffer: Buffer) {
  try {
    const embedResult = await callRailwayEmbed(buffer)
    if (embedResult.success && Array.isArray(embedResult.embedding)) {
      return {
        embedding: embedResult.embedding,
        embeddingDim: embedResult.embedding_dim,
        embedModel: embedResult.model ?? null,
      }
    }
  } catch (error) {
    logger.error("Error generating embedding:", error)
  }
  return { embedding: null, embeddingDim: null, embedModel: null }
}

/** Background-remove + embed a detected salamander in `compressedBuffer` and upload the result. */
export async function processSegmentAndEmbed(
  compressedBuffer: Buffer,
  baseFilename: string,
  salamanderDetected: boolean
): Promise<SegmentEmbedResult> {
  if (!salamanderDetected) return EMPTY_SEGMENT_RESULT

  const segmentResult = await callRailwaySegment(compressedBuffer)
  if (!segmentResult.detected || !segmentResult.segmentedBuffer) return EMPTY_SEGMENT_RESULT

  const segmentedImageSize = parseInt(
    process.env.SEGMENTED_IMAGE_SIZE || String(IMAGE_CONFIG.CROPPED_IMAGE_SIZE),
    10
  )
  const compressedSegmentedBuffer = await compressImage(segmentResult.segmentedBuffer, {
    maxWidth: segmentedImageSize,
    maxHeight: segmentedImageSize,
    quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
  })

  const { embedding, embeddingDim, embedModel } = await tryEmbed(compressedSegmentedBuffer)

  const segmentedBlobUrl = await uploadToBlob(
    toUploadFile(compressedSegmentedBuffer, baseFilename.replace(/\.\w+$/, "-segmented.jpg"))
  )

  return {
    segmentedBlobUrl,
    segmentedFileSize: compressedSegmentedBuffer.length,
    segmentedEmbedding: embedding,
    embeddingDim,
    embedModel,
  }
}

/**
 * Store a 384-dim embedding via raw SQL (pgvector isn't supported by Prisma's query builder).
 * No-ops (no DB call) when `embedding` is null. Returns whether an embedding was stored.
 */
export async function storeEmbedding(
  photoId: string,
  embedding: number[] | null
): Promise<boolean> {
  if (!embedding) return false

  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    logger.warn({
      message: "Embedding dimension mismatch, skipping storage",
      expected: EXPECTED_EMBEDDING_DIM,
      received: embedding.length,
    })
    return false
  }

  const vectorString = `[${embedding.join(",")}]`
  await prisma.$executeRawUnsafe(
    `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
    vectorString,
    photoId
  )
  return true
}

/** Clear a photo's stored embedding, e.g. when reprocessing no longer finds a salamander. */
export async function clearEmbedding(photoId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`UPDATE "Photo" SET embedding = NULL WHERE id = $1`, photoId)
}
