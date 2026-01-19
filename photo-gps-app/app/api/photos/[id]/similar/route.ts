import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logger } from "@/lib/logger";
import { API_TIMEOUTS } from "@/lib/constants";

/**
 * Fetch an image from a URL as a Buffer
 */
async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Call Railway /verify API to perform geometric matching
 */
async function callRailwayVerify(
  queryBuffer: Buffer,
  candidateBuffers: Buffer[]
): Promise<{
  success: boolean;
  results: Array<{
    candidate_index: number;
    is_same: boolean;
    score: number;
    confidence: string;
    matches: number;
    inliers: number;
  }>;
  error?: string;
}> {
  const railwayUrl = process.env.RAILWAY_API_URL;
  const timeoutMs = parseInt(
    process.env.YOLO_TIMEOUT_MS || String(API_TIMEOUTS.DEFAULT_TIMEOUT_MS),
    10
  );

  if (!railwayUrl) {
    logger.warn("RAILWAY_API_URL not configured, skipping verification");
    return {
      success: false,
      results: [],
      error: "Railway URL not configured",
    };
  }

  try {
    const startTime = Date.now();

    // Create FormData with query and candidate images
    const formData = new FormData();

    // Add query image
    const queryBlob = new Blob([Uint8Array.from(queryBuffer)], { type: "image/jpeg" });
    formData.append("query", queryBlob, "query.jpg");

    // Add candidate images
    for (let i = 0; i < candidateBuffers.length; i++) {
      const candidateBlob = new Blob([Uint8Array.from(candidateBuffers[i])], {
        type: "image/jpeg"
      });
      formData.append("candidates", candidateBlob, `candidate_${i}.jpg`);
    }

    // Call Railway API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${railwayUrl}/verify`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      logger.warn(`Railway verify API error: ${response.status} ${response.statusText}`);
      return {
        success: false,
        results: [],
        error: `Railway API error: ${response.status}`,
      };
    }

    const data = await response.json();

    logger.log({
      action: "salamander_verify",
      success: data.success,
      results_count: data.results?.length || 0,
      duration_ms: duration,
    });

    return {
      success: data.success,
      results: data.results || [],
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        logger.warn(`Railway verify API timeout after ${timeoutMs}ms`);
        return { success: false, results: [], error: "Timeout" };
      }
      logger.error("Railway verify API error:", error.message);
      return { success: false, results: [], error: error.message };
    }
    return { success: false, results: [], error: "Unknown error" };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: photoId } = await params;

    // Get the source photo with its embedding
    const sourcePhoto = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId: user.id,
      },
    });

    if (!sourcePhoto) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check if the photo has an embedding and a segmented URL
    const hasEmbedding = await prisma.$queryRaw<[{ has_embedding: boolean }]>`
      SELECT embedding IS NOT NULL as has_embedding
      FROM "Photo"
      WHERE id = ${photoId}
    `;

    if (!hasEmbedding[0]?.has_embedding) {
      return NextResponse.json(
        { error: "Photo does not have an embedding vector" },
        { status: 400 }
      );
    }

    if (!sourcePhoto.segmentedUrl) {
      return NextResponse.json(
        { error: "Photo does not have a segmented image" },
        { status: 400 }
      );
    }

    // Find the 4 most similar photos using cosine distance
    // The <-> operator calculates cosine distance (0 = identical, 2 = opposite)
    // We exclude the source photo itself and only search within user's photos
    const similarPhotos = await prisma.$queryRaw<
      Array<{
        id: string;
        filename: string;
        url: string;
        croppedUrl: string | null;
        segmentedUrl: string | null;
        title: string | null;
        description: string | null;
        takenAt: Date | null;
        latitude: number | null;
        longitude: number | null;
        distance: number;
      }>
    >`
      SELECT
        id,
        filename,
        url,
        "croppedUrl",
        "segmentedUrl",
        title,
        description,
        "takenAt",
        latitude,
        longitude,
        (embedding <-> (SELECT embedding FROM "Photo" WHERE id = ${photoId})) as distance
      FROM "Photo"
      WHERE
        "userId" = ${user.id}
        AND id != ${photoId}
        AND embedding IS NOT NULL
        AND "segmentedUrl" IS NOT NULL
      ORDER BY embedding <-> (SELECT embedding FROM "Photo" WHERE id = ${photoId})
      LIMIT 4
    `;

    // If no similar photos found, return empty array
    if (similarPhotos.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch the query image (source photo's segmented image)
    logger.log({ action: "fetch_query_image", url: sourcePhoto.segmentedUrl });
    const queryBuffer = await fetchImageAsBuffer(sourcePhoto.segmentedUrl);

    // Fetch candidate images (similar photos' segmented images)
    const candidateBuffers: Buffer[] = [];
    for (const photo of similarPhotos) {
      if (photo.segmentedUrl) {
        logger.log({ action: "fetch_candidate_image", url: photo.segmentedUrl });
        const buffer = await fetchImageAsBuffer(photo.segmentedUrl);
        candidateBuffers.push(buffer);
      }
    }

    // Call Railway /verify API
    const verifyResult = await callRailwayVerify(queryBuffer, candidateBuffers);

    if (!verifyResult.success || verifyResult.results.length === 0) {
      // If verification fails, fall back to vector similarity scores
      logger.warn("Verification failed, using vector similarity scores");
      const photosWithScores = similarPhotos.map((photo: typeof similarPhotos[0]) => ({
        ...photo,
        similarityScore: Math.max(0, Math.min(100, (1 - photo.distance / 2) * 100)),
        confidence: "unknown" as const,
        isSame: false,
        matches: 0,
        inliers: 0,
      }));
      return NextResponse.json(photosWithScores);
    }

    // Combine verification results with photo data
    const photosWithVerification = verifyResult.results.map((result) => {
      const photo = similarPhotos[result.candidate_index];
      return {
        ...photo,
        similarityScore: result.score,
        confidence: result.confidence,
        isSame: result.is_same,
        matches: result.matches,
        inliers: result.inliers,
      };
    });

    // Sort by verification score (descending)
    photosWithVerification.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json(photosWithVerification);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.error("Error finding similar photos:", error);
    return NextResponse.json(
      { error: "Failed to find similar photos" },
      { status: 500 }
    );
  }
}
