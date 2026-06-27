/**
 * Suggest a human-friendly name for a newly created Individual.
 *
 * Pulls a first name from the free, key-less randomuser.me API (server-side, so
 * no CORS), and guarantees the result does not collide with the user's existing
 * individual names (the Individual table is unique on [userId, name]). Falls back
 * to a small built-in list when the external API is slow or unavailable, so name
 * suggestion never blocks identification.
 */

const RANDOMUSER_URL = "https://randomuser.me/api/?results=5&inc=name&nat=fr"
const DEFAULT_TIMEOUT_MS = 4000

// Used when randomuser.me is unreachable. Kept short and neutral.
const FALLBACK_NAMES = [
  "Lila",
  "Hugo",
  "Nina",
  "Léo",
  "Manon",
  "Gabin",
  "Jade",
  "Noé",
  "Alba",
  "Tom",
]

interface SuggestNameOptions {
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

async function fetchCandidateNames(options?: SuggestNameOptions): Promise<string[]> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(RANDOMUSER_URL, { signal: controller.signal })
    if (!response.ok) {
      return []
    }
    const data = (await response.json()) as {
      results?: Array<{ name?: { first?: string } }>
    }
    return (data.results ?? [])
      .map((r) => r.name?.first?.trim())
      .filter((name): name is string => Boolean(name))
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Append a numeric suffix until the name is free, e.g. "Lila" -> "Lila 2".
 */
function uniquify(name: string, existing: Set<string>): string {
  if (!existing.has(name.toLowerCase())) {
    return name
  }
  let n = 2
  while (existing.has(`${name} ${n}`.toLowerCase())) {
    n++
  }
  return `${name} ${n}`
}

export async function suggestIndividualName(
  existingNames: Iterable<string>,
  options?: SuggestNameOptions
): Promise<string> {
  const existing = new Set([...existingNames].map((n) => n.toLowerCase()))

  const candidates = await fetchCandidateNames(options)

  // Prefer a fresh, non-colliding name straight from the API.
  for (const name of candidates) {
    if (!existing.has(name.toLowerCase())) {
      return name
    }
  }

  // Every API name collided (or the API was down): fall back, then suffix.
  const seed =
    candidates[0] ?? FALLBACK_NAMES.find((n) => !existing.has(n.toLowerCase())) ?? FALLBACK_NAMES[0]
  return uniquify(seed, existing)
}
