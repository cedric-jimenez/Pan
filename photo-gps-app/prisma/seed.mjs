/**
 * Seed demo data for local development.
 *
 * Creates a demo user, a couple of individual salamanders, and several photos
 * with deterministic pgvector embeddings (clustered per individual so the
 * similarity search returns meaningful results). Placeholder images are
 * generated offline with `sharp` and written to `public/seed/`, so they render
 * via next/image with no remote config and no network access.
 *
 * Run with: npm run db:seed   (after npm run db:up + migrations)
 *
 * Demo login:  demo@pan.local  /  password
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import sharp from "sharp"
import crypto from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const prisma = new PrismaClient()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_IMG_DIR = path.join(__dirname, "..", "public", "seed")
const EMBEDDING_DIM = 384

// --- deterministic helpers ---------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(str) {
  return crypto.createHash("sha256").update(str).digest().readUInt32LE(0)
}

/** Normalized 384-dim vector built from a base seed plus per-photo noise. */
function clusteredEmbedding(baseSeed, noiseSeed, noise = 0.15) {
  const baseRand = mulberry32(baseSeed)
  const noiseRand = mulberry32(noiseSeed)
  const vec = new Array(EMBEDDING_DIM)
  let norm = 0
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const base = baseRand() * 2 - 1
    const v = base + (noiseRand() * 2 - 1) * noise
    vec[i] = v
    norm += v * v
  }
  norm = Math.sqrt(norm) || 1
  return vec.map((v) => v / norm)
}

function vectorLiteral(vec) {
  return `[${vec.join(",")}]`
}

// --- placeholder image generation -------------------------------------------

async function makePlaceholder(filename, label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="400" height="400" fill="hsl(${hue}, 45%, 35%)"/>
    <rect x="20" y="20" width="360" height="360" fill="none" stroke="hsl(${hue}, 60%, 70%)" stroke-width="4" rx="16"/>
    <text x="200" y="180" font-family="sans-serif" font-size="120" text-anchor="middle">🦎</text>
    <text x="200" y="300" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle">${label}</text>
  </svg>`
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()
  await writeFile(path.join(SEED_IMG_DIR, filename), buffer)
  return buffer.length
}

// --- seed --------------------------------------------------------------------

async function main() {
  await mkdir(SEED_IMG_DIR, { recursive: true })

  // Demo user
  const passwordHash = await bcrypt.hash("password", 10)
  const user = await prisma.user.upsert({
    where: { email: "demo@pan.local" },
    update: {},
    create: { email: "demo@pan.local", name: "Demo Researcher", password: passwordHash },
  })

  // Wipe previous demo content so the seed is idempotent.
  await prisma.photo.deleteMany({ where: { userId: user.id } })
  await prisma.individual.deleteMany({ where: { userId: user.id } })

  const individualsSpec = [
    { name: "Sally", hue: 110 },
    { name: "Pepper", hue: 25 },
  ]

  let photoCount = 0
  for (const spec of individualsSpec) {
    const individual = await prisma.individual.create({
      data: { name: spec.name, userId: user.id },
    })
    const baseSeed = seedFrom(`individual:${spec.name}`)

    // 3 photos per individual, near-duplicate embeddings (same animal).
    for (let i = 1; i <= 3; i++) {
      photoCount++
      const filename = `${spec.name.toLowerCase()}-${i}.jpg`
      const fileSize = await makePlaceholder(filename, `${spec.name} #${i}`, spec.hue)
      const url = `/seed/${filename}`

      const photo = await prisma.photo.create({
        data: {
          userId: user.id,
          individualId: individual.id,
          filename,
          originalName: filename,
          fileSize,
          croppedFileSize: fileSize,
          segmentedFileSize: fileSize,
          mimeType: "image/jpeg",
          url,
          croppedUrl: url,
          segmentedUrl: url,
          latitude: 45.2 + (Math.random() - 0.5) * 0.05,
          longitude: 5.72 + (Math.random() - 0.5) * 0.05,
          takenAt: new Date(Date.now() - photoCount * 86400000),
          title: `${spec.name} sighting ${i}`,
          isCropped: true,
          cropConfidence: 0.95,
          salamanderDetected: true,
          embeddingDim: EMBEDDING_DIM,
          embedModel: "seed",
        },
      })

      const embedding = clusteredEmbedding(baseSeed, seedFrom(`${spec.name}:${i}`))
      await prisma.$executeRawUnsafe(
        `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
        vectorLiteral(embedding),
        photo.id
      )
    }
  }

  // A couple of unassigned photos (detected but not yet linked to an individual).
  for (let i = 1; i <= 2; i++) {
    photoCount++
    const filename = `unassigned-${i}.jpg`
    const fileSize = await makePlaceholder(filename, `Unassigned #${i}`, 210)
    const url = `/seed/${filename}`
    const photo = await prisma.photo.create({
      data: {
        userId: user.id,
        filename,
        originalName: filename,
        fileSize,
        croppedFileSize: fileSize,
        segmentedFileSize: fileSize,
        mimeType: "image/jpeg",
        url,
        croppedUrl: url,
        segmentedUrl: url,
        latitude: 45.2 + (Math.random() - 0.5) * 0.05,
        longitude: 5.72 + (Math.random() - 0.5) * 0.05,
        takenAt: new Date(Date.now() - photoCount * 86400000),
        title: `Unassigned sighting ${i}`,
        isCropped: true,
        cropConfidence: 0.9,
        salamanderDetected: true,
        embeddingDim: EMBEDDING_DIM,
        embedModel: "seed",
      },
    })
    const embedding = clusteredEmbedding(seedFrom(`unassigned:${i}`), seedFrom(`u:${i}`), 0.3)
    await prisma.$executeRawUnsafe(
      `UPDATE "Photo" SET embedding = $1::vector WHERE id = $2`,
      vectorLiteral(embedding),
      photo.id
    )
  }

  console.log(`Seeded user demo@pan.local (password: "password")`)
  console.log(`  ${individualsSpec.length} individuals, ${photoCount} photos with embeddings`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
