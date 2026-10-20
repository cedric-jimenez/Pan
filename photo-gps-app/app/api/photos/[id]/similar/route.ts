import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { logger } from "@/lib/logger";
import { postJsonToRailway } from "@/lib/photo-pipeline";
import { API_TIMEOUTS, IDENTIFICATION } from "@/lib/constants";

// Comparing against the whole catalogue can take a while on a cold pan-py cache.
export const maxDuration = 60;

interface VerifyResult {
  candidate_index: number;
  is_same: boolean;
  score: number;
  confidence: string;
  cosine_similarity: number;
  matches: number;
  inliers: number;
}

/**
 * Call Railway /verify-urls: SIFT+RANSAC verification of the query against every
 * candidate, by image URL. pan-py caches each image's SIFT features, so each
 * photo is downloaded and analysed only once across searches.
 */
async function callRailwayVerifyUrls(
  queryUrl: string,
  candidateUrls: string[]
): Promise<{ success: boolean; results: VerifyResult[]; error?: string }> {
  logger.log({
    action: "railway_verify_urls_request",
    candidates_count: candidateUrls.length,
    timeout_ms: API_TIMEOUTS.VERIFY_URLS_TIMEOUT_MS,
  });

  const startTime = Date.now();
  const result = await postJsonToRailway(
    "/verify-urls",
    { query_url: queryUrl, candidate_urls: candidateUrls },
    API_TIMEOUTS.VERIFY_URLS_TIMEOUT_MS
  );
  const duration = Date.now() - startTime;

  if (!result.ok) {
    logger.warn({ action: "railway_verify_error", error: result.error, duration_ms: duration });
    return { success: false, results: [], error: result.error };
  }

  const data = result.data as { success: boolean; message?: string; results?: VerifyResult[] };

  logger.log({
    action: "railway_verify_urls_response",
    success: data.success,
    message: data.message,
    results_count: data.results?.length || 0,
    duration_ms: duration,
  });

  return { success: data.success, results: data.results || [] };
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
    // an import strictly against the existing catalogue.
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

    // Candidates = ALL of the user's analysed photos (up to MAX_VERIFY_CANDIDATES),
    // not just the nearest embeddings. The DINOv2 embedding mostly groups photos by
    // session (light, background), so a true same-individual match from another
    // date can rank far down (observed: rank #41, then outside the top 100 once the
    // catalogue grew) and would never be verified. SIFT verification on the whole
    // catalogue is affordable because pan-py caches each photo's features.
    // The embedding distance only orders the list (used by the fallback below).
    // Note: pgvector's <-> is the L2 distance; on normalised vectors it orders
    // like cosine distance.
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
      LIMIT ${IDENTIFICATION.MAX_VERIFY_CANDIDATES}
    `);

    // If no similar photos found, return empty array
    if (similarPhotos.length === 0) {
      return NextResponse.json([]);
    }

    // The SQL guarantees segmentedUrl is non-null; order is preserved so
    // candidate_index from /verify-urls maps back to similarPhotos.
    const verifyResult = await callRailwayVerifyUrls(
      sourcePhoto.segmentedUrl,
      similarPhotos.map((photo) => photo.segmentedUrl as string)
    );

    if (!verifyResult.success || verifyResult.results.length === 0) {
      // If verification fails, fall back to the nearest embeddings.
      // Convert cosine distance (0=identical, 2=opposite) to cosine similarity (1=identical, -1=opposite)
      logger.warn("Verification failed, using vector similarity scores");
      const photosWithScores = similarPhotos
        .slice(0, IDENTIFICATION.MAX_RESULTS)
        .map((photo: typeof similarPhotos[0]) => {
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
      });

      return NextResponse.json(photosWithScores);
    }

    // Combine verification results with photo data
    const photosWithVerification = verifyResult.results
      .filter((result) => similarPhotos[result.candidate_index] !== undefined)
      .map((result) => {
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

    // Sort by verification score (descending), keep the best MAX_RESULTS plus
    // every same-individual match (is_same also needs an inlier floor, so a
    // match can rank below a higher-ratio coincidence).
    photosWithVerification.sort((a, b) => b.similarityScore - a.similarityScore);
    const response = photosWithVerification.filter(
      (photo, rank) => rank < IDENTIFICATION.MAX_RESULTS || photo.isSame
    );

    logger.log({
      action: "similar_photos_response",
      photoId,
      candidates_count: similarPhotos.length,
      results_count: response.length,
      same_count: response.filter((photo) => photo.isSame).length,
      top: response.slice(0, 10).map((photo) => ({
        id: photo.id,
        similarityScore: photo.similarityScore,
        isSame: photo.isSame,
        inliers: photo.inliers,
      })),
    });

    return NextResponse.json(response);
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
