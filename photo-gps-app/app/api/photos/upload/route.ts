import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { uploadToBlob } from "@/lib/blob"
import exifr from "exifr"
import sharp from "sharp"

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

    // Extract EXIF data
    let exifData: any = {}
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

    // Create a Blob from compressed buffer, then a File
    const blob = new Blob([compressedBuffer], { type: 'image/jpeg' })
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
    const latitude = exifData?.latitude || null
    const longitude = exifData?.longitude || null

    // Extract datetime
    let takenAt = null
    if (exifData?.DateTimeOriginal) {
      takenAt = new Date(exifData.DateTimeOriginal)
    } else if (exifData?.DateTime) {
      takenAt = new Date(exifData.DateTime)
    }

    // Extract camera info
    const cameraMake = exifData?.Make || null
    const cameraModel = exifData?.Model || null
    const iso = exifData?.ISO || null
    const aperture = exifData?.FNumber ? `f/${exifData.FNumber}` : null
    const shutterSpeed = exifData?.ExposureTime ? `${exifData.ExposureTime}s` : null
    const focalLength = exifData?.FocalLength ? `${exifData.FocalLength}mm` : null

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
  } catch (error: any) {
    console.error("Upload error:", error)

    if (error.message === "Unauthorized") {
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
