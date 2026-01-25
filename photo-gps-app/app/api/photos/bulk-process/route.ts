import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob, deleteFromBlob } from "@/lib/blob"
import sharp from "sharp"
import { IMAGE_CONFIG, API_TIMEOUTS, CROP_DETECTION } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { bulkProcessSchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"

export const runtime = "nodejs"
export const maxDuration = 60 // Maximum execution time in seconds

/**
 * Call Railway API to segment salamander (remove background)
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
    return {
      detected: false,
      segmentedBuffer: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const formData = new FormData()
    const blob = new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" })
    formData.append("file", blob, "image.jpg")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${railwayUrl}/segment-salamander`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        detected: false,
        segmentedBuffer: null,
        error: `Railway API error: ${response.status}`,
      }
    }

    const data = await response.json()

    if (data.detected && data.segmented_image) {
      const base64Data = data.segmented_image.replace(/^data:image\/\w+;base64,/, "")
      const segmentedBuffer = Buffer.from(base64Data, "base64")
      return { detected: true, segmentedBuffer }
    }

    return { detected: false, segmentedBuffer: null }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { detected: false, segmentedBuffer: null, error: "Timeout" }
      }
      return { detected: false, segmentedBuffer: null, error: error.message }
    }
    return { detected: false, segmentedBuffer: null, error: "Unknown error" }
  }
}

/**
 * Call Railway YOLO API to detect and crop salamander
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
    return {
      detected: false,
      croppedBuffer: null,
      confidence: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const formData = new FormData()
    const blob = new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" })
    formData.append("file", blob, "image.jpg")

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

    if (!response.ok) {
      return {
        detected: false,
        croppedBuffer: null,
        confidence: null,
        error: `Railway API error: ${response.status}`,
      }
    }

    const data = await response.json()

    if (data.detected && data.cropped_image) {
      const base64Data = data.cropped_image.replace(/^data:image\/\w+;base64,/, "")
      const croppedBuffer = Buffer.from(base64Data, "base64")
      return {
        detected: true,
        croppedBuffer,
        confidence: data.bounding_box?.confidence || null,
      }
    }

    return {
      detected: false,
      croppedBuffer: null,
      confidence: data.bounding_box?.confidence || null,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { detected: false, croppedBuffer: null, confidence: null, error: "Timeout" }
      }
      return { detected: false, croppedBuffer: null, confidence: null, error: error.message }
    }
    return { detected: false, croppedBuffer: null, confidence: null, error: "Unknown error" }
  }
}

/**
 * Call Railway embed endpoint to get DINOv2 embedding
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
    return {
      success: false,
      embedding: null,
      embedding_dim: null,
      error: "Railway URL not configured",
    }
  }

  try {
    const formData = new FormData()
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

    if (!response.ok) {
      return {
        success: false,
        embedding: null,
        embedding_dim: null,
        error: `Railway embed API error: ${response.status}`,
      }
    }

    const data = await response.json()

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
        return { success: false, embedding: null, embedding_dim: null, error: "Timeout" }
      }
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
  }
): Promise<Buffer> {
  const {
    maxWidth = IMAGE_CONFIG.FULL_IMAGE_SIZE,
    maxHeight = IMAGE_CONFIG.FULL_IMAGE_SIZE,
    quality = IMAGE_CONFIG.COMPRESSION_QUALITY,
  } = options || {}

  return sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toBuffer()
}

interface ProcessResult {
  photoId: string
  success: boolean
  error?: string
  salamanderDetected?: boolean
  hasCropped?: boolean
  hasSegmented?: boolean
  hasEmbedding?: boolean
}

// POST bulk process photos (reprocess crop, segment, embed)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input with Zod
    const validation = validateSafe(bulkProcessSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors.format(),
        },
        { status: 400 }
      )
    }

    const { photoIds } = validation.data

    // Fetch all photos that belong to the user
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        userId: user.id,
      },
    })

    // Check if all requested photos were found and belong to user
    if (photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: "Certaines photos n'ont pas été trouvées ou ne vous appartiennent pas" },
        { status: 403 }
      )
    }

    const results: ProcessResult[] = []

    // Process each photo sequentially to avoid overloading
    for (const photo of photos) {
      try {
        // Fetch the original image
        const response = await fetch(photo.url)
        if (!response.ok) {
          results.push({
            photoId: photo.id,
            success: false,
            error: "Failed to fetch original image",
          })
          continue
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer())

        // Compress image for processing
        const compressedBuffer = await compressImage(imageBuffer, {
          maxWidth: IMAGE_CONFIG.FULL_IMAGE_SIZE,
          maxHeight: IMAGE_CONFIG.FULL_IMAGE_SIZE,
          quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
        })

        // Call Railway YOLO API to detect and crop salamander
        const cropResult = await callRailwayCrop(compressedBuffer)

        // Delete old cropped and segmented images from blob storage
        const deletePromises: Promise<void>[] = []
        if (photo.croppedUrl) {
          deletePromises.push(deleteFromBlob(photo.croppedUrl))
        }
        if (photo.segmentedUrl) {
          deletePromises.push(deleteFromBlob(photo.segmentedUrl))
        }
        await Promise.allSettled(deletePromises)

        // Upload new cropped image if salamander was detected
        let croppedBlobUrl: string | null = null
        let croppedFileSize: number | null = null
        let isCropped = false
        let cropConfidence: number | null = null
        const salamanderDetected = cropResult.detected

        if (cropResult.detected && cropResult.croppedBuffer) {
          const compressedCroppedBuffer = await compressImage(cropResult.croppedBuffer, {
            maxWidth: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
            maxHeight: IMAGE_CONFIG.CROPPED_IMAGE_SIZE,
            quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
          })

          croppedFileSize = compressedCroppedBuffer.length

          const croppedUint8 = new Uint8Array(compressedCroppedBuffer)
          const croppedBlob = new Blob([croppedUint8], { type: "image/jpeg" })
          const croppedFile = new File(
            [croppedBlob],
            photo.originalName.replace(/\.\w+$/, "-cropped.jpg"),
            { type: "image/jpeg" }
          )
          croppedBlobUrl = await uploadToBlob(croppedFile)
          isCropped = true
          cropConfidence = cropResult.confidence
        } else {
          cropConfidence = cropResult.confidence
        }

        // Process segmentation and embedding if salamander was detected
        let segmentedBlobUrl: string | null = null
        let segmentedFileSize: number | null = null
        let segmentedEmbedding: number[] | null = null
        let embeddingDim: number | null = null
        let embedModel: string | null = null

        if (salamanderDetected) {
          const segmentResult = await callRailwaySegment(compressedBuffer)

          if (segmentResult.detected && segmentResult.segmentedBuffer) {
            const segmentedImageSize = parseInt(
              process.env.SEGMENTED_IMAGE_SIZE || String(IMAGE_CONFIG.CROPPED_IMAGE_SIZE),
              10
            )
            const compressedSegmentedBuffer = await compressImage(segmentResult.segmentedBuffer, {
              maxWidth: segmentedImageSize,
              maxHeight: segmentedImageSize,
              quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
            })

            segmentedFileSize = compressedSegmentedBuffer.length

            // Generate embedding
            try {
              const embedResult = await callRailwayEmbed(compressedSegmentedBuffer)
              if (embedResult.success && Array.isArray(embedResult.embedding)) {
                segmentedEmbedding = embedResult.embedding
                embeddingDim = embedResult.embedding_dim
                embedModel = embedResult.model ?? null
              }
            } catch (err) {
              logger.error("Error generating embedding:", err)
            }

            const segmentedUint8 = new Uint8Array(compressedSegmentedBuffer)
            const segmentedBlob = new Blob([segmentedUint8], { type: "image/jpeg" })
            const segmentedFile = new File(
              [segmentedBlob],
              photo.originalName.replace(/\.\w+$/, "-segmented.jpg"),
              { type: "image/jpeg" }
            )
            segmentedBlobUrl = await uploadToBlob(segmentedFile)
          }
        }

        // Update database
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            croppedUrl: croppedBlobUrl,
            croppedFileSize,
            segmentedUrl: segmentedBlobUrl,
            segmentedFileSize,
            isCropped,
            cropConfidence,
            salamanderDetected,
            embeddingDim,
            embedModel,
          },
        })

        // Store embedding via raw SQL
        const EXPECTED_EMBEDDING_DIM = 384
        if (segmentedEmbedding && segmentedEmbedding.length === EXPECTED_EMBEDDING_DIM) {
          const vectorString = `[${segmentedEmbedding.join(",")}]`
          await prisma.$executeRawUnsafe(
            `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
            vectorString,
            photo.id
          )
        } else {
          // Clear embedding if not generated
          await prisma.$executeRawUnsafe(
            `UPDATE "Photo" SET embedding = NULL WHERE id = $1`,
            photo.id
          )
        }

        results.push({
          photoId: photo.id,
          success: true,
          salamanderDetected,
          hasCropped: !!croppedBlobUrl,
          hasSegmented: !!segmentedBlobUrl,
          hasEmbedding: !!segmentedEmbedding,
        })

        logger.log({
          action: "bulk_process_photo",
          photoId: photo.id,
          salamanderDetected,
          hasCropped: !!croppedBlobUrl,
          hasSegmented: !!segmentedBlobUrl,
          hasEmbedding: !!segmentedEmbedding,
        })
      } catch (error) {
        logger.error(`Failed to process photo ${photo.id}:`, error)
        results.push({
          photoId: photo.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      processedCount: successCount,
      failedCount: failureCount,
      results,
    })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.format(),
        },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    logger.error("Bulk process error:", error)
    return NextResponse.json({ error: "Échec du traitement des photos" }, { status: 500 })
  }
}
