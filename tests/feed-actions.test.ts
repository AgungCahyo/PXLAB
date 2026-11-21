import { beforeEach, describe, expect, it, vi } from "vitest"

const { listHomeFeed, getCurrentProfile, listFollowingIds, listConversation } = vi.hoisted(() => ({
  listHomeFeed: vi.fn(),
  getCurrentProfile: vi.fn(),
  listFollowingIds: vi.fn(),
  listConversation: vi.fn(),
}))

vi.mock("@/features/feed/queries", () => ({ listHomeFeed }))
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile }))
vi.mock("@/features/community/follows", () => ({ listFollowingIds }))
vi.mock("@/features/community/queries", () => ({ listConversation }))

import { loadMoreHomeFeedAction, loadPostCommentsAction } from "@/features/feed/actions"

const page = { items: [{ id: "x" }], page: 2, pageCount: 4, total: 40, failed: false }

describe("loadMoreHomeFeedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentProfile.mockResolvedValue(null)
    listHomeFeed.mockResolvedValue(page)
  })

  it("rejects invalid pages without querying", async () => {
    for (const p of [1, 0, -1, Number.NaN, 9_999]) {
      expect(await loadMoreHomeFeedAction({ page: p })).toEqual({ ok: false })
    }
    expect(listHomeFeed).not.toHaveBeenCalled()
  })

  it("serves the public feed to guests", async () => {
    expect(await loadMoreHomeFeedAction({ page: 2 })).toEqual({ ok: true, items: page.items, page: 2, pageCount: 4 })
    expect(listHomeFeed).toHaveBeenCalledWith(expect.objectContaining({ feed: "all", viewerId: null }))
  })

  it("refuses the following feed for guests", async () => {
    expect(await loadMoreHomeFeedAction({ page: 2, feed: "following" })).toEqual({ ok: false })
    expect(listHomeFeed).not.toHaveBeenCalled()
  })

  it("scopes following to the viewer's follows and passes their id for like state", async () => {
    getCurrentProfile.mockResolvedValue({ id: "me", activity_seen_at: null })
    listFollowingIds.mockResolvedValue(["a", "b"])
    await loadMoreHomeFeedAction({ page: 3, feed: "following" })
    expect(listHomeFeed).toHaveBeenCalledWith(
      expect.objectContaining({ feed: "following", viewerId: "me", followingIds: ["a", "b"], page: 3 }),
    )
  })

  it("treats unknown feed values as the public feed", async () => {
    await loadMoreHomeFeedAction({ page: 2, feed: "<script>" })
    expect(listHomeFeed).toHaveBeenCalledWith(expect.objectContaining({ feed: "all" }))
  })

  it("fails closed on query failure or exceptions", async () => {
    listHomeFeed.mockResolvedValueOnce({ ...page, failed: true })
    expect(await loadMoreHomeFeedAction({ page: 2 })).toEqual({ ok: false })
    listHomeFeed.mockRejectedValueOnce(new Error("boom"))
    expect(await loadMoreHomeFeedAction({ page: 2 })).toEqual({ ok: false })
  })
})

describe("loadPostCommentsAction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects non-uuid ids without querying", async () => {
    expect(await loadPostCommentsAction("nope")).toEqual({ ok: false })
    expect(listConversation).not.toHaveBeenCalled()
  })

  it("returns the conversation from the shared query", async () => {
    listConversation.mockResolvedValue({ roots: [], total: 0, hasEarlier: false })
    const id = "3f2b8c1e-8a4d-4e5b-9c1a-2d7e6f5a4b3c"
    expect(await loadPostCommentsAction(id)).toEqual({ ok: true, roots: [], total: 0, hasEarlier: false })
    expect(listConversation).toHaveBeenCalledWith(expect.objectContaining({ creationId: id }))
  })

  it("fails closed when the query throws", async () => {
    listConversation.mockRejectedValue(new Error("db"))
    expect(await loadPostCommentsAction("3f2b8c1e-8a4d-4e5b-9c1a-2d7e6f5a4b3c")).toEqual({ ok: false })
  })
})
