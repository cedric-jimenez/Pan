import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"
import sharp from "sharp"
import { IMAGE_CONFIG, API_TIMEOUTS, CROP_DETECTION } from "@/lib/constants"
import { logger } from "@/lib/logger"

// Configure route to handle larger file uploads
export const runtime = "nodejs"
export const maxDuration = 60 // Maximum execution time in seconds

/**
 * Call Railway API to segment salamander (remove background)
 * @param buffer - Image buffer to process
 * @returns Segmented result with detected flag and segmented buffer
 */
async function callRailwaySegment(buffer: Buffer): Promise<{
  detected: boolean
  segmentedBuffer: Buffer | null
  error?: string
}> {
  const railwayUrl = process.env.RAILWAY_API_URL
  const timeoutMs = parseInt(
    process.env.YOLO_TIMEOUT_MS || String(API_TIMEOUTS.DEFAULT_TIMEOUT_MS),
    10
  )

  if (!railwayUrl) {
    logger.warn("RAILWAY_API_URL not configured, skipping segmentation")
    return {
      detected: false,
      segmentedBuffer: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const startTime = Date.now()

    // Create FormData with image
    const formData = new FormData()
    const blob = new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" })
    formData.append("file", blob, "image.jpg")

    // Call Railway API with timeout (using default params: confidence=0.25, background=gray, JPEG 85)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${railwayUrl}/segment-salamander`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    if (!response.ok) {
      logger.warn(`Railway segmentation API error: ${response.status} ${response.statusText}`)
      return {
        detected: false,
        segmentedBuffer: null,
        error: `Railway API error: ${response.status}`,
      }
    }

    const data = await response.json()

    logger.log({
      action: "salamander_segment",
      success: data.success,
      detected: data.detected,
      duration_ms: duration,
    })

    if (data.detected && data.segmented_image) {
      // Convert base64 to Buffer
      const base64Data = data.segmented_image.replace(/^data:image\/\w+;base64,/, "")
      const segmentedBuffer = Buffer.from(base64Data, "base64")

      logger.log({
        message: "Using segmented image from Railway",
        segmentedBufferSize: segmentedBuffer.length,
        hasBase64Prefix: data.segmented_image.startsWith("data:image"),
      })

      return {
        detected: true,
        segmentedBuffer,
      }
    }

    logger.log({
      message: "Not using segmented image",
      detected: data.detected,
      hasSegmentedImage: !!data.segmented_image,
    })

    return {
      detected: false,
      segmentedBuffer: null,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        logger.warn(`Railway segmentation API timeout after ${timeoutMs}ms`)
        return { detected: false, segmentedBuffer: null, error: "Timeout" }
      }
      logger.error("Railway segmentation API error:", error.message)
      return { detected: false, segmentedBuffer: null, error: error.message }
    }
    return { detected: false, segmentedBuffer: null, error: "Unknown error" }
  }
}

/**
 * Call Railway YOLO API to detect and crop salamander
 * @param buffer - Image buffer to process
 * @returns Crop result with detected flag, cropped buffer, and confidence
 */
async function callRailwayCrop(buffer: Buffer): Promise<{
  detected: boolean
  croppedBuffer: Buffer | null
  confidence: number | null
  error?: string
}> {
  const railwayUrl = process.env.RAILWAY_API_URL
  const confidenceThreshold = parseFloat(
    process.env.YOLO_CONFIDENCE_THRESHOLD || String(CROP_DETECTION.MIN_CONFIDENCE)
  )
  const timeoutMs = parseInt(
    process.env.YOLO_TIMEOUT_MS || String(API_TIMEOUTS.DEFAULT_TIMEOUT_MS),
    10
  )

  if (!railwayUrl) {
    logger.warn("RAILWAY_API_URL not configured, skipping YOLO crop")
    return {
      detected: false,
      croppedBuffer: null,
      confidence: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const startTime = Date.now()

    // Create FormData with image
    const formData = new FormData()
    const blob = new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" })
    formData.append("file", blob, "image.jpg")

    // Call Railway API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(
      `${railwayUrl}/crop-salamander?confidence=${confidenceThreshold}&return_base64=true`,
      {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    if (!response.ok) {
      logger.warn(`Railway API error: ${response.status} ${response.statusText}`)
      return {
        detected: false,
        croppedBuffer: null,
        confidence: null,
        error: `Railway API error: ${response.status}`,
      }
    }

    const data = await response.json()

    logger.log({
      action: "yolo_crop",
      success: data.success,
      detected: data.detected,
      confidence: data.bounding_box?.confidence,
      duration_ms: duration,
    })

    if (data.detected && data.cropped_image) {
      // Convert base64 to Buffer
      const base64Data = data.cropped_image.replace(/^data:image\/\w+;base64,/, "")
      const croppedBuffer = Buffer.from(base64Data, "base64")

      logger.log({
        message: "Using cropped image from Railway",
        croppedBufferSize: croppedBuffer.length,
        hasBase64Prefix: data.cropped_image.startsWith("data:image"),
      })

      return {
        detected: true,
        croppedBuffer,
        confidence: data.bounding_box?.confidence || null,
      }
    }

    logger.log({
      message: "Not using cropped image",
      detected: data.detected,
      hasCroppedImage: !!data.cropped_image,
      croppedImageType: typeof data.cropped_image,
    })

    return {
      detected: false,
      croppedBuffer: null,
      confidence: data.bounding_box?.confidence || null,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        logger.warn(`Railway API timeout after ${timeoutMs}ms`)
        return { detected: false, croppedBuffer: null, confidence: null, error: "Timeout" }
      }
      logger.error("Railway API error:", error.message)
      return { detected: false, croppedBuffer: null, confidence: null, error: error.message }
    }
    return { detected: false, croppedBuffer: null, confidence: null, error: "Unknown error" }
  }
}

/**
 * Call Railway embed endpoint to get DINOv2 embedding
 * @param buffer - Image buffer to process (segmented image)
 * @returns embedding array and metadata
 */
async function callRailwayEmbed(buffer: Buffer): Promise<{
  success: boolean
  embedding: number[] | null
  embedding_dim: number | null
  model?: string | null
  error?: string
}> {
  const railwayUrl = process.env.RAILWAY_API_URL
  const timeoutMs = parseInt(
    process.env.YOLO_TIMEOUT_MS || String(API_TIMEOUTS.DEFAULT_TIMEOUT_MS),
    10
  )

  if (!railwayUrl) {
    logger.warn("RAILWAY_API_URL not configured, skipping embedding")
    return {
      success: false,
      embedding: null,
      embedding_dim: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const startTime = Date.now()

    const formData = new FormData()
    // Use JPEG blob (consistent with other flows); fine for embeddings
    const blob = new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" })
    formData.append("file", blob, "segmented.jpg")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${railwayUrl}/embed`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    if (!response.ok) {
      logger.warn(`Railway embed API error: ${response.status} ${response.statusText}`)
      return {
        success: false,
        embedding: null,
        embedding_dim: null,
        error: `Railway embed API error: ${response.status}`,
      }
    }

    const data = await response.json()

    logger.log({
      action: "embed_image",
      success: data.success,
      embedding_dim: data.embedding_dim,
      duration_ms: duration,
    })

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        logger.warn(`Railway embed API timeout after ${timeoutMs}ms`)
        return { success: false, embedding: null, embedding_dim: null, error: "Timeout" }
      }
      logger.error("Railway embed API error:", error.message)
      return { success: false, embedding: null, embedding_dim: null, error: error.message }
    }
    return { success: false, embedding: null, embedding_dim: null, error: "Unknown error" }
  }
}

async function compressImage(
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

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check if this file already exists for this user (by name only)
    // Note: We only check by name because Vercel Blob identifies files by pathname,
    // so even if the file size differs, Blob will reject the upload
    const existingPhoto = await prisma.photo.findFirst({
      where: {
        userId: user.id,
        originalName: file.name,
      },
    })

    if (existingPhoto) {
      return NextResponse.json(
        { error: "Ce fichier existe déjà dans votre galerie" },
        { status: 409 }
      )
    }

    // Extract EXIF data
    let exifData: Record<string, unknown> = {}
    try {
      exifData = await exifr.parse(buffer)
    } catch (error) {
      logger.log("No EXIF data found or error parsing:", error)
    }

    // Resize and compress image to JPEG while keeping EXIF metadata
    const compressedBuffer = await compressImage(buffer, {
      maxWidth: IMAGE_CONFIG.FULL_IMAGE_SIZE,
      maxHeight: IMAGE_CONFIG.FULL_IMAGE_SIZE,
      quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
      keepMetadata: true,
    })

    // Call Railway YOLO API to detect and crop salamander
    logger.log({
      message: "Before Railway crop",
      compressedBufferSize: compressedBuffer.length,
    })

    const cropResult = await callRailwayCrop(compressedBuffer)

    // Upload full image (always)
    const fullImageUint8 = new Uint8Array(compressedBuffer)
    const fullImageBlob = new Blob([fullImageUint8], { type: "image/jpeg" })
    const fullImageFile = new File([fullImageBlob], file.name.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg",
    })
    const blobUrl = await uploadToBlob(fullImageFile)

    // Upload cropped image if salamander was detected
    let croppedBlobUrl: string | null = null
    let isCropped = false
    let cropConfidence: number | null = null
    const salamanderDetected = cropResult.detected

    if (cropResult.detected && cropResult.croppedBuffer) {
      // Upload cropped version
      // Re-compress cropped image
      const compressedCroppedBuffer = await compressImage(cropResult.croppedBuffer, {
        maxWidth: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
        maxHeight: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
        quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
        keepMetadata: false,
      })

      const croppedUint8 = new Uint8Array(compressedCroppedBuffer)
      const croppedBlob = new Blob([croppedUint8], { type: "image/jpeg" })

      const croppedFile = new File([croppedBlob], file.name.replace(/\.\w+$/, "-cropped.jpg"), {
        type: "image/jpeg",
      })
      croppedBlobUrl = await uploadToBlob(croppedFile)
      isCropped = true
      cropConfidence = cropResult.confidence

      logger.log({
        message: "Uploaded both full and cropped images",
        fullImageSize: compressedBuffer.length,
        croppedImageOriginalSize: cropResult.croppedBuffer.length,
        croppedImageCompressedSize: compressedCroppedBuffer.length,
        croppedReduction:
          ((1 - compressedCroppedBuffer.length / cropResult.croppedBuffer.length) * 100).toFixed(
            1
          ) + "%",
      })
    } else {
      // No cropped version
      cropConfidence = cropResult.confidence

      logger.log({
        message: "Uploaded only full image (no crop)",
        fullImageSize: compressedBuffer.length,
        detected: cropResult.detected,
        hasCroppedBuffer: !!cropResult.croppedBuffer,
        error: cropResult.error,
      })

      if (cropResult.error) {
        logger.log(`No cropped image due to: ${cropResult.error}`)
      }
    }

    // Upload segmented image if salamander was detected
    let segmentedBlobUrl: string | null = null

    // Embedding placeholders (filled if embedding generated)
    let segmentedEmbedding: number[] | null = null
    let embeddingDim: number | null = null
    let embedModel: string | null = null

    if (salamanderDetected) {
      logger.log({
        message: "Calling segmentation API for detected salamander",
      })

      const segmentResult = await callRailwaySegment(compressedBuffer)

      if (segmentResult.detected && segmentResult.segmentedBuffer) {
        // Re-compress segmented image
        const compressedSegmentedBuffer = await compressImage(segmentResult.segmentedBuffer, {
          maxWidth: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
          maxHeight: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
          quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
          keepMetadata: false,
        })

        // Generate embedding for the segmented version
        try {
          const embedResult = await callRailwayEmbed(compressedSegmentedBuffer)
          if (embedResult.success && Array.isArray(embedResult.embedding)) {
            segmentedEmbedding = embedResult.embedding
            embeddingDim = embedResult.embedding_dim
            embedModel = embedResult.model ?? null

            logger.log({
              message: "Embedding generated for segmented image",
              embeddingDim,
              model: embedModel,
            })
          } else {
            logger.log({
              message: "No embedding returned",
              error: embedResult.error,
            })
          }
        } catch (err) {
          logger.error("Error generating embedding:", err)
        }

        const segmentedUint8 = new Uint8Array(compressedSegmentedBuffer)
        const segmentedBlob = new Blob([segmentedUint8], { type: "image/jpeg" })

        const segmentedFile = new File(
          [segmentedBlob],
          file.name.replace(/\.\w+$/, "-segmented.jpg"),
          {
            type: "image/jpeg",
          }
        )
        segmentedBlobUrl = await uploadToBlob(segmentedFile)

        logger.log({
          message: "Uploaded segmented image",
          segmentedImageOriginalSize: segmentResult.segmentedBuffer.length,
          segmentedImageCompressedSize: compressedSegmentedBuffer.length,
          segmentedReduction:
            (
              (1 - compressedSegmentedBuffer.length / segmentResult.segmentedBuffer.length) *
              100
            ).toFixed(1) + "%",
        })
      } else {
        logger.log({
          message: "No segmented image generated",
          detected: segmentResult.detected,
          hasSegmentedBuffer: !!segmentResult.segmentedBuffer,
          error: segmentResult.error,
        })

        if (segmentResult.error) {
          logger.log(`No segmented image due to: ${segmentResult.error}`)
        }
      }
    }

    // Generate unique filename for reference
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    // Extract GPS coordinates
    const latitude = typeof exifData?.latitude === "number" ? exifData.latitude : null
    const longitude = typeof exifData?.longitude === "number" ? exifData.longitude : null

    // Extract datetime
    let takenAt = null
    if (exifData?.DateTimeOriginal) {
      const dateValue = exifData.DateTimeOriginal
      takenAt = dateValue instanceof Date ? dateValue : new Date(String(dateValue))
    } else if (exifData?.DateTime) {
      const dateValue = exifData.DateTime
      takenAt = dateValue instanceof Date ? dateValue : new Date(String(dateValue))
    }

    // Extract camera info
    const cameraMake = exifData?.Make ? String(exifData.Make) : null
    const cameraModel = exifData?.Model ? String(exifData.Model) : null
    const iso = exifData?.ISO ? Number(exifData.ISO) : null
    const aperture = exifData?.FNumber ? `f/${Number(exifData.FNumber)}` : null
    const shutterSpeed = exifData?.ExposureTime ? `${Number(exifData.ExposureTime)}s` : null
    const focalLength = exifData?.FocalLength ? `${Number(exifData.FocalLength)}mm` : null

    // Save to database (without embedding - pgvector requires raw SQL)
    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        fileSize: compressedBuffer.length, // Full image size
        mimeType: "image/jpeg", // Always JPEG after compression
        url: blobUrl,
        croppedUrl: croppedBlobUrl,
        segmentedUrl: segmentedBlobUrl,
        latitude,
        longitude,
        takenAt,
        cameraMake,
        cameraModel,
        iso,
        aperture,
        shutterSpeed,
        focalLength,
        // YOLO crop metadata
        isCropped,
        cropConfidence,
        salamanderDetected,
        // Embedding metadata (vector stored separately via raw SQL)
        embeddingDim,
        embedModel,
      },
    })

    // Store embedding via raw SQL (pgvector requires Unsupported type workaround)
    const EXPECTED_EMBEDDING_DIM = 384
    if (segmentedEmbedding && segmentedEmbedding.length === EXPECTED_EMBEDDING_DIM) {
      const vectorString = `[${segmentedEmbedding.join(",")}]`
      await prisma.$executeRawUnsafe(
        `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        photo.id
      )
      logger.log({ message: "Embedding stored via pgvector", photoId: photo.id })
    } else if (segmentedEmbedding) {
      logger.warn({
        message: "Embedding dimension mismatch, skipping storage",
        expected: EXPECTED_EMBEDDING_DIM,
        received: segmentedEmbedding.length,
      })
    }

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error: unknown) {
    logger.error("Upload error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}
