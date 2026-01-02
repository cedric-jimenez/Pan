import { put, del } from "@vercel/blob"

/**
 * Upload a file to Vercel Blob Storage
 */
export async function uploadToBlob(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: "public",
  })

  return blob.url
}

/**
 * Delete a file from Vercel Blob Storage
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error("Failed to delete blob:", error)
    // Don't throw - file might already be deleted
  }
}
