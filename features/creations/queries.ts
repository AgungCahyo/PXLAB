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
  type PixelSourceV1,
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
  author: { username: string; displayName: string | null }
}

const CREATION_COLUMNS =
  "id, user_id, title, caption, tags, color_usage, type, category, content, cover_url, status, allow_png_download, forked_from, created_at, updated_at, published_at"
const CARD_COLUMNS =
  "id, title, caption, tags, type, category, status, published_at, updated_at, user_id, cover_url"

type ProfileEmbed = { username: string; display_name: string | null }

function authorOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
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

export async function listPublishedCreations(args: {
  type?: CreationType
  category?: CreationCategory
  q?: string
  page: number
}): Promise<{ items: CreationCard[]; total: number; page: number; pageCount: number; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  const page = Math.max(1, args.page)
  if (!supabase) return { items: [], total: 0, page, pageCount: 1, failed: true }

  const from = (page - 1) * EXPLORE_PAGE_SIZE
  const to = from + EXPLORE_PAGE_SIZE - 1
  let query = supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, profiles (username, display_name)`, {
      count: "exact",
    })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to)

  if (args.type) query = query.eq("type", args.type)
  if (args.category) query = query.eq("category", args.category)
  if (args.q) query = query.ilike("title", ilikeContains(args.q))

  const { data, count, error } = await query
  if (error || !data) return { items: [], total: 0, page, pageCount: 1, failed: true }

  const total = count ?? 0
  return {
    items: data.map((row) => cardFromRow(row)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE)),
    failed: false,
  }
}

export async function listPublishedCreationsByUser(
  userId: string,
): Promise<{ items: CreationCard[]; failed: boolean }> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], failed: true }

  const { data, error } = await supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, profiles (username, display_name)`)
    .eq("user_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100)

  if (error || !data) return { items: [], failed: true }
  return {
    failed: false,
    items: data.map((row) => cardFromRow(row)),
  }
}

/** Dedupes metadata + page (and any same-request callers) via React cache. */
export const getPublishedCreation = cache(async function getPublishedCreation(
  id: string,
): Promise<
  | (CreationRow & {
      author: { username: string; displayName: string | null }
      source: { id: string; title: string } | null
    })
  | null
> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return null

  const { data } = await supabase
    .from("creations")
    .select(`${CREATION_COLUMNS}, profiles (username, display_name)`)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle()

  if (!data) return null
  const row = data as unknown as CreationRow & { profiles?: ProfileEmbed | ProfileEmbed[] | null }

  let source: { id: string; title: string } | null = null
  if (row.forked_from) {
    const { data: parent } = await supabase
      .from("creations")
      .select("id, title")
      .eq("id", row.forked_from)
      .eq("status", "published")
      .maybeSingle()
    if (parent) source = { id: parent.id as string, title: parent.title as string }
  }

  return {
    ...row,
    caption: row.caption ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    color_usage: parseColorUsage(row.color_usage),
    category: row.category ?? null,
    allow_png_download: Boolean(row.allow_png_download),
    author: authorOf(row),
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
    author: { username: "me", displayName: null },
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
): Promise<{ source: PixelSourceV1 | null; broken: boolean }> {
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
