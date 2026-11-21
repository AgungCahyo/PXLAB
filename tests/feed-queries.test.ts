import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPublishedCreations, fake } = vi.hoisted(() => {
  const counts: Record<string, number> = {}
  const own: string[] = []
  const calls: { table: string; eq: Record<string, unknown>; inCol?: string; head: boolean }[] = []
  function builder(table: string) {
    const state = { table, eq: {} as Record<string, unknown>, inCol: undefined as string | undefined, head: false }
    const chain: Record<string, unknown> = {
      select: (_c: string, opts?: { head?: boolean }) => {
        state.head = Boolean(opts?.head)
        return chain
      },
      eq: (col: string, value: unknown) => {
        state.eq[col] = value
        return chain
      },
      in: (col: string) => {
        state.inCol = col
        return chain
      },
      then: (resolve: (v: unknown) => void) => {
        calls.push({ ...state })
        if (state.head) resolve({ count: counts[state.eq.creation_id as string] ?? 0 })
        else resolve({ data: own.map((id) => ({ creation_id: id })) })
      },
    }
    return chain
  }
  return {
    listPublishedCreations: vi.fn(),
    fake: { counts, own, calls, client: { from: builder } },
  }
})

vi.mock("@/features/creations/queries", () => ({ listPublishedCreations }))
vi.mock("@/lib/supabase/public", () => ({ createPublicSupabase: () => fake.client }))

import { getEngagement, listHomeFeed, toFeedPosts } from "@/features/feed/queries"

const card = (id: string) => ({ id, title: id, author: { username: "u" } }) as never

describe("feed engagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(fake.counts)) delete fake.counts[k]
    fake.own.length = 0
    fake.calls.length = 0
  })

  it("returns counts per creation and the viewer's own likes", async () => {
    fake.counts.a = 3
    fake.counts.b = 0
    fake.own.push("a")
    const { counts, liked } = await getEngagement(["a", "b"], "viewer")
    expect(counts.get("a")).toBe(3)
    expect(counts.get("b")).toBe(0)
    expect(liked.has("a")).toBe(true)
    expect(liked.has("b")).toBe(false)
  })

  it("skips the viewer query for guests and never loads rows for counts", async () => {
    await getEngagement(["a"], null)
    expect(fake.calls.filter((c) => !c.head)).toHaveLength(0)
    expect(fake.calls.every((c) => c.head)).toBe(true)
  })

  it("does nothing for an empty page", async () => {
    const { counts } = await getEngagement([], "viewer")
    expect(counts.size).toBe(0)
    expect(fake.calls).toHaveLength(0)
  })

  it("maps engagement onto posts with safe defaults", () => {
    const posts = toFeedPosts([card("a"), card("z")], { counts: new Map([["a", 2]]), liked: new Set(["a"]) })
    expect(posts[0]).toMatchObject({ id: "a", likeCount: 2, liked: true })
    expect(posts[1]).toMatchObject({ id: "z", likeCount: 0, liked: false })
  })

  it("home feed uses the publish query and scopes 'following' to followed creators", async () => {
    listPublishedCreations.mockResolvedValue({ items: [card("a")], page: 1, pageCount: 1, total: 1, failed: false })
    await listHomeFeed({ feed: "following", page: 1, viewerId: "v", followingIds: ["u1"], markNewSince: null })
    expect(listPublishedCreations).toHaveBeenCalledWith(
      expect.objectContaining({ type: "pixel", followingUserIds: ["u1"] }),
    )
    await listHomeFeed({ feed: "all", page: 1, viewerId: null })
    expect(listPublishedCreations).toHaveBeenLastCalledWith({ type: "pixel", page: 1 })
  })

  it("propagates a failed query without touching engagement", async () => {
    listPublishedCreations.mockResolvedValue({ items: [], page: 1, pageCount: 1, total: 0, failed: true })
    const result = await listHomeFeed({ feed: "all", page: 1, viewerId: "v" })
    expect(result.failed).toBe(true)
    expect(fake.calls).toHaveLength(0)
  })
})
