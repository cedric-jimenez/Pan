import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logger } from "@/lib/logger";
import { getRailwayTimeoutMs, postFormDataToRailway } from "@/lib/photo-pipeline";

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
 * Call Railway /verify API to perform DINOv2 patch-level verification
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
    cosine_similarity: number;
    matches: number;
    inliers: number;
  }>;
  error?: string;
}> {
  const formData = new FormData();
  formData.append(
    "query",
    new Blob([Uint8Array.from(queryBuffer)], { type: "image/jpeg" }),
    "query.jpg"
  );
  candidateBuffers.forEach((buffer, i) => {
    formData.append(
      "candidates",
      new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" }),
      `candidate_${i}.jpg`
    );
  });

  logger.log({
    action: "railway_verify_request",
    candidates_count: candidateBuffers.length,
    query_size_bytes: queryBuffer.length,
    timeout_ms: getRailwayTimeoutMs(),
  });

  const startTime = Date.now();
  const result = await postFormDataToRailway("/verify", formData);
  const duration = Date.now() - startTime;

  if (!result.ok) {
    logger.warn({ action: "railway_verify_error", error: result.error, duration_ms: duration });
    return { success: false, results: [], error: result.error };
  }

  const data = result.data as {
    success: boolean;
    results?: Array<{
      candidate_index: number;
      is_same: boolean;
      score: number;
      confidence: string;
      cosine_similarity: number;
      matches: number;
      inliers: number;
    }>;
  };

  logger.log({
    action: "railway_verify_response",
    success: data.success,
    results_count: data.results?.length || 0,
    duration_ms: duration,
    results: data.results,
  });

  return {
    success: data.success,
    results: data.results || [],
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: photoId } = await params;

    // When linkedOnly is set, restrict the candidate pool to photos already
    // attached to an individual — used by the guided bulk-identify flow to match
    // an import strictly against the existing catalogue (cheaper /verify too).
    const { searchParams } = new URL(request.url);
    const linkedOnly =
      searchParams.get("linkedOnly") === "1" || searchParams.get("linkedOnly") === "true";

    logger.log({
      action: "similar_photos_request",
      photoId,
      userId: user.id,
      linkedOnly,
    });

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

    // Find the most similar photos using cosine distance.
    // SIFT+RANSAC verification re-ranks these, but can only surface a true match
    // that retrieval actually returned — and the DINOv2 GeM cosine barely
    // separates individuals (same/diff score gap ~0.017, top-1 ~61%): a true
    // same-individual match can rank well past the first dozen neighbours
    // (observed at rank #41 in prod). So retrieve a generous candidate pool
    // (SIFT verification is cheap and ~0 false positives) to give the verifier
    // a chance to find it. TODO: improve the retrieval embedding to shrink this.
    // The <-> operator calculates cosine distance (0 = identical, 2 = opposite)
    // We exclude the source photo itself and only search within user's photos
    const linkedFilter = linkedOnly
      ? Prisma.sql`AND p."individualId" IS NOT NULL`
      : Prisma.empty;

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
        individualId: string | null;
        individualName: string | null;
        distance: number;
      }>
    >(Prisma.sql`
      SELECT
        p.id,
        p.filename,
        p.url,
        p."croppedUrl",
        p."segmentedUrl",
        p.title,
        p.description,
        p."takenAt",
        p.latitude,
        p.longitude,
        p."individualId",
        i.name as "individualName",
        (p.embedding <-> (SELECT embedding FROM "Photo" WHERE id = ${photoId})) as distance
      FROM "Photo" p
      LEFT JOIN "Individual" i ON i.id = p."individualId"
      WHERE
        p."userId" = ${user.id}
        AND p.id != ${photoId}
        AND p.embedding IS NOT NULL
        AND p."segmentedUrl" IS NOT NULL
        ${linkedFilter}
      ORDER BY p.embedding <-> (SELECT embedding FROM "Photo" WHERE id = ${photoId})
      LIMIT 100
    `);

    // If no similar photos found, return empty array
    if (similarPhotos.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch the query image (source photo's segmented image)
    logger.log({ action: "fetch_query_image", url: sourcePhoto.segmentedUrl });
    const queryBuffer = await fetchImageAsBuffer(sourcePhoto.segmentedUrl);

    // Fetch candidate images (similar photos' segmented images) in parallel.
    // Order is preserved so candidate_index from /verify maps back to
    // similarPhotos. The SQL guarantees segmentedUrl is non-null.
    const candidateBuffers: Buffer[] = await Promise.all(
      similarPhotos.map((photo) => fetchImageAsBuffer(photo.segmentedUrl as string))
    );

    // Call Railway /verify API
    const verifyResult = await callRailwayVerify(queryBuffer, candidateBuffers);

    if (!verifyResult.success || verifyResult.results.length === 0) {
      // If verification fails, fall back to vector similarity scores
      // Convert cosine distance (0=identical, 2=opposite) to cosine similarity (1=identical, -1=opposite)
      logger.warn("Verification failed, using vector similarity scores");
      const photosWithScores = similarPhotos.map((photo: typeof similarPhotos[0]) => {
        const cosineSimilarity = 1 - photo.distance;
        return {
          ...photo,
          similarityScore: Math.max(0, Math.min(1, cosineSimilarity)),
          confidence: "unknown" as const,
          isSame: false,
          cosine_similarity: cosineSimilarity,
          matches: 0,
          inliers: 0,
        };
      });

      logger.log({
        action: "similar_photos_response",
        photoId,
        results_count: photosWithScores.length,
        fallback: true,
        results: photosWithScores.map((photo) => ({
          id: photo.id,
          similarityScore: photo.similarityScore,
          distance: photo.distance,
        })),
      });

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
        cosine_similarity: result.cosine_similarity,
        matches: result.matches,
        inliers: result.inliers,
      };
    });

    // Sort by verification score (descending)
    photosWithVerification.sort((a, b) => b.similarityScore - a.similarityScore);

    logger.log({
      action: "similar_photos_response",
      photoId,
      results_count: photosWithVerification.length,
      results: photosWithVerification.map((photo) => ({
        id: photo.id,
        similarityScore: photo.similarityScore,
        confidence: photo.confidence,
        isSame: photo.isSame,
        cosine_similarity: photo.cosine_similarity,
        matches: photo.matches,
        inliers: photo.inliers,
      })),
    });

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
