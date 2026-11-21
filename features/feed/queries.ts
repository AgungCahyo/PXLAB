import { listPublishedCreations, type CreationCard } from "@/features/creations/queries"
import { REACTION_TYPE } from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"

export type FeedPostData = CreationCard & {
  likeCount: number
  liked: boolean
}

export type FeedKind = "all" | "following"

/**
 * Like counts + the viewer's own like for a page of creations.
 * Uses the same `reactions` table/filters as getReactionSummary, but batched:
 * one head-count per creation (run in parallel, no rows transferred) and a single
 * query for the viewer's likes. No schema changes.
 */
export async function getEngagement(creationIds: string[], viewerId: string | null) {
  const counts = new Map<string, number>()
  const liked = new Set<string>()
  const supabase = createPublicSupabase()
  if (!supabase || creationIds.length === 0) return { counts, liked }

  const [countResults, own] = await Promise.all([
    Promise.all(
      creationIds.map(async (id) => {
        const { count } = await supabase
          .from("reactions")
          .select("id", { count: "exact", head: true })
          .eq("creation_id", id)
          .eq("reaction_type", REACTION_TYPE)
        return [id, count ?? 0] as const
      }),
    ),
    viewerId
      ? supabase
          .from("reactions")
          .select("creation_id")
          .in("creation_id", creationIds)
          .eq("user_id", viewerId)
          .eq("reaction_type", REACTION_TYPE)
      : Promise.resolve({ data: [] as { creation_id: string }[] }),
  ])

  for (const [id, count] of countResults) counts.set(id, count)
  for (const row of own.data ?? []) liked.add(row.creation_id as string)
  return { counts, liked }
}

export function toFeedPosts(
  items: CreationCard[],
  engagement: { counts: Map<string, number>; liked: Set<string> },
): FeedPostData[] {
  return items.map((item) => ({
    ...item,
    likeCount: engagement.counts.get(item.id) ?? 0,
    liked: engagement.liked.has(item.id),
  }))
}

/** One page of the home feed: same publish query as Explore + engagement. */
export async function listHomeFeed(args: {
  feed: FeedKind
  page: number
  viewerId: string | null
  followingIds?: string[]
  markNewSince?: string | null
}) {
  const result = await listPublishedCreations({
    type: "pixel",
    page: args.page,
    ...(args.feed === "following"
      ? { followingUserIds: args.followingIds ?? [], markNewSince: args.markNewSince }
      : {}),
  })
  if (result.failed) return { ...result, items: [] as FeedPostData[] }
  const engagement = await getEngagement(
    result.items.map((item) => item.id),
    args.viewerId,
  )
  return { ...result, items: toFeedPosts(result.items, engagement) }
}
