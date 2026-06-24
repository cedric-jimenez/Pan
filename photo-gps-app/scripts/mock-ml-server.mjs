#!/usr/bin/env node
/**
 * Mock ML service for local development of the Pan web app.
 *
 * Stands in for the `pan-py` Railway microservice so the Next.js app can run
 * the full upload / similarity pipeline without the real Python (YOLO + DINOv2)
 * service. It implements the four endpoints the app calls and returns plausible
 * fake data that matches the real HTTP contract.
 *
 *   POST /crop-salamander     -> echoes the uploaded image back as the "crop"
 *   POST /segment-salamander  -> echoes the uploaded image back as the "segment"
 *   POST /embed               -> deterministic 384-dim unit vector (hash of bytes)
 *   POST /verify              -> per-candidate scores (deterministic, embed-consistent)
 *   GET  /health              -> { status: "ok" }
 *
 * Usage:
 *   npm run mock:ml                 # listens on http://localhost:8000
 *   MOCK_ML_PORT=9000 npm run mock:ml
 *
 * Then point the app at it in .env.local:
 *   RAILWAY_API_URL=http://localhost:8000
 *
 * No dependencies — pure Node built-ins. Dev/test only; never deploy this.
 */

import http from "node:http"
import crypto from "node:crypto"

const PORT = parseInt(process.env.MOCK_ML_PORT || "8000", 10)
const EMBEDDING_DIM = 384

// ---------------------------------------------------------------------------
// Multipart/form-data parsing (binary-safe, no deps)
// ---------------------------------------------------------------------------

/** Read the entire request body into a single Buffer. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

/** Find every index of `needle` inside `buf` starting at `from`. */
function indexOfAll(buf, needle, from = 0) {
  const positions = []
  let i = buf.indexOf(needle, from)
  while (i !== -1) {
    positions.push(i)
    i = buf.indexOf(needle, i + needle.length)
  }
  return positions
}

/**
 * Parse a multipart/form-data body into parts.
 * @returns Array<{ name: string, filename: string|null, data: Buffer }>
 */
function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "")
  if (!match) return []
  const boundary = `--${match[1] || match[2]}`
  const delimiter = Buffer.from(`\r\n${boundary}`)

  // Prepend a CRLF so the first boundary is matched uniformly by `delimiter`.
  const buf = Buffer.concat([Buffer.from("\r\n"), body])
  const starts = indexOfAll(buf, delimiter)

  const parts = []
  for (let i = 0; i < starts.length - 1; i++) {
    // Skip the boundary line itself (boundary + CRLF).
    const partStart = starts[i] + delimiter.length + 2
    const partEnd = starts[i + 1]
    if (partStart >= partEnd) continue

    const part = buf.subarray(partStart, partEnd)
    const headerEnd = part.indexOf("\r\n\r\n")
    if (headerEnd === -1) continue

    const headers = part.subarray(0, headerEnd).toString("utf8")
    const data = part.subarray(headerEnd + 4)

    const nameMatch = /name="([^"]*)"/i.exec(headers)
    const fileMatch = /filename="([^"]*)"/i.exec(headers)
    parts.push({
      name: nameMatch ? nameMatch[1] : "",
      filename: fileMatch ? fileMatch[1] : null,
      data,
    })
  }
  return parts
}

// ---------------------------------------------------------------------------
// Deterministic fake ML
// ---------------------------------------------------------------------------

/** Small deterministic PRNG seeded from a 32-bit integer. */
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

/**
 * Produce a deterministic, L2-normalized 384-dim embedding from image bytes.
 * The same input always yields the same vector, so similarity search is stable
 * across re-uploads and re-processing.
 */
function deterministicEmbedding(buffer) {
  const hash = crypto.createHash("sha256").update(buffer).digest()
  const seed = hash.readUInt32LE(0)
  const rand = mulberry32(seed)

  const vec = new Array(EMBEDDING_DIM)
  let norm = 0
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Map uniform [0,1) to roughly [-1,1) for a centered distribution.
    const v = rand() * 2 - 1
    vec[i] = v
    norm += v * v
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] = vec[i] / norm
  return vec
}

function cosineSimilarity(a, b) {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

// ---------------------------------------------------------------------------
// Endpoint handlers
// ---------------------------------------------------------------------------

function firstFilePart(parts, name) {
  return parts.find((p) => p.name === name && p.filename !== null) || null
}

function handleCrop(parts) {
  const file = firstFilePart(parts, "file")
  if (!file || file.data.length === 0) {
    return { success: true, detected: false, cropped_image: null, bounding_box: null }
  }
  return {
    success: true,
    detected: true,
    // Echo the uploaded image so croppedUrl shows the real photo in the gallery.
    cropped_image: `data:image/jpeg;base64,${file.data.toString("base64")}`,
    bounding_box: { x: 0, y: 0, width: 400, height: 400, confidence: 0.95 },
  }
}

function handleSegment(parts) {
  const file = firstFilePart(parts, "file")
  if (!file || file.data.length === 0) {
    return { success: true, detected: false, segmented_image: null }
  }
  return {
    success: true,
    detected: true,
    segmented_image: `data:image/jpeg;base64,${file.data.toString("base64")}`,
  }
}

function handleEmbed(parts) {
  const file = firstFilePart(parts, "file")
  if (!file || file.data.length === 0) {
    return { success: false, embedding: null, embedding_dim: EMBEDDING_DIM, model: "mock-dinov2" }
  }
  return {
    success: true,
    embedding: deterministicEmbedding(file.data),
    embedding_dim: EMBEDDING_DIM,
    model: "mock-dinov2",
  }
}

function handleVerify(parts) {
  const query = firstFilePart(parts, "query")
  const candidates = parts.filter((p) => p.name === "candidates" && p.filename !== null)
  if (!query || candidates.length === 0) {
    return { success: false, results: [], error: "Missing query or candidates" }
  }

  const queryEmb = deterministicEmbedding(query.data)
  const results = candidates.map((candidate, index) => {
    const sim = cosineSimilarity(queryEmb, deterministicEmbedding(candidate.data))
    // Map cosine [-1,1] to a 0..1 score; treat the same bytes (sim ~= 1) as a match.
    const score = (sim + 1) / 2
    const isSame = sim > 0.99
    return {
      candidate_index: index,
      is_same: isSame,
      score,
      confidence: isSame ? "high" : score > 0.6 ? "medium" : "low",
      cosine_similarity: sim,
      matches: isSame ? 120 : Math.round(score * 40),
      inliers: isSame ? 95 : Math.round(score * 20),
    }
  })
  return { success: true, results }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const ROUTES = {
  "/crop-salamander": handleCrop,
  "/segment-salamander": handleSegment,
  "/embed": handleEmbed,
  "/verify": handleVerify,
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { "content-type": "application/json" })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === "GET" && (pathname === "/health" || pathname === "/")) {
    return sendJson(res, 200, { status: "ok", service: "mock-ml", endpoints: Object.keys(ROUTES) })
  }

  const handler = ROUTES[pathname]
  if (req.method !== "POST" || !handler) {
    return sendJson(res, 404, { success: false, error: `No mock route for ${req.method} ${pathname}` })
  }

  try {
    const body = await readBody(req)
    const parts = parseMultipart(body, req.headers["content-type"])
    const payload = handler(parts)
    const detail =
      pathname === "/verify"
        ? `${payload.results?.length ?? 0} candidate(s)`
        : payload.detected === false
          ? "no detection"
          : "ok"
    console.log(`[mock-ml] POST ${pathname} -> ${detail}`)
    sendJson(res, 200, payload)
  } catch (err) {
    console.error(`[mock-ml] error on ${pathname}:`, err)
    sendJson(res, 500, { success: false, error: String(err) })
  }
})

server.listen(PORT, () => {
  console.log(`[mock-ml] Mock ML service listening on http://localhost:${PORT}`)
  console.log(`[mock-ml] Point the app at it: RAILWAY_API_URL=http://localhost:${PORT}`)
  console.log(`[mock-ml] Routes: ${Object.keys(ROUTES).join(", ")}`)
})
