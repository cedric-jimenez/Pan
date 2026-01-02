import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"
import sharp from "sharp"

// Configure route to handle larger file uploads
export const runtime = 'nodejs'
export const maxDuration = 60 // Maximum execution time in seconds

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
  const confidenceThreshold = parseFloat(process.env.YOLO_CONFIDENCE_THRESHOLD || '0.5')
  const timeoutMs = parseInt(process.env.YOLO_TIMEOUT_MS || '10000', 10)

  if (!railwayUrl) {
    console.warn('RAILWAY_API_URL not configured, skipping YOLO crop')
    return { detected: false, croppedBuffer: null, confidence: null, error: 'Railway URL not configured' }
  }

  try {
    const startTime = Date.now()

    // Create FormData with image
    const formData = new FormData()
    const blob = new Blob([Uint8Array.from(buffer)], { type: 'image/jpeg' })
    formData.append('file', blob, 'image.jpg')

    // Call Railway API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(
      `${railwayUrl}/crop-salamander?confidence=${confidenceThreshold}&return_base64=true`,
      {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)
    const duration = Date.now() - startTime

    if (!response.ok) {
      console.warn(`Railway API error: ${response.status} ${response.statusText}`)
      return {
        detected: false,
        croppedBuffer: null,
        confidence: null,
        error: `Railway API error: ${response.status}`
      }
    }

    const data = await response.json()

    console.log({
      action: 'yolo_crop',
      success: data.success,
      detected: data.detected,
      confidence: data.bounding_box?.confidence,
      duration_ms: duration,
    })

    if (data.detected && data.cropped_image) {
      // Convert base64 to Buffer
      const base64Data = data.cropped_image.replace(/^data:image\/\w+;base64,/, '')
      const croppedBuffer = Buffer.from(base64Data, 'base64')

      console.log({
        message: 'Using cropped image from Railway',
        croppedBufferSize: croppedBuffer.length,
        hasBase64Prefix: data.cropped_image.startsWith('data:image'),
      })

      return {
        detected: true,
        croppedBuffer,
        confidence: data.bounding_box?.confidence || null,
      }
    }

    console.log({
      message: 'Not using cropped image',
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
      if (error.name === 'AbortError') {
        console.warn(`Railway API timeout after ${timeoutMs}ms`)
        return { detected: false, croppedBuffer: null, confidence: null, error: 'Timeout' }
      }
      console.error('Railway API error:', error.message)
      return { detected: false, croppedBuffer: null, confidence: null, error: error.message }
    }
    return { detected: false, croppedBuffer: null, confidence: null, error: 'Unknown error' }
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Check if this file already exists for this user (by name and size)
    const existingPhoto = await prisma.photo.findFirst({
      where: {
        userId: user.id,
        originalName: file.name,
        fileSize: buffer.length,
      }
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
      console.log("No EXIF data found or error parsing:", error)
    }

    // Resize and compress image to JPEG at 80% quality while keeping EXIF metadata
    const compressedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside', // Proportional resize to fit within 800x800
        withoutEnlargement: true // Don't upscale small images
      })
      .jpeg({ quality: 80 })
      .withMetadata() // Preserve EXIF data including GPS
      .toBuffer()

    // Call Railway YOLO API to detect and crop salamander
    console.log({
      message: 'Before Railway crop',
      compressedBufferSize: compressedBuffer.length,
    })

    const cropResult = await callRailwayCrop(compressedBuffer)

    // Determine which buffer to use: cropped or compressed
    let finalBuffer: Buffer
    let isCropped = false
    let cropConfidence: number | null = null
    let salamanderDetected = true

    if (cropResult.detected && cropResult.croppedBuffer) {
      // Use cropped image
      finalBuffer = cropResult.croppedBuffer
      isCropped = true
      cropConfidence = cropResult.confidence
      salamanderDetected = true
      console.log({
        message: 'Final buffer decision: using cropped image',
        originalSize: compressedBuffer.length,
        croppedSize: finalBuffer.length,
        sizeDiff: compressedBuffer.length - finalBuffer.length,
        sizeReduction: ((1 - finalBuffer.length / compressedBuffer.length) * 100).toFixed(1) + '%',
        isCropped: true,
      })
    } else {
      // Fallback to Sharp compressed image
      finalBuffer = compressedBuffer
      isCropped = false
      cropConfidence = cropResult.confidence
      salamanderDetected = cropResult.detected

      console.log({
        message: 'Final buffer decision: using fallback',
        finalBufferSize: finalBuffer.length,
        isCropped: false,
        cropResultDetected: cropResult.detected,
        hasCroppedBuffer: !!cropResult.croppedBuffer,
      })

      if (cropResult.error) {
        console.log(`Using fallback image due to: ${cropResult.error}`)
      }
    }

    // Convert Buffer to Uint8Array for compatibility with Blob/File constructors
    const uint8Array = new Uint8Array(finalBuffer)
    const blob = new Blob([uint8Array], { type: 'image/jpeg' })
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.\w+$/, '.jpg'), // Ensure .jpg extension
      { type: 'image/jpeg' }
    )

    // Upload compressed version to Vercel Blob Storage
    const blobUrl = await uploadToBlob(compressedFile)

    // Generate unique filename for reference
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Extract GPS coordinates
    const latitude = typeof exifData?.latitude === 'number' ? exifData.latitude : null
    const longitude = typeof exifData?.longitude === 'number' ? exifData.longitude : null

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

    // Save to database
    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        filename,
        originalName: file.name,
        fileSize: finalBuffer.length, // Use final buffer size (cropped or compressed)
        mimeType: 'image/jpeg', // Always JPEG after compression
        url: blobUrl,
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
      }
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error: unknown) {
    console.error("Upload error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    )
  }
}
