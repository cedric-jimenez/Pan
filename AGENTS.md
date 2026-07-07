# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, etc.) when working with code in this repository.

## Repository Overview

**Pan** is a monorepo containing a Next.js web app for managing field photos of spotted salamanders (*Salamandra salamandra*). The app extracts GPS/EXIF data, runs AI-based detection/segmentation/identification pipelines, and lets researchers track individual animals.

All development work lives in the `photo-gps-app/` subdirectory. Run all commands from there.

## Commands

```bash
cd photo-gps-app

# Development
npm run dev          # Start dev server on http://localhost:3000

# Build
npm run build

# Linting & formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Type checking
npm run type-check

# Tests
npm test                        # Watch mode
npm test -- --run               # Single run (CI mode)
npm test -- Button.test.tsx     # Run a single test file
npm run test:ui                 # Interactive UI
npm run test:coverage

# Database
npx prisma generate             # Regenerate client after schema changes
npx prisma db push              # Apply schema to database
npx prisma studio               # Open database GUI
npx prisma db push --force-reset  # Reset database
```

## Architecture

### Stack

- **Framework**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js v5 beta — JWT strategy, credentials + Google OAuth
- **Database**: PostgreSQL + Prisma ORM, with **pgvector** extension for 384-dim DINOv2 embeddings
- **File storage**: Cloudflare R2 via AWS SDK S3-compatible API (`lib/blob.ts`)
- **Maps**: Leaflet / react-leaflet
- **Validation**: Zod schemas in `lib/validations.ts`
- **Testing**: Vitest + React Testing Library (tests in `__tests__/`)

### AI Pipeline (Railway microservice)

A separate Python service (hosted on Railway, URL in `RAILWAY_API_URL` env var) handles all ML work. The Next.js app calls it synchronously on upload:

1. `/crop-salamander` — YOLOv8 Nano detection, returns a base64 cropped image
2. `/segment-salamander` — Background removal, returns a base64 segmented image
3. `/embed` — DINOv2 embedding (384-dim vector) of the segmented image
4. `/verify` — Patch-level verification between a query and candidate images (used by `/api/photos/[id]/similar`)

If `RAILWAY_API_URL` is not set, all ML steps are silently skipped and the original photo is stored without crops/embeddings.

### Data model (key relations)

```
User → Photo[] (one-to-many, cascade delete)
User → Individual[] (one-to-many, cascade delete)
Individual → Photo[] (one-to-many, set null on delete)
Photo.embedding — vector(384), stored via pgvector
```

Each `Photo` can have three images in R2: `url` (full, 600px), `croppedUrl` (YOLO crop, 400px), `segmentedUrl` (background removed, 400px).

### Upload flow (`app/api/photos/upload/route.ts`)

1. Validate file, check for duplicate by `originalName`
2. Parse EXIF with `exifr`
3. Resize/compress to JPEG with `sharp`
4. Call Railway `/crop-salamander` → upload cropped image to R2
5. If salamander detected: call `/segment-salamander` → call `/embed` → upload segmented image to R2
6. `prisma.photo.create(...)` — stores all metadata
7. Store embedding via `prisma.$executeRawUnsafe("UPDATE ... SET embedding = $1::vector")` — **required** because Prisma's `create`/`update` cannot handle `Unsupported("vector(384)")` fields

The same crop/segment/embed logic is duplicated in `app/api/photos/bulk-process/route.ts` for reprocessing existing photos.

### Security middleware (`middleware.ts`)

Runs on all routes. Two layers:

1. **Rate limiting** — in-memory, keyed by IP or session token. Limits configured via env vars (see `lib/rate-limit-config.ts` and `lib/constants.ts`).
2. **CSRF** — double-submit cookie pattern. GET requests generate the `csrf-token` cookie; POST/PUT/PATCH/DELETE validate that cookie against the `x-csrf-token` header. NextAuth's `/api/auth/` routes are excluded.

### Client-side API calls

Always use `fetchWithCsrf()` from `lib/fetch-with-csrf.ts` instead of bare `fetch()` for any mutating request. It automatically reads the `csrf-token` cookie and injects it as the `x-csrf-token` header.

### Auth pattern

Server-side: call `requireAuth()` (throws `"Unauthorized"`) or `getCurrentUser()` from `lib/session.ts`. These wrap NextAuth's `auth()`. API routes catch `error.message === "Unauthorized"` and return 401.

### pgvector similarity search

The `/api/photos/[id]/similar` endpoint:
1. Finds the 100 nearest neighbors using `embedding <-> (SELECT embedding ...)` cosine distance via raw SQL (generous pool: cosine barely separates individuals, so the true match can rank well past the first dozen)
2. Fetches all segmented images
3. Calls Railway `/verify` for patch-level cross-verification
4. Falls back to pure vector scores if `/verify` fails

### Constants

Shared numeric constants (image sizes, timeouts, rate limits, auth settings) live in `lib/constants.ts`. Use these rather than hardcoding values.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Prisma (pooled / direct PostgreSQL URLs) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 storage |
| `RAILWAY_API_URL` | Python ML microservice base URL |
| `YOLO_CONFIDENCE_THRESHOLD` | Min confidence for salamander detection (default: 0.5) |
| `YOLO_TIMEOUT_MS` | Timeout for Railway API calls |
| `SEGMENTED_IMAGE_SIZE` | Pixel size for segmented images used for embedding (default: 400) |

## CI

`.github/workflows/ci.yml` runs on PRs to `main`/`master` and pushes to `claude/**` branches:

1. **lint-and-test**: ESLint → Vitest with coverage (`--run`, thresholds enforced via `vitest.config.ts`) → TypeScript type check (`--skipLibCheck`, non-blocking)
2. **build**: `next build` (depends on lint-and-test)

Coverage thresholds (`coverage.thresholds` in `vitest.config.ts`) act as a regression floor — the job fails if global statements/branches/functions/lines coverage drops below the configured percentages. The HTML/JSON coverage report is uploaded as a CI artifact (`coverage-report`) for inspection.

The build step uses dummy env values for Postgres and R2 — the app must gracefully handle missing credentials at build time.
