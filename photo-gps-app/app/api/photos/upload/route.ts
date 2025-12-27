import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import exifr from "exifr"

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
      exifData = await exifr.parse(buffer, {
        gps: true,
        exif: true,
        ifd0: true,
        ifd1: true,
      })
    } catch (error) {
      console.log("No EXIF data found or error parsing:", error)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(process.cwd(), "public/uploads", filename)

    // Save file
    await writeFile(filepath, buffer)

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
        fileSize: file.size,
        mimeType: file.type,
        url: `/uploads/${filename}`,
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
