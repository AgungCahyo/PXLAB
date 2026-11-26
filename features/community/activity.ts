import { connection } from "next/server"
import { getCurrentProfile } from "@/lib/auth/session"
import { createServerSupabase } from "@/lib/supabase/server"

export type ActivityResponseKind = "comment" | "reply" | "appreciate" | "remix"

export type ActivityResponseItem = {
  id: string
  kind: ActivityResponseKind
  at: string
  creationId: string
  creationTitle: string
  actorUsername: string
  preview: string | null
  unseen: boolean
}

const INBOX_LIMIT = 40
/** History window for the Activity inbox (not tied to last visit). */
const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000

function usernameOf(profiles: unknown) {
  const row = Array.isArray(profiles) ? profiles[0] : profiles
  if (row && typeof row === "object" && "username" in row) {
    return String((row as { username: string }).username || "member")
  }
  return "member"
}

function isUnseen(at: string, seenAt: string | null | undefined) {
  if (!seenAt) return true
  return Date.parse(at) > Date.parse(seenAt)
}

export async function hasUnseenActivityResponses(): Promise<boolean> {
  const items = await listActivityResponses({ limit: 8 })
  return items.some((item) => item.unseen)
}

export async function listActivityResponses(options: {
  limit?: number
  markSeen?: boolean
} = {}): Promise<ActivityResponseItem[]> {
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) return []

  const supabase = await createServerSupabase()
  if (!supabase) return []

  const userId = profile.id
  const limit = Math.max(1, Math.min(INBOX_LIMIT, options.limit ?? INBOX_LIMIT))
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString()
  const seenAt = profile.activity_seen_at

  const { data: own } = await supabase
    .from("creations")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100)

  const ownRows = own ?? []
  const ownIds = ownRows.map((row) => row.id as string)
  const titleById = new Map(ownRows.map((row) => [row.id as string, row.title as string]))
  const items: ActivityResponseItem[] = []

  if (ownIds.length > 0) {
    const [{ data: comments }, { data: reactions }, { data: remixes }] = await Promise.all([
      supabase
        .from("comments")
        .select("id, creation_id, content, parent_id, created_at, user_id, profiles (username)")
        .in("creation_id", ownIds)
        .eq("status", "published")
        .gt("created_at", since)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("reactions")
        .select("id, creation_id, created_at, user_id, profiles (username)")
        .in("creation_id", ownIds)
        .eq("reaction_type", "appreciate")
        .gt("created_at", since)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("creations")
        .select(
          "id, title, created_at, published_at, forked_from, profiles!creations_user_id_fkey (username)",
        )
        .eq("status", "published")
        .eq("type", "pixel")
        .in("forked_from", ownIds)
        .gt("created_at", since)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ])

    for (const row of comments ?? []) {
      const creationId = row.creation_id as string
      const at = row.created_at as string
      items.push({
        id: `comment:${row.id}`,
        kind: row.parent_id ? "reply" : "comment",
        at,
        creationId,
        creationTitle: titleById.get(creationId) ?? "",
        actorUsername: usernameOf(row.profiles),
        preview: String(row.content ?? "").slice(0, 120),
        unseen: isUnseen(at, seenAt),
      })
    }

    for (const row of reactions ?? []) {
      const creationId = row.creation_id as string
      const at = row.created_at as string
      items.push({
        id: `appreciate:${row.id}`,
        kind: "appreciate",
        at,
        creationId,
        creationTitle: titleById.get(creationId) ?? "",
        actorUsername: usernameOf(row.profiles),
        preview: null,
        unseen: isUnseen(at, seenAt),
      })
    }

    for (const row of remixes ?? []) {
      const parentId = row.forked_from as string
      const at = (row.published_at as string | null) ?? (row.created_at as string)
      items.push({
        id: `remix:${row.id}`,
        kind: "remix",
        at,
        creationId: row.id as string,
        creationTitle: (row.title as string) || titleById.get(parentId) || "",
        actorUsername: usernameOf(row.profiles),
        preview: titleById.get(parentId) ?? null,
        unseen: isUnseen(at, seenAt),
      })
    }
  }

  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const next = items.slice(0, limit)

  if (options.markSeen) {
    await supabase
      .from("profiles")
      .update({ activity_seen_at: new Date().toISOString() })
      .eq("id", userId)
  }

  return next
}
