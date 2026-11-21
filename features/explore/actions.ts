"use server"

import { listFollowingIds } from "@/features/community/follows"
import { listPublishedCreations, type CreationCard } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import {
  parseExploreCategory,
  parseExploreFeed,
  parseExploreSearch,
} from "@/lib/creations"

const MAX_PAGE = 500

export type LoadMoreExploreResult =
  | { ok: true; items: CreationCard[]; page: number; pageCount: number }
  | { ok: false }

/**
 * Read-only "next page" for Explore infinite scroll. Same query, same filters and
 * same page size as the server-rendered page — no new data path.
 * Input is untrusted (client-supplied), so every field is re-parsed here.
 */
export async function loadMoreExploreAction(input: {
  category?: string
  q?: string
  feed?: string
  page: number
}): Promise<LoadMoreExploreResult> {
  const page = Math.floor(Number(input?.page))
  if (!Number.isFinite(page) || page < 2 || page > MAX_PAGE) return { ok: false }

  const category = parseExploreCategory(input.category)
  const q = parseExploreSearch(input.q)
  const feed = parseExploreFeed(input.feed)
  const base = {
    type: "pixel" as const,
    category: category === "all" ? undefined : category,
    q: q || undefined,
    page,
  }

  try {
    if (feed === "following") {
      const profile = await getCurrentProfile()
      if (!profile) return { ok: false }
      const followingIds = await listFollowingIds(profile.id)
      const result = await listPublishedCreations({
        ...base,
        followingUserIds: followingIds,
        markNewSince: profile.activity_seen_at,
      })
      if (result.failed) return { ok: false }
      return { ok: true, items: result.items, page: result.page, pageCount: result.pageCount }
    }

    const result = await listPublishedCreations(base)
    if (result.failed) return { ok: false }
    return { ok: true, items: result.items, page: result.page, pageCount: result.pageCount }
  } catch {
    return { ok: false }
  }
}
