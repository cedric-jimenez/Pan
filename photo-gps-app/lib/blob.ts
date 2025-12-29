import { put, del } from '@vercel/blob'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'

const isDevelopment = process.env.NODE_ENV === 'development'
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

/**
 * Upload a file to Vercel Blob Storage (production) or local filesystem (development)
 */
export async function uploadToBlob(file: File): Promise<string> {
  if (isDevelopment) {
    // Local filesystem storage for development
    await mkdir(UPLOAD_DIR, { recursive: true })

    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return public URL for local development
    return `/uploads/${filename}`
  } else {
    // Vercel Blob Storage for production
    const blob = await put(file.name, file, {
      access: 'public',
    })

    return blob.url
  }
}

/**
 * Delete a file from Vercel Blob Storage (production) or local filesystem (development)
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    if (isDevelopment) {
      // Extract filename from URL (/uploads/filename.jpg)
      const filename = url.split('/').pop()
      if (filename) {
        const filepath = join(UPLOAD_DIR, filename)
        await unlink(filepath)
      }
    } else {
      // Vercel Blob Storage for production
      await del(url)
    }
  } catch (error) {
    console.error('Failed to delete file:', error)
    // Don't throw - file might already be deleted
  }
}

