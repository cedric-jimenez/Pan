import { describe, it, expect, vi } from "vitest"
import { suggestIndividualName } from "@/lib/suggest-individual-name"

function mockFetch(names: string[]): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ results: names.map((first) => ({ name: { first } })) }), {
      status: 200,
    })
  ) as unknown as typeof fetch
}

describe("suggestIndividualName", () => {
  it("returns the first API name when there are no collisions", async () => {
    const name = await suggestIndividualName([], { fetchImpl: mockFetch(["Lila", "Hugo"]) })
    expect(name).toBe("Lila")
  })

  it("skips names already taken by the user (case-insensitive)", async () => {
    const name = await suggestIndividualName(["lila"], {
      fetchImpl: mockFetch(["Lila", "Hugo"]),
    })
    expect(name).toBe("Hugo")
  })

  it("suffixes when every API name collides", async () => {
    const name = await suggestIndividualName(["Lila", "Hugo"], {
      fetchImpl: mockFetch(["Lila", "Hugo"]),
    })
    // Falls back to the first candidate with a numeric suffix.
    expect(name).toBe("Lila 2")
  })

  it("falls back to a built-in name when the API fails", async () => {
    const failing = vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch
    const name = await suggestIndividualName([], { fetchImpl: failing })
    expect(name).toBeTruthy()
    expect(typeof name).toBe("string")
  })

  it("falls back when fetch throws (network/timeout)", async () => {
    const throwing = vi.fn(async () => {
      throw new Error("aborted")
    }) as unknown as typeof fetch
    const name = await suggestIndividualName(["Lila"], { fetchImpl: throwing })
    expect(name).toBeTruthy()
    expect(name.toLowerCase()).not.toBe("lila")
  })
})
