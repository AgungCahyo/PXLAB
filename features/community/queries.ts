import { connection } from "next/server"
import { attachReplies, type ConversationNote, type ConversationRoot } from "@/lib/conversation"
import { getSessionUserId } from "@/lib/auth/session"
import { COMMENTS_PAGE_SIZE, REACTION_TYPE } from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"

export type { ConversationNote, ConversationRoot }
export type CommentRow = ConversationNote

type ProfileEmbed = {
  username: string
  display_name: string | null
  avatar_url: string | null
}

const COMMENT_COLUMNS =
  "id, user_id, creation_id, content, status, parent_id, created_at, updated_at, profiles (username, display_name, avatar_url)"

function authorOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

function mapComment(row: {
  id: unknown
  user_id: unknown
  creation_id: unknown
  content: unknown
  status: unknown
  parent_id?: unknown
  created_at: unknown
  updated_at?: unknown
  profiles?: ProfileEmbed | ProfileEmbed[] | null
}): ConversationNote {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    creation_id: row.creation_id as string,
    content: row.content as string,
    status: row.status as ConversationNote["status"],
    parent_id: (row.parent_id as string | null | undefined) ?? null,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string | null | undefined) ?? null,
    author: authorOf(row),
  }
}

export async function listConversation(args: {
  creationId: string
  before?: string
  limit?: number
}): Promise<{ roots: ConversationRoot[]; total: number; hasEarlier: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  const limit = Math.max(1, args.limit ?? COMMENTS_PAGE_SIZE)
  if (!supabase) return { roots: [], total: 0, hasEarlier: false }

  const { count: total } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("creation_id", args.creationId)
    .eq("status", "published")

  let rootsQuery = supabase
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("creation_id", args.creationId)
    .eq("status", "published")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (args.before) rootsQuery = rootsQuery.lt("created_at", args.before)

  const { data: rootRows, error } = await rootsQuery
  if (error || !rootRows) {
    return listConversationFlat({
      supabase,
      creationId: args.creationId,
      before: args.before,
      limit,
      total: total ?? 0,
    })
  }

  const hasEarlier = rootRows.length > limit
  const notes = [...rootRows.slice(0, limit)].reverse().map(mapComment)
  const ids = notes.map((item) => item.id)

  let replies: ConversationNote[] = []
  if (ids.length > 0) {
    const { data: replyRows } = await supabase
      .from("comments")
      .select(COMMENT_COLUMNS)
      .eq("creation_id", args.creationId)
      .eq("status", "published")
      .in("parent_id", ids)
      .order("created_at", { ascending: true })
    replies = (replyRows ?? []).map(mapComment)
  }

  return {
    roots: attachReplies(notes, replies),
    total: total ?? 0,
    hasEarlier,
  }
}

async function listConversationFlat(args: {
  supabase: NonNullable<ReturnType<typeof createPublicSupabase>>
  creationId: string
  before?: string
  limit: number
  total: number
}): Promise<{ roots: ConversationRoot[]; total: number; hasEarlier: boolean }> {
  const legacyColumns =
    "id, user_id, creation_id, content, status, created_at, profiles (username, display_name, avatar_url)"
  let query = args.supabase
    .from("comments")
    .select(legacyColumns)
    .eq("creation_id", args.creationId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(args.limit + 1)
  if (args.before) query = query.lt("created_at", args.before)
  const { data, error } = await query
  if (error || !data) return { roots: [], total: args.total, hasEarlier: false }
  const hasEarlier = data.length > args.limit
  const notes = [...data.slice(0, args.limit)].reverse().map(mapComment)
  return { roots: attachReplies(notes, []), total: args.total, hasEarlier }
}

export async function getReactionSummary(creationId: string, userId: string | null) {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { count: 0, appreciated: false }

  const { count } = await supabase
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .eq("creation_id", creationId)
    .eq("reaction_type", REACTION_TYPE)

  let appreciated = false
  if (userId) {
    const { data } = await supabase
      .from("reactions")
      .select("id")
      .eq("creation_id", creationId)
      .eq("user_id", userId)
      .eq("reaction_type", REACTION_TYPE)
      .maybeSingle()
    appreciated = Boolean(data)
  }

  return { count: count ?? 0, appreciated }
}

export async function countOwnCommentsSince(iso: string) {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", iso)
  return count ?? 0
}

export async function countCommentsOnCreation(creationId: string) {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("creation_id", creationId)
    .eq("status", "published")
  return count ?? 0
}

export async function getOwnedComment(id: string) {
  const userId = await getSessionUserId()
  if (!userId) return null
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from("comments")
    .select("id, user_id, creation_id, content, status, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()
  return data
}

export async function getPublishedComment(id: string) {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from("comments")
    .select("id, user_id, creation_id, parent_id, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle()
  return data
}

export async function countOwnReportsSince(iso: string) {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", userId)
    .gte("created_at", iso)
  return count ?? 0
}

export async function getOwnReaction(creationId: string) {
  const userId = await getSessionUserId()
  if (!userId) return null
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from("reactions")
    .select("id")
    .eq("creation_id", creationId)
    .eq("user_id", userId)
    .eq("reaction_type", REACTION_TYPE)
    .maybeSingle()
  return data
}
