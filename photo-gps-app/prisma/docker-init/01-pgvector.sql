-- Runs once when the Postgres data dir is first initialized (pgvector image).
-- The Prisma migration also creates this extension, but doing it here means a
-- fresh container is ready for vector columns before any migration runs.
CREATE EXTENSION IF NOT EXISTS vector;
