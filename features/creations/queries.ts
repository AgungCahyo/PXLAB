import { cache } from "react"
import { connection } from "next/server"
import { getSessionUserId } from "@/lib/auth/session"
import { ilikeContains } from "@/lib/creations"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import {
  parseColorUsage,
  parsePixelSource,
  type ColorUsageEntry,
  type PixelSource,
} from "@/lib/pixel"
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
  commentCount?: number
  isNew?: boolean
  author: {
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export type CreationAuthor = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
}

const CREATION_COLUMNS =
  "id, user_id, title, caption, tags, color_usage, type, category, content, cover_url, status, allow_png_download, forked_from, created_at, updated_at, published_at"
const CARD_COLUMNS =
  "id, title, caption, tags, type, category, status, published_at, updated_at, user_id, cover_url"
const PROFILE_CARD_EMBED = "profiles (username, display_name, avatar_url)"
const PROFILE_DETAIL_EMBED = "profiles (username, display_name, avatar_url, bio)"

type ProfileEmbed = {
  username: string
  display_name: string | null
  avatar_url?: string | null
  bio?: string | null
}

function authorOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

function authorDetailOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }): CreationAuthor {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
  }
}

function tagsOf(row: Record<string, unknown>) {
  const value = row.tags
  return Array.isArray(value) ? value.map(String) : []
}

function cardFromRow(row: Record<string, unknown>): CreationCard {
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
    author: authorOf(row),
  }
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
  if (args.q) query = query.ilike("title", ilikeContains(args.q))
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

export async function listPublishedCreationsByUser(
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
}

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
export async function listSimilarCreations(args: {
  id: string
  category: CreationCategory | null
  tags: string[]
  limit?: number
}): Promise<{ items: CreationCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const limit = Math.max(1, Math.min(8, args.limit ?? 4))
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
}

export type NewCreatorCard = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  latestCreationId: string | null
  latestCoverUrl: string | null
  latestPublishedAt: string | null
}

/** Distinct creators from recently published pixel works (newest publish first). */
export async function listNewCreators(
  limit = 6,
): Promise<{ items: NewCreatorCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const pool = Math.max(limit * 8, 48)
  const { data, error } = await supabase
    .from("creations")
    .select(`id, user_id, cover_url, published_at, ${PROFILE_CARD_EMBED}`)
    .eq("status", "published")
    .eq("type", "pixel")
    .order("published_at", { ascending: false })
    .limit(pool)

  if (error || !data) return { items: [], failed: true }

  const seen = new Set<string>()
  const items: NewCreatorCard[] = []
  for (const row of data) {
    const userId = row.user_id as string
    if (seen.has(userId)) continue
    seen.add(userId)
    const author = authorOf(row as Record<string, unknown>)
    items.push({
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      latestCreationId: (row.id as string) ?? null,
      latestCoverUrl: (row.cover_url as string | null) ?? null,
      latestPublishedAt: (row.published_at as string | null) ?? null,
    })
    if (items.length >= limit) break
  }
  return { failed: false, items }
}

export async function listPublishedRemixes(
  parentId: string,
  limit = 4,
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
}

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
      .select("id, title, profiles (username)")
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
    author: { username: "me", displayName: null, avatarUrl: null },
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
