import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"
import { IMAGE_CONFIG } from "@/lib/constants"
import { logger } from "@/lib/logger"
import {
  compressImage,
  processCropAndUpload,
  processSegmentAndEmbed,
  storeEmbedding,
} from "@/lib/photo-pipeline"

// Configure route to handle larger file uploads
export const runtime = "nodejs"
export const maxDuration = 60 // Maximum execution time in seconds

async function parseExif(buffer: Buffer): Promise<Record<string, unknown>> {
  try {
    return (await exifr.parse(buffer)) || {}
  } catch (error) {
    logger.log("No EXIF data found or error parsing:", error)
    return {}
  }
}

/** Pull the DB-relevant fields out of a raw EXIF payload. */
function extractExifMetadata(exifData: Record<string, unknown>) {
  const dateValue = exifData.DateTimeOriginal ?? exifData.DateTime
  const takenAt = dateValue
    ? dateValue instanceof Date
      ? dateValue
      : new Date(String(dateValue))
    : null

  return {
    latitude: typeof exifData.latitude === "number" ? exifData.latitude : null,
    longitude: typeof exifData.longitude === "number" ? exifData.longitude : null,
    takenAt,
    cameraMake: exifData.Make ? String(exifData.Make) : null,
    cameraModel: exifData.Model ? String(exifData.Model) : null,
    iso: exifData.ISO ? Number(exifData.ISO) : null,
    aperture: exifData.FNumber ? `f/${Number(exifData.FNumber)}` : null,
    shutterSpeed: exifData.ExposureTime ? `${Number(exifData.ExposureTime)}s` : null,
    focalLength: exifData.FocalLength ? `${Number(exifData.FocalLength)}mm` : null,
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Note: We only check by name because Vercel Blob identifies files by pathname,
    // so even if the file size differs, Blob will reject the upload
    const existingPhoto = await prisma.photo.findFirst({
      where: { userId: user.id, originalName: file.name },
    })

    if (existingPhoto) {
      return NextResponse.json(
        { error: "Ce fichier existe déjà dans votre galerie" },
        { status: 409 }
      )
    }

    const exifMetadata = extractExifMetadata(await parseExif(buffer))

    // Resize and compress image to JPEG while keeping EXIF metadata
    const compressedBuffer = await compressImage(buffer, {
      maxWidth: IMAGE_CONFIG.FULL_IMAGE_SIZE,
      maxHeight: IMAGE_CONFIG.FULL_IMAGE_SIZE,
      quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
      keepMetadata: true,
    })

    // Upload full image (always)
    const fullImageFile = new File(
      [new Blob([new Uint8Array(compressedBuffer)], { type: "image/jpeg" })],
      file.name.replace(/\.\w+$/, ".jpg"),
      { type: "image/jpeg" }
    )
    const blobUrl = await uploadToBlob(fullImageFile)

    const cropUpload = await processCropAndUpload(compressedBuffer, file.name)
    const segmentEmbed = await processSegmentAndEmbed(
      compressedBuffer,
      file.name,
      cropUpload.salamanderDetected
    )

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    // Save to database (without embedding - pgvector requires raw SQL)
    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        fileSize: compressedBuffer.length, // Full image size
        croppedFileSize: cropUpload.croppedFileSize,
        segmentedFileSize: segmentEmbed.segmentedFileSize,
        mimeType: "image/jpeg", // Always JPEG after compression
        url: blobUrl,
        croppedUrl: cropUpload.croppedBlobUrl,
        segmentedUrl: segmentEmbed.segmentedBlobUrl,
        ...exifMetadata,
        // YOLO crop metadata
        isCropped: cropUpload.isCropped,
        cropConfidence: cropUpload.cropConfidence,
        salamanderDetected: cropUpload.salamanderDetected,
        // Embedding metadata (vector stored separately via raw SQL)
        embeddingDim: segmentEmbed.embeddingDim,
        embedModel: segmentEmbed.embedModel,
      },
    })

    const embeddingStored = await storeEmbedding(photo.id, segmentEmbed.segmentedEmbedding)
    if (embeddingStored) {
      logger.log({ message: "Embedding stored via pgvector", photoId: photo.id })
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
