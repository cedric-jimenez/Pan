import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

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

    // Check if the photo has an embedding
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
      ORDER BY embedding <-> (SELECT embedding FROM "Photo" WHERE id = ${photoId})
      LIMIT 4
    `;

    // Convert distance to similarity score (0-100%)
    // Cosine distance ranges from 0 to 2, we convert to similarity percentage
    // distance = 0 means identical (100% similar)
    // distance = 2 means opposite (0% similar)
    const photosWithScores = similarPhotos.map((photo) => ({
      ...photo,
      similarityScore: Math.max(0, Math.min(100, (1 - photo.distance / 2) * 100)),
    }));

    return NextResponse.json(photosWithScores);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error finding similar photos:", error);
    return NextResponse.json(
      { error: "Failed to find similar photos" },
      { status: 500 }
    );
  }
}
