import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { deleteFromBlob } from "@/lib/blob"
import { IMAGE_CONFIG } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { bulkProcessSchema, validateSafe } from "@/lib/validations"
import { ZodError } from "zod"
import {
  compressImage,
  processCropAndUpload,
  processSegmentAndEmbed,
  storeEmbedding,
  clearEmbedding,
} from "@/lib/photo-pipeline"

export const runtime = "nodejs"
export const maxDuration = 60 // Maximum execution time in seconds

interface ProcessResult {
  photoId: string
  success: boolean
  error?: string
  salamanderDetected?: boolean
  hasCropped?: boolean
  hasSegmented?: boolean
  hasEmbedding?: boolean
}

interface PhotoToProcess {
  id: string
  url: string
  originalName: string
  croppedUrl: string | null
  segmentedUrl: string | null
}

async function deleteOldDerivedImages(photo: PhotoToProcess): Promise<void> {
  const deletePromises: Promise<void>[] = []
  if (photo.croppedUrl) deletePromises.push(deleteFromBlob(photo.croppedUrl))
  if (photo.segmentedUrl) deletePromises.push(deleteFromBlob(photo.segmentedUrl))
  await Promise.allSettled(deletePromises)
}

async function processSinglePhoto(photo: PhotoToProcess): Promise<ProcessResult> {
  const response = await fetch(photo.url)
  if (!response.ok) {
    return { photoId: photo.id, success: false, error: "Failed to fetch original image" }
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer())
  const compressedBuffer = await compressImage(imageBuffer, {
    maxWidth: IMAGE_CONFIG.FULL_IMAGE_SIZE,
    maxHeight: IMAGE_CONFIG.FULL_IMAGE_SIZE,
    quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
  })

  await deleteOldDerivedImages(photo)

  const cropUpload = await processCropAndUpload(compressedBuffer, photo.originalName)
  const segmentEmbed = await processSegmentAndEmbed(
    compressedBuffer,
    photo.originalName,
    cropUpload.salamanderDetected
  )

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      croppedUrl: cropUpload.croppedBlobUrl,
      croppedFileSize: cropUpload.croppedFileSize,
      segmentedUrl: segmentEmbed.segmentedBlobUrl,
      segmentedFileSize: segmentEmbed.segmentedFileSize,
      isCropped: cropUpload.isCropped,
      cropConfidence: cropUpload.cropConfidence,
      salamanderDetected: cropUpload.salamanderDetected,
      embeddingDim: segmentEmbed.embeddingDim,
      embedModel: segmentEmbed.embedModel,
    },
  })

  const embeddingStored = await storeEmbedding(photo.id, segmentEmbed.segmentedEmbedding)
  if (!embeddingStored) {
    await clearEmbedding(photo.id)
  }

  const result: ProcessResult = {
    photoId: photo.id,
    success: true,
    salamanderDetected: cropUpload.salamanderDetected,
    hasCropped: !!cropUpload.croppedBlobUrl,
    hasSegmented: !!segmentEmbed.segmentedBlobUrl,
    hasEmbedding: !!segmentEmbed.segmentedEmbedding,
  }

  logger.log({ action: "bulk_process_photo", ...result })
  return result
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
        results.push(await processSinglePhoto(photo))
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
