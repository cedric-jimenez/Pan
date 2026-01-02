import { describe, it, expect, vi, beforeEach } from "vitest"
import { uploadToBlob, deleteFromBlob } from "@/lib/blob"

// Mock Vercel Blob
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

import { put, del } from "@vercel/blob"

describe("Blob Storage Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("uploadToBlob", () => {
    it("uploads file to Vercel Blob Storage", async () => {
      const mockBlobUrl = "https://blob.vercel-storage.com/test-abc123.jpg"

      vi.mocked(put).mockResolvedValue({
        url: mockBlobUrl,
        pathname: "test-abc123.jpg",
        contentType: "image/jpeg",
        contentDisposition: 'inline; filename="test.jpg"',
        downloadUrl: mockBlobUrl,
      })

      const file = new File(["test-data"], "test.jpg", { type: "image/jpeg" })
      const url = await uploadToBlob(file)

      expect(url).toBe(mockBlobUrl)
      expect(put).toHaveBeenCalledWith("test.jpg", file, { access: "public" })
    })

    it("handles upload errors", async () => {
      vi.mocked(put).mockRejectedValue(new Error("Storage quota exceeded"))

      const file = new File(["test-data"], "test.jpg", { type: "image/jpeg" })

      await expect(uploadToBlob(file)).rejects.toThrow("Storage quota exceeded")
    })

    it("uploads different file types", async () => {
      const mockBlobUrl = "https://blob.vercel-storage.com/test-abc123.png"

      vi.mocked(put).mockResolvedValue({
        url: mockBlobUrl,
        pathname: "test-abc123.png",
        contentType: "image/png",
        contentDisposition: 'inline; filename="test.png"',
        downloadUrl: mockBlobUrl,
      })

      const file = new File(["test-data"], "test.png", { type: "image/png" })
      const url = await uploadToBlob(file)

      expect(url).toBe(mockBlobUrl)
      expect(put).toHaveBeenCalledWith("test.png", file, { access: "public" })
    })
  })

  describe("deleteFromBlob", () => {
    it("deletes file from Vercel Blob Storage", async () => {
      vi.mocked(del).mockResolvedValue()

      const url = "https://blob.vercel-storage.com/test-abc123.jpg"
      await deleteFromBlob(url)

      expect(del).toHaveBeenCalledWith(url)
    })

    it("handles deletion errors gracefully", async () => {
      vi.mocked(del).mockRejectedValue(new Error("Blob not found"))

      const url = "https://blob.vercel-storage.com/test-abc123.jpg"

      // Should not throw - errors are caught and logged
      await expect(deleteFromBlob(url)).resolves.toBeUndefined()
    })

    it("handles network errors gracefully", async () => {
      vi.mocked(del).mockRejectedValue(new Error("Network error"))

      const url = "https://blob.vercel-storage.com/test-abc123.jpg"

      // Should not throw - errors are caught and logged
      await expect(deleteFromBlob(url)).resolves.toBeUndefined()
    })
  })
})
