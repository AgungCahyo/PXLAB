import { beforeEach, describe, expect, it, vi } from "vitest"

type Call = {
  table: string
  select: string[]
  or: string[]
  eq: Record<string, unknown>
  in?: [string, unknown[]]
  limit?: number
  range?: [number, number]
}

const fake = vi.hoisted(() => {
  const calls: Call[] = []
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = []
  let mode: "missing" | "ranked" = "missing"

  const profiles = [
    {
      id: "u1",
      username: "mira",
      display_name: "Mira Art",
      bio: "Pixel harian",
      avatar_url: null,
      avatar_config: null,
    },
    {
      id: "u2",
      username: "nara",
      display_name: "Nara",
      bio: null,
      avatar_url: null,
      avatar_config: null,
    },
  ]
  const workCounts = [
    { user_id: "u1" },
    { user_id: "u1" },
    { user_id: "u2" },
  ]
  const creation = {
    id: "c1",
    user_id: "u1",
    title: "LangitPixel",
    caption: "langit senja",
    tags: ["pixel_art"],
    type: "pixel",
    category: "icon",
    status: "published",
    published_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    cover_url: null,
    profiles: {
      username: "mira",
      display_name: "Mira Art",
      avatar_url: null,
      avatar_config: null,
    },
  }

  function builder(table: string) {
    const state: Call = { table, select: [], or: [], eq: {} }
    const chain: Record<string, unknown> = {
      select: (columns: string) => {
        state.select.push(columns)
        return chain
      },
      or: (filters: string) => {
        state.or.push(filters)
        return chain
      },
      eq: (column: string, value: unknown) => {
        state.eq[column] = value
        return chain
      },
      in: (column: string, value: unknown[]) => {
        state.in = [column, value]
        return chain
      },
      order: () => chain,
      limit: (value: number) => {
        state.limit = value
        return chain
      },
      range: (from: number, to: number) => {
        state.range = [from, to]
        return chain
      },
      then: (resolve: (value: unknown) => void) => {
        calls.push({ ...state })
        if (table === "profiles") {
          resolve({ data: profiles, count: profiles.length, error: null })
        } else if (table === "creations" && state.select[0]?.includes("cover_url")) {
          resolve({ data: [creation], count: 1, error: null })
        } else if (table === "creations") {
          resolve({ data: workCounts, error: null })
        } else {
          resolve({ data: [], error: null })
        }
      },
    }
    return chain
  }

  return {
    calls,
    rpcCalls,
    setMode: (next: "missing" | "ranked") => {
      mode = next
    },
    client: {
      from: builder,
      rpc: (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args })
        if (mode === "missing") {
          return Promise.resolve({
            data: null,
            error: { code: "PGRST202", message: "Could not find the function" },
          })
        }
        if (name === "search_creators_ranked") {
          return Promise.resolve({
            data: [
              {
                total: 2,
                item: {
                  id: "u1",
                  username: "mira",
                  display_name: "Mira Art",
                  bio: "Pixel harian",
                  avatar_url: null,
                  avatar_config: null,
                  works_count: 2,
                },
              },
              {
                total: 2,
                item: {
                  id: "u1",
                  username: "mira",
                  display_name: "Mira Art",
                  bio: "Pixel harian",
                  avatar_url: null,
                  avatar_config: null,
                  works_count: 2,
                },
              },
            ],
            error: null,
          })
        }
        return Promise.resolve({
          data: [
            { total: 1, item: creation },
            { total: 1, item: creation },
          ],
          error: null,
        })
      },
    },
  }
})

vi.mock("next/server", () => ({ connection: vi.fn() }))
vi.mock("@/lib/supabase/public", () => ({ createPublicSupabase: () => fake.client }))

import { listPublishedCreations } from "@/features/creations/queries"
import { searchCreators } from "@/features/profiles/queries"

describe("unified search queries", () => {
  beforeEach(() => {
    fake.calls.length = 0
    fake.rpcCalls.length = 0
    fake.setMode("missing")
  })

  it("falls back to a single batched creator query when the ranking RPC is absent", async () => {
    const result = await searchCreators("  mi  ")
    const profileCall = fake.calls.find((call) => call.table === "profiles")
    const countCall = fake.calls.find(
      (call) => call.table === "creations" && !call.select[0]?.includes("cover_url"),
    )

    expect(result.failed).toBe(false)
    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(profileCall?.or[0]).toBe("username.ilike.%mi%,display_name.ilike.%mi%")
    expect(profileCall?.select[0]).toContain("bio")
    expect(countCall?.in?.[1]).toEqual(["u1", "u2"])
    expect(result.items[0].worksCount).toBe(2)
    expect(fake.calls).toHaveLength(2)
  })

  it("uses the ranked RPC and removes duplicate creators", async () => {
    fake.setMode("ranked")
    const result = await searchCreators("mira")

    expect(fake.rpcCalls[0]).toMatchObject({
      name: "search_creators_ranked",
      args: { p_query: "mira", p_limit: 6 },
    })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(2)
    expect(fake.calls).toHaveLength(0)
  })

  it("does not query for empty or too-short input", async () => {
    expect((await searchCreators("   ")).items).toEqual([])
    expect((await searchCreators("a")).items).toEqual([])
    expect(fake.calls).toHaveLength(0)
    expect(fake.rpcCalls).toHaveLength(0)
  })

  it("searches creation title, caption and canonical tags in one OR filter", async () => {
    const result = await listPublishedCreations({ q: "#pixel_art", page: 1 })
    const creationCall = fake.calls.find((call) => call.select[0]?.includes("cover_url"))

    expect(result.failed).toBe(false)
    expect(creationCall?.or[0]).toContain("title.ilike.%pixel\\_art%")
    expect(creationCall?.or[0]).toContain("caption.ilike.%pixel\\_art%")
    expect(creationCall?.or[0]).toContain("tags.cs.{pixel_art}")
  })

  it("uses the ranked creation RPC for stable page offsets and removes duplicates", async () => {
    fake.setMode("ranked")
    const result = await listPublishedCreations({
      type: "pixel",
      q: "pixel",
      page: 2,
      category: "icon",
    })

    expect(fake.rpcCalls[0]).toMatchObject({
      name: "search_published_creations_ranked",
      args: {
        p_query: "pixel",
        p_tag: "pixel",
        p_type: "pixel",
        p_category: "icon",
        p_offset: 12,
        p_limit: 12,
      },
    })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.pageCount).toBe(1)
  })
})
