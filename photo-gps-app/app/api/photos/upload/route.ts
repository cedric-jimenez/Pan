import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"
import sharp from "sharp"

// Configure route to handle larger file uploads
export const runtime = 'nodejs'
export const maxDuration = 60 // Maximum execution time in seconds

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

    // Compress image to JPEG at 80% quality while keeping EXIF metadata
    const compressedBuffer = await sharp(buffer)
      .jpeg({ quality: 80 })
      .withMetadata() // Preserve EXIF data including GPS
      .toBuffer()

    // Convert Buffer to Uint8Array for compatibility with Blob/File constructors
    const uint8Array = new Uint8Array(compressedBuffer)
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
        fileSize: compressedBuffer.length, // Use compressed size
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
