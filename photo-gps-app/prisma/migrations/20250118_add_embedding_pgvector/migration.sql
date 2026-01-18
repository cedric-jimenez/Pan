-- Enable pgvector extension (required for vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to Photo table
ALTER TABLE "Photo" ADD COLUMN "embedding" vector(384);
ALTER TABLE "Photo" ADD COLUMN "embeddingDim" INTEGER;
ALTER TABLE "Photo" ADD COLUMN "embedModel" TEXT;

-- Create index for similarity search (optional but recommended for performance)
-- Using IVFFlat index for approximate nearest neighbor search
-- CREATE INDEX IF NOT EXISTS "Photo_embedding_idx" ON "Photo" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Note: Uncomment above line after you have sufficient data (recommended: at least 1000 rows)
