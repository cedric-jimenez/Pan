// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock environment variables
vi.stubEnv("R2_ACCOUNT_ID", "test-account-id")
vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key")
vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key")
vi.stubEnv("R2_BUCKET_NAME", "test-bucket")
vi.stubEnv("R2_PUBLIC_URL", "https://r2.example.com")

// Mock @aws-sdk/client-s3
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = mockSend
    },
    PutObjectCommand: class {
      Bucket: string
      Key: string
      Body: Buffer
      ContentType: string
      constructor(params: {
        Bucket: string
        Key: string
        Body: Buffer
        ContentType: string
      }) {
        this.Bucket = params.Bucket
        this.Key = params.Key
        this.Body = params.Body
        this.ContentType = params.ContentType
      }
    },
    DeleteObjectCommand: class {
      Bucket: string
      Key: string
      constructor(params: { Bucket: string; Key: string }) {
        this.Bucket = params.Bucket
        this.Key = params.Key
      }
    },
  }
})

import { uploadToBlob, deleteFromBlob } from "@/lib/blob"

describe("Blob Storage Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("uploadToBlob", () => {
    it("uploads file to Cloudflare R2 Storage", async () => {
      mockSend.mockResolvedValue({})

      const file = new File(["test-data"], "test.jpg", { type: "image/jpeg" })
      const url = await uploadToBlob(file)

      expect(url).toMatch(/^https:\/\/r2\.example\.com\/.*\.jpg$/)
      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command.Bucket).toBe("test-bucket")
      expect(command.ContentType).toBe("image/jpeg")
    })

    it("handles upload errors", async () => {
      mockSend.mockRejectedValue(new Error("Storage quota exceeded"))

      const file = new File(["test-data"], "test.jpg", { type: "image/jpeg" })

      await expect(uploadToBlob(file)).rejects.toThrow("Storage quota exceeded")
    })

    it("uploads different file types", async () => {
      mockSend.mockResolvedValue({})

      const file = new File(["test-data"], "test.png", { type: "image/png" })
      const url = await uploadToBlob(file)

      expect(url).toMatch(/^https:\/\/r2\.example\.com\/.*\.png$/)
      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command.Bucket).toBe("test-bucket")
      expect(command.ContentType).toBe("image/png")
    })
  })

  describe("deleteFromBlob", () => {
    it("deletes file from Cloudflare R2 Storage", async () => {
      mockSend.mockResolvedValue({})

      const url = "https://r2.example.com/abc123.jpg"
      await deleteFromBlob(url)

      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command.Bucket).toBe("test-bucket")
      expect(command.Key).toBe("abc123.jpg")
    })

    it("handles deletion errors gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Blob not found"))

      const url = "https://r2.example.com/abc123.jpg"
      await expect(deleteFromBlob(url)).resolves.toBeUndefined()
    })

    it("handles network errors gracefully", async () => {
      mockSend.mockRejectedValue(new Error("Network error"))

      const url = "https://r2.example.com/abc123.jpg"
      await expect(deleteFromBlob(url)).resolves.toBeUndefined()
    })
  })
})
