import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPublishedCreations, getCurrentProfile, listFollowingIds } = vi.hoisted(() => ({
  listPublishedCreations: vi.fn(),
  getCurrentProfile: vi.fn(),
  listFollowingIds: vi.fn(),
}))

vi.mock("@/features/creations/queries", () => ({ listPublishedCreations }))
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile }))
vi.mock("@/features/community/follows", () => ({ listFollowingIds }))

import { loadMoreExploreAction } from "@/features/explore/actions"

const ok = { items: [{ id: "x" }], page: 2, pageCount: 3, total: 30, failed: false }

describe("loadMoreExploreAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listPublishedCreations.mockResolvedValue(ok)
  })

  it("rejects page 1, NaN and absurd pages without querying", async () => {
    for (const page of [1, 0, -4, Number.NaN, 10_000]) {
      expect(await loadMoreExploreAction({ page })).toEqual({ ok: false })
    }
    expect(listPublishedCreations).not.toHaveBeenCalled()
  })

  it("re-parses untrusted filters before querying", async () => {
    await loadMoreExploreAction({ page: 2, category: "<script>", q: "  cat  ", feed: "weird" })
    expect(listPublishedCreations).toHaveBeenCalledWith({
      type: "pixel",
      category: undefined,
      q: "cat",
      page: 2,
    })
  })

  it("returns ok with the same shape the page uses", async () => {
    expect(await loadMoreExploreAction({ page: 2 })).toEqual({
      ok: true,
      items: ok.items,
      page: 2,
      pageCount: 3,
    })
  })

  it("refuses the following feed for guests", async () => {
    getCurrentProfile.mockResolvedValue(null)
    expect(await loadMoreExploreAction({ page: 2, feed: "following" })).toEqual({ ok: false })
    expect(listPublishedCreations).not.toHaveBeenCalled()
  })

  it("scopes the following feed to followed creators", async () => {
    getCurrentProfile.mockResolvedValue({ id: "me", activity_seen_at: "2026-11-01" })
    listFollowingIds.mockResolvedValue(["u1"])
    await loadMoreExploreAction({ page: 2, feed: "following" })
    expect(listPublishedCreations).toHaveBeenCalledWith(
      expect.objectContaining({ followingUserIds: ["u1"], markNewSince: "2026-11-01" }),
    )
  })

  it("fails closed when the query fails or throws", async () => {
    listPublishedCreations.mockResolvedValueOnce({ ...ok, failed: true })
    expect(await loadMoreExploreAction({ page: 2 })).toEqual({ ok: false })
    listPublishedCreations.mockRejectedValueOnce(new Error("boom"))
    expect(await loadMoreExploreAction({ page: 2 })).toEqual({ ok: false })
  })
})
