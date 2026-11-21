"use server"

import { z } from "zod"
import { listFollowingIds } from "@/features/community/follows"
import { listConversation, type ConversationRoot } from "@/features/community/queries"
import { listHomeFeed, type FeedPostData } from "@/features/feed/queries"
import { getCurrentProfile } from "@/lib/auth/session"

const MAX_PAGE = 500
const INLINE_COMMENTS = 10

export type LoadMoreFeedResult =
  | { ok: true; items: FeedPostData[]; page: number; pageCount: number }
  | { ok: false }

/** Read-only next page for the home feed. Input is untrusted and re-validated. */
export async function loadMoreHomeFeedAction(input: {
  feed?: string
  page: number
}): Promise<LoadMoreFeedResult> {
  const page = Math.floor(Number(input?.page))
  if (!Number.isFinite(page) || page < 2 || page > MAX_PAGE) return { ok: false }
  const feed = input.feed === "following" ? "following" : "all"

  try {
    const profile = await getCurrentProfile()
    if (feed === "following" && !profile) return { ok: false }
    const followingIds = feed === "following" && profile ? await listFollowingIds(profile.id) : []
    const result = await listHomeFeed({
      feed,
      page,
      viewerId: profile?.id ?? null,
      followingIds,
      markNewSince: profile?.activity_seen_at ?? null,
    })
    if (result.failed) return { ok: false }
    return { ok: true, items: result.items, page: result.page, pageCount: result.pageCount }
  } catch {
    return { ok: false }
  }
}

export type PostCommentsResult =
  | { ok: true; roots: ConversationRoot[]; total: number; hasEarlier: boolean }
  | { ok: false }

/** Latest comments for the inline panel. Same query as the creation page. */
export async function loadPostCommentsAction(creationId: string): Promise<PostCommentsResult> {
  const parsed = z.uuid().safeParse(creationId)
  if (!parsed.success) return { ok: false }
  try {
    const result = await listConversation({ creationId: parsed.data, limit: INLINE_COMMENTS })
    return { ok: true, roots: result.roots, total: result.total, hasEarlier: result.hasEarlier }
  } catch {
    return { ok: false }
  }
}
