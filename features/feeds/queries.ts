import { connection } from "next/server"

import {
  CARD_COLUMNS,
  cardFromRow,
  type CreationCard,
} from "@/features/creations/queries"
import { getCurrentProfile, getSessionUserId } from "@/lib/auth/session"
import { createServerSupabase } from "@/lib/supabase/server"

const FEED_LIMIT = 60

async function titlesForIds(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const supabase = await createServerSupabase()
  if (!supabase) return new Map()
  const { data } = await supabase
    .from("creations")
    .select("id, title")
    .in("id", ids)
    .limit(FEED_LIMIT)
  return new Map((data ?? []).map((row) => [row.id as string, row.title as string]))
}

async function cardsForIds(ids: string[]): Promise<CreationCard[]> {
  if (!ids.length) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from("creations")
    .select(CARD_COLUMNS)
    .in("id", ids)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(FEED_LIMIT)

  const cards = (data ?? []).map((row) => cardFromRow(row))
  const byId = new Map(cards.map((card) => [card.id, card]))
  return ids.map((id) => byId.get(id)).filter((card): card is CreationCard => Boolean(card))
}

export async function listSavedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("saved_creations")
    .select("creation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return cardsForIds((data ?? []).map((row) => row.creation_id as string))
}

export async function listLikedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("reactions")
    .select("creation_id")
    .eq("user_id", userId)
    .eq("reaction_type", "appreciate")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return cardsForIds((data ?? []).map((row) => row.creation_id as string))
}

export async function isCreationSaved(creationId: string): Promise<boolean> {
  const userId = await getSessionUserId()
  if (!userId) return false
  const supabase = await createServerSupabase()
  if (!supabase) return false

  const { data, error } = await supabase
    .from("saved_creations")
    .select("creation_id")
    .eq("user_id", userId)
    .eq("creation_id", creationId)
    .maybeSingle()
  return !error && Boolean(data)
}

export async function isCreationArchived(creationId: string): Promise<boolean> {
  const userId = await getSessionUserId()
  if (!userId) return false
  const supabase = await createServerSupabase()
  if (!supabase) return false

  const { data, error } = await supabase
    .from("creations")
    .select("archived_at")
    .eq("id", creationId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return false
  return Boolean((data as { archived_at?: string | null } | null)?.archived_at)
}

/**
 * Archived works keep their published status but are hidden from public feeds.
 * Before the additive migration lands there is no archived work to show.
 */
export async function listArchivedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, archived_at`)
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return (data ?? []).map((row) => cardFromRow(row))
}

export type ActivityKind = "publish" | "appreciate" | "comment" | "follow"

export type ActivityItem = {
  id: string
  kind: ActivityKind
  at: string
  title: string
  path: string
  preview?: string | null
}

function itemOf(
  id: string,
  kind: ActivityKind,
  at: string,
  title: string | undefined,
  path: string,
  preview?: string | null,
): ActivityItem {
  return { id, kind, at, title: title ?? "", path, preview: preview ?? null }
}

/** Your own public actions — intentionally distinct from the Responses inbox. */
export async function listOwnActivity(): Promise<ActivityItem[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const [own, reactions, comments, follows] = await Promise.all([
    supabase
      .from("creations")
      .select("id, title, published_at")
      .eq("user_id", userId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from("reactions")
      .select("creation_id, created_at")
      .eq("user_id", userId)
      .eq("reaction_type", "appreciate")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from("comments")
      .select("id, creation_id, content, created_at")
      .eq("user_id", userId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
  ])

  const reactionRows = reactions.data ?? []
  const commentRows = comments.data ?? []
  const followRows = follows.data ?? []
  const [reactionTitles, commentTitles, followedProfiles] = await Promise.all([
    titlesForIds(reactionRows.map((row) => row.creation_id as string)),
    titlesForIds(commentRows.map((row) => row.creation_id as string)),
    (async () => {
      const ids = followRows.map((row) => row.following_id as string)
      if (!ids.length) return new Map<string, string>()
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids)
        .limit(FEED_LIMIT)
      return new Map((data ?? []).map((row) => [row.id as string, row.username as string]))
    })(),
  ])

  const items: ActivityItem[] = []

  for (const row of own.data ?? []) {
    const at = row.published_at as string | null
    if (!at) continue
    items.push(
      itemOf(
        `publish:${row.id}`,
        "publish",
        at,
        row.title as string,
        `/creation/${row.id as string}`,
      ),
    )
  }

  for (const row of reactionRows) {
    const creationId = row.creation_id as string
    items.push(
      itemOf(
        `appreciate:${creationId}`,
        "appreciate",
        row.created_at as string,
        reactionTitles.get(creationId),
        `/creation/${creationId}`,
      ),
    )
  }

  for (const row of commentRows) {
    const creationId = row.creation_id as string
    items.push(
      itemOf(
        `comment:${row.id}`,
        "comment",
        row.created_at as string,
        commentTitles.get(creationId),
        `/creation/${creationId}`,
        String(row.content ?? "").slice(0, 120),
      ),
    )
  }

  for (const row of followRows) {
    const targetId = row.following_id as string
    const username = followedProfiles.get(targetId)
    if (!username) continue
    items.push(
      itemOf(
        `follow:${targetId}`,
        "follow",
        row.created_at as string,
        `@${username}`,
        `/u/${username}`,
      ),
    )
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, FEED_LIMIT)
}

export type InsightsSummary = {
  works: number
  published: number
  drafts: number
  archived: number
  appreciations: number
  comments: number
}

/** Lightweight, viewer-scoped counters for the Insights destination. */
export async function getInsightsSummary(): Promise<InsightsSummary> {
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) {
    return { works: 0, published: 0, drafts: 0, archived: 0, appreciations: 0, comments: 0 }
  }
  const supabase = await createServerSupabase()
  if (!supabase) {
    return { works: 0, published: 0, drafts: 0, archived: 0, appreciations: 0, comments: 0 }
  }

  // Retry without the additive column so Insights never blocks auth on a
  // database that has not received the archive migration yet.
  let { data: own, error } = await supabase
    .from("creations")
    .select("id, status, archived_at")
    .eq("user_id", profile.id)
    .limit(500)
  if (error) {
    const baseline = await supabase
      .from("creations")
      .select("id, status")
      .eq("user_id", profile.id)
      .limit(500)
    own = baseline.data as typeof own
    error = baseline.error
  }
  if (error) {
    return { works: 0, published: 0, drafts: 0, archived: 0, appreciations: 0, comments: 0 }
  }

  const rows = own ?? []
  const publishedIds = rows
    .filter((row) => row.status === "published" && !(row as { archived_at?: string | null }).archived_at)
    .map((row) => row.id as string)
  const appreciations = publishedIds.length
    ? await supabase
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .in("creation_id", publishedIds)
        .eq("reaction_type", "appreciate")
    : null
  const comments = publishedIds.length
    ? await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .in("creation_id", publishedIds)
        .eq("status", "published")
    : null

  return {
    works: rows.length,
    published: rows.filter((row) => row.status === "published").length,
    drafts: rows.filter((row) => row.status === "draft" || row.status === "hidden").length,
    archived: rows.filter((row) => Boolean((row as { archived_at?: string | null }).archived_at)).length,
    appreciations: appreciations?.count ?? 0,
    comments: comments?.count ?? 0,
  }
}
