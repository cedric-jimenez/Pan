import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import crypto from "crypto"

let _s3: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _s3
}

/**
 * Upload a file to Cloudflare R2 Storage
 */
export async function uploadToBlob(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin"
  const key = `${crypto.randomUUID()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    }),
  )

  return `${process.env.R2_PUBLIC_URL}/${key}`
}

/**
 * Delete a file from Cloudflare R2 Storage
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    const publicUrl = process.env.R2_PUBLIC_URL!
    const key = url.replace(`${publicUrl}/`, "")
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }),
    )
  } catch (error) {
    console.error("Failed to delete blob:", error)
    // Don't throw - file might already be deleted
  }
}
