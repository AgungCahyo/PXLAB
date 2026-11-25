import { cache } from "react"
import { connection } from "next/server"
import { parseAvatarConfig, type AvatarConfig } from "@/lib/avatar-gen"
import { getSessionUserId } from "@/lib/auth/session"
import { searchLikePattern, searchTagValue } from "@/lib/creations"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import {
  parseColorUsage,
  parsePixelSource,
  type ColorUsageEntry,
  type PixelSource,
} from "../../lib/pixel"
import {
  EXPLORE_PAGE_SIZE,
  PIXEL_BUCKET,
  pixelObjectPath,
  type CreationCategory,
  type CreationType,
} from "@/lib/site"
import { pixelContentSchema, type CreationContent } from "@/lib/validations/creation"

export type CreationRow = {
  id: string
  user_id: string
  title: string
  caption: string | null
  tags: string[]
  color_usage: ColorUsageEntry[] | null
  type: CreationType
  category: CreationCategory | null
  content: CreationContent
  cover_url: string | null
  status: "draft" | "published" | "hidden"
  allow_png_download: boolean
  forked_from: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export type CreationCard = {
  id: string
  title: string
  caption: string | null
  tags: string[]
  type: CreationType
  category: CreationCategory | null
  published_at: string | null
  updated_at: string
  status: CreationRow["status"]
  cover_url: string | null
  /** Present only when the additive archive migration has been applied. */
  archived_at?: string | null
  commentCount?: number
  isNew?: boolean
  author: {
    id: string | null
    username: string
    displayName: string | null
    avatarUrl: string | null
    avatarConfig: AvatarConfig | null
  }
}

export type CreationAuthor = {
  id: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
  avatarConfig: AvatarConfig | null
  bio: string | null
}

const CREATION_COLUMNS =
  "id, user_id, title, caption, tags, color_usage, type, category, content, cover_url, status, allow_png_download, forked_from, created_at, updated_at, published_at"
export const CARD_COLUMNS =
  "id, title, caption, tags, type, category, status, published_at, updated_at, user_id, cover_url"
// `saved_creations` also links creations to profiles, so PostgREST needs the
// explicit FK hint or every creation→profile embed becomes ambiguous.
const PROFILE_CARD_EMBED =
  "profiles!creations_user_id_fkey (username, display_name, avatar_url, avatar_config)"
const PROFILE_DETAIL_EMBED =
  "profiles!creations_user_id_fkey (username, display_name, avatar_url, avatar_config, bio)"

type ProfileEmbed = {
  username: string | null
  display_name: string | null
  avatar_url?: string | null
  avatar_config?: unknown
  bio?: string | null
}

function authorOf(row: {
  user_id?: string
  profiles?: ProfileEmbed | ProfileEmbed[] | null
}) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: (row.user_id as string | undefined) ?? null,
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    avatarConfig: parseAvatarConfig(profile?.avatar_config),
  }
}

function authorDetailOf(row: {
  user_id?: string
  profiles?: ProfileEmbed | ProfileEmbed[] | null
}): CreationAuthor {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: (row.user_id as string | undefined) ?? null,
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    avatarConfig: parseAvatarConfig(profile?.avatar_config),
    bio: profile?.bio ?? null,
  }
}

function tagsOf(row: Record<string, unknown>) {
  const value = row.tags
  return Array.isArray(value) ? value.map(String) : []
}

export function cardFromRow(row: Record<string, unknown>): CreationCard {
  return {
    id: row.id as string,
    title: row.title as string,
    caption: (row.caption as string | null) ?? null,
    tags: tagsOf(row),
    type: row.type as CreationType,
    category: (row.category as CreationCategory | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    updated_at: row.updated_at as string,
    status: row.status as CreationRow["status"],
    cover_url: (row.cover_url as string | null) ?? null,
    archived_at: (row.archived_at as string | null | undefined) ?? null,
    author: authorOf(row),
  }
}

type RankedCreationRow = Record<string, unknown> & {
  profiles?: ProfileEmbed | ProfileEmbed[] | null
}

type RankedRpcRow = {
  item: unknown
  total: number | string | null
}

function isRankedRpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === "PGRST202" ||
    /could not find the function|schema cache/i.test(error.message ?? "")
  )
}

/**
 * Server-side relevance keeps ordering stable across pages. Returns null when
 * the RPC is not deployed so the public ILIKE path can keep the app working.
 */
async function searchPublishedCreationsRanked(
  supabase: NonNullable<ReturnType<typeof createPublicSupabase>>,
  args: {
    query: string
    type?: CreationType
    category?: CreationCategory
    followingUserIds?: string[]
    page: number
  },
): Promise<{ items: CreationCard[]; total: number } | null> {
  const { data, error } = await supabase.rpc("search_published_creations_ranked", {
    p_query: args.query,
    p_tag: searchTagValue(args.query),
    p_type: args.type ?? null,
    p_category: args.category ?? null,
    p_following_user_ids: args.followingUserIds ?? null,
    p_limit: EXPLORE_PAGE_SIZE,
    p_offset: (args.page - 1) * EXPLORE_PAGE_SIZE,
  })

  if (isRankedRpcMissing(error)) return null
  if (error || !Array.isArray(data)) {
    throw new Error(`search_published_creations_ranked failed: ${error?.message ?? "no data"}`)
  }

  const rows = data as RankedRpcRow[]
  const total = Math.max(0, Number(rows[0]?.total ?? 0) || 0)
  const seen = new Set<string>()
  const items: CreationCard[] = []
  for (const row of rows) {
    const item = row.item as RankedCreationRow | null
    if (!item || typeof item !== "object") continue
    const id = item.id as string | undefined
    if (!id || seen.has(id)) continue
    seen.add(id)
    items.push(cardFromRow(item))
  }
  return { items, total }
}

async function attachCommentCounts(items: CreationCard[]): Promise<CreationCard[]> {
  if (items.length === 0) return items
  const supabase = createPublicSupabase()
  if (!supabase) return items
  const ids = items.map((item) => item.id)
  const { data } = await supabase
    .from("comments")
    .select("creation_id")
    .in("creation_id", ids)
    .eq("status", "published")
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const id = row.creation_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return items.map((item) => {
    const commentCount = counts.get(item.id) ?? 0
    return commentCount > 0 ? { ...item, commentCount } : item
  })
}

function markNewItems(items: CreationCard[], sinceIso: string | null): CreationCard[] {
  if (!sinceIso) {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    return items.map((item) => {
      const published = item.published_at ? Date.parse(item.published_at) : 0
      return published > cutoff ? { ...item, isNew: true } : item
    })
  }
  const seen = Date.parse(sinceIso)
  return items.map((item) => {
    const published = item.published_at ? Date.parse(item.published_at) : 0
    return published > seen ? { ...item, isNew: true } : item
  })
}

export async function listPublishedCreations(args: {
  type?: CreationType
  category?: CreationCategory
  q?: string
  page: number
  followingUserIds?: string[]
  markNewSince?: string | null
}): Promise<{ items: CreationCard[]; total: number; page: number; pageCount: number; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  const page = Math.max(1, args.page)
  if (!supabase) return { items: [], total: 0, page, pageCount: 1, failed: true }

  if (args.followingUserIds && args.followingUserIds.length === 0) {
    return { items: [], total: 0, page, pageCount: 1, failed: false }
  }

  const from = (page - 1) * EXPLORE_PAGE_SIZE
  const to = from + EXPLORE_PAGE_SIZE - 1
  let query = supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, ${PROFILE_CARD_EMBED}`, {
      count: "exact",
    })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to)

  if (args.type) query = query.eq("type", args.type)
  if (args.category) query = query.eq("category", args.category)
  if (args.q) {
    const ranked = await searchPublishedCreationsRanked(supabase, {
      query: args.q,
      type: args.type,
      category: args.category,
      followingUserIds: args.followingUserIds,
      page,
    })
    if (ranked) {
      let items = await attachCommentCounts(ranked.items)
      if (args.markNewSince !== undefined) {
        items = markNewItems(items, args.markNewSince)
      }
      return {
        items,
        total: ranked.total,
        page,
        pageCount: Math.max(1, Math.ceil(ranked.total / EXPLORE_PAGE_SIZE)),
        failed: false,
      }
    }

    // Fallback until the ranking migration is applied: relevance is best-effort
    // (newest first), but all searchable fields keep working.
    const pattern = searchLikePattern(args.q)
    if (pattern) {
      const filters = [`title.ilike.${pattern}`, `caption.ilike.${pattern}`]
      const tag = searchTagValue(args.q)
      if (tag) filters.push(`tags.cs.{${tag}}`)
      query = query.or(filters.join(","))
    }
  }
  if (args.followingUserIds) query = query.in("user_id", args.followingUserIds)

  const { data, count, error } = await query
  if (error || !data) return { items: [], total: 0, page, pageCount: 1, failed: true }

  const total = count ?? 0
  let items = await attachCommentCounts(data.map((row) => cardFromRow(row)))
  if (args.markNewSince !== undefined) {
    items = markNewItems(items, args.markNewSince)
  }
  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE)),
    failed: false,
  }
}

export const listPublishedCreationsByUser = cache(async function listPublishedCreationsByUser(
  userId: string,
  options: { excludeId?: string; limit?: number; type?: CreationType } = {},
): Promise<{ items: CreationCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const limit = Math.max(1, Math.min(100, options.limit ?? 100))
  let query = supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, ${PROFILE_CARD_EMBED}`)
    .eq("user_id", userId)
    .eq("status", "published")
    .eq("type", options.type ?? "pixel")
    .order("published_at", { ascending: false })
    .limit(limit)

  if (options.excludeId) query = query.neq("id", options.excludeId)

  const { data, error } = await query

  if (error || !data) return { items: [], failed: true }
  return {
    failed: false,
    items: data.map((row) => cardFromRow(row)),
  }
})

/** Recent published pixel works that still have zero published comments. */
export async function listQuietPublishedCreations(
  limit = 8,
): Promise<{ items: CreationCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const pool = Math.max(limit * 5, 40)
  const { data, error } = await supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, ${PROFILE_CARD_EMBED}`)
    .eq("status", "published")
    .eq("type", "pixel")
    .order("published_at", { ascending: false })
    .limit(pool)

  if (error || !data) return { items: [], failed: true }

  const ids = data.map((row) => row.id as string)
  if (ids.length === 0) return { items: [], failed: false }

  const { data: commented } = await supabase
    .from("comments")
    .select("creation_id")
    .in("creation_id", ids)
    .eq("status", "published")

  const busy = new Set((commented ?? []).map((row) => row.creation_id as string))
  const quiet = data.filter((row) => !busy.has(row.id as string)).slice(0, limit)
  return { failed: false, items: quiet.map((row) => cardFromRow(row)) }
}

/** Same category first, then tag overlap, then recent fill. */
export const listSimilarCreations = cache(async function listSimilarCreations(args: {
  id: string
  category: CreationCategory | null
  tags: string[]
  limit?: number
}): Promise<{ items: CreationCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const limit = Math.max(1, Math.min(8, args.limit ?? 6))
  const select = `${CARD_COLUMNS}, ${PROFILE_CARD_EMBED}`
  let byCategory: CreationCard[] = []

  if (args.category) {
    const { data, error } = await supabase
      .from("creations")
      .select(select)
      .eq("status", "published")
      .eq("type", "pixel")
      .eq("category", args.category)
      .neq("id", args.id)
      .order("published_at", { ascending: false })
      .limit(limit)
    if (error) return { items: [], failed: true }
    byCategory = (data ?? []).map((row) => cardFromRow(row))
  }

  if (byCategory.length >= limit) {
    return { failed: false, items: await attachCommentCounts(byCategory.slice(0, limit)) }
  }

  const pool = Math.max(limit * 8, 24)
  const { data, error } = await supabase
    .from("creations")
    .select(select)
    .eq("status", "published")
    .eq("type", "pixel")
    .neq("id", args.id)
    .order("published_at", { ascending: false })
    .limit(pool)

  if (error || !data) {
    return { failed: Boolean(error), items: await attachCommentCounts(byCategory) }
  }

  const taken = new Set(byCategory.map((item) => item.id))
  const want = new Set(args.tags.map((tag) => tag.toLowerCase()))
  const scored = data
    .map((row) => cardFromRow(row))
    .filter((item) => !taken.has(item.id))
    .map((item) => ({
      item,
      score: item.tags.reduce((n, tag) => n + (want.has(tag.toLowerCase()) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)

  const filled = [...byCategory]
  for (const row of scored) {
    if (filled.length >= limit) break
    if (row.score > 0 || byCategory.length === 0) filled.push(row.item)
  }
  if (filled.length < limit) {
    for (const row of scored) {
      if (filled.length >= limit) break
      if (filled.some((item) => item.id === row.item.id)) continue
      filled.push(row.item)
    }
  }

  return { failed: false, items: await attachCommentCounts(filled.slice(0, limit)) }
})

export type NewCreatorCard = {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  avatarConfig: AvatarConfig | null
  latestCreationId: string | null
  latestCoverUrl: string | null
  latestPublishedAt: string | null
}

/** Distinct creators from recently published pixel works (newest publish first). */
export async function listNewCreators(
  limit = 6,
  excludeUserId?: string | null,
): Promise<{ items: NewCreatorCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const pool = Math.max(limit * 8, 48)
  let query = supabase
    .from("creations")
    .select(`id, user_id, cover_url, published_at, ${PROFILE_CARD_EMBED}`)
    .eq("status", "published")
    .eq("type", "pixel")
  if (excludeUserId) query = query.neq("user_id", excludeUserId)

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(pool)

  if (error || !data) return { items: [], failed: true }

  const seen = new Set<string>()
  const items: NewCreatorCard[] = []
  for (const row of data) {
    const userId = row.user_id as string
    if (excludeUserId && userId === excludeUserId) continue
    if (seen.has(userId)) continue
    seen.add(userId)
    const author = authorOf(row as Record<string, unknown>)
    items.push({
      id: userId,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      avatarConfig: author.avatarConfig,
      latestCreationId: (row.id as string) ?? null,
      latestCoverUrl: (row.cover_url as string | null) ?? null,
      latestPublishedAt: (row.published_at as string | null) ?? null,
    })
    if (items.length >= limit) break
  }
  return { failed: false, items }
}

export type CreatorWorkPreview = {
  id: string
  title: string
  coverUrl: string | null
}

/**
 * Batch the first works of several creators into one query so compact creator
 * cards can show a small preview row without an N+1 request per card.
 */
export async function listCreatorWorkPreviews(
  userIds: string[],
  perCreator = 3,
): Promise<Record<string, CreatorWorkPreview[]>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return {}
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return {}

  const limit = Math.max(1, Math.min(3, perCreator))
  const { data, error } = await supabase
    .from("creations")
    .select("id, user_id, title, cover_url")
    .eq("status", "published")
    .eq("type", "pixel")
    .in("user_id", ids)
    .order("user_id")
    .order("published_at", { ascending: false })

  if (error || !data) return {}

  const grouped = new Map<string, CreatorWorkPreview[]>()
  for (const row of data) {
    const userId = row.user_id as string | null
    if (!userId) continue
    const list = grouped.get(userId) ?? []
    if (list.length >= limit) continue
    list.push({
      id: row.id as string,
      title: row.title as string,
      coverUrl: (row.cover_url as string | null) ?? null,
    })
    grouped.set(userId, list)
  }
  return Object.fromEntries(grouped)
}

/** Lightweight published total for a profile — the gallery query is capped at 100. */
export const countPublishedCreationsByUser = cache(async function countPublishedCreationsByUser(
  userId: string,
): Promise<number> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from("creations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "published")
    .eq("type", "pixel")

  if (error) return 0
  return count ?? 0
})

/** Lightweight remix total for engagement — no card rows. */
export async function countPublishedRemixes(parentId: string): Promise<number> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from("creations")
    .select("id", { count: "exact", head: true })
    .eq("forked_from", parentId)
    .eq("status", "published")
    .eq("type", "pixel")

  if (error) return 0
  return count ?? 0
}

export const listPublishedRemixes = cache(async function listPublishedRemixes(
  parentId: string,
  limit = 6,
): Promise<{ items: CreationCard[]; total: number; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], total: 0, failed: true }

  const capped = Math.max(1, Math.min(12, limit))
  const { data, count, error } = await supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, ${PROFILE_CARD_EMBED}`, { count: "exact" })
    .eq("forked_from", parentId)
    .eq("status", "published")
    .eq("type", "pixel")
    .order("published_at", { ascending: false })
    .limit(capped)

  if (error || !data) return { items: [], total: 0, failed: true }
  return {
    failed: false,
    total: count ?? data.length,
    items: data.map((row) => cardFromRow(row)),
  }
})

/** Dedupes metadata + page (and any same-request callers) via React cache. */
export const getPublishedCreation = cache(async function getPublishedCreation(
  id: string,
): Promise<
  | (CreationRow & {
      author: CreationAuthor
      source: { id: string; title: string; authorUsername: string } | null
    })
  | null
> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return null

  const { data } = await supabase
    .from("creations")
    .select(`${CREATION_COLUMNS}, ${PROFILE_DETAIL_EMBED}`)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle()

  if (!data) return null
  const row = data as unknown as CreationRow & { profiles?: ProfileEmbed | ProfileEmbed[] | null }

  let source: { id: string; title: string; authorUsername: string } | null = null
  if (row.forked_from) {
    const { data: parent } = await supabase
      .from("creations")
      .select("id, title, profiles!creations_user_id_fkey (username)")
      .eq("id", row.forked_from)
      .eq("status", "published")
      .maybeSingle()
    if (parent) {
      const parentProfiles = (parent as unknown as { profiles?: { username: string } | { username: string }[] | null })
        .profiles
      const parentProfile = Array.isArray(parentProfiles) ? parentProfiles[0] : parentProfiles
      source = {
        id: parent.id as string,
        title: parent.title as string,
        authorUsername: parentProfile?.username ?? "member",
      }
    }
  }

  return {
    ...row,
    caption: row.caption ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color_usage: parseColorUsage(row.color_usage),
    category: row.category ?? null,
    allow_png_download: Boolean(row.allow_png_download),
    author: authorDetailOf(row),
    source,
  }
})

export async function getOwnedCreation(id: string): Promise<CreationRow | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  const supabase = await createServerSupabase()
  if (!supabase) return null

  const { data } = await supabase
    .from("creations")
    .select(CREATION_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) return null
  const row = data as CreationRow
  return {
    ...row,
    caption: row.caption ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color_usage: parseColorUsage(row.color_usage),
    category: row.category ?? null,
    allow_png_download: Boolean(row.allow_png_download),
  }
}

export async function listOwnCreations(): Promise<CreationCard[]> {
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data } = await supabase
    .from("creations")
    .select(CARD_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100)

  return (data ?? []).map((row) => ({
    ...cardFromRow(row),
    author: {
      id: null,
      username: "me",
      displayName: null,
      avatarUrl: null,
      avatarConfig: null,
    },
  }))
}

export async function countOwnCreations() {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("creations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  return count ?? 0
}

export async function loadOwnedPixelSource(
  creation: CreationRow,
): Promise<{ source: PixelSource | null; broken: boolean }> {
  if (creation.type !== "pixel") return { source: null, broken: false }
  const header = pixelContentSchema.safeParse(creation.content)
  if (!header.success || !header.data.source_path) return { source: null, broken: false }

  const supabase = await createServerSupabase()
  if (!supabase) return { source: null, broken: true }

  const { data, error } = await supabase.storage
    .from(PIXEL_BUCKET)
    .download(pixelObjectPath(creation.user_id, creation.id, "source.json"))

  if (error || !data) return { source: null, broken: true }
  try {
    const text = await data.text()
    const parsed = parsePixelSource(JSON.parse(text))
    if (!parsed.ok) return { source: null, broken: true }
    return { source: parsed.data, broken: false }
  } catch {
    return { source: null, broken: true }
  }
}
