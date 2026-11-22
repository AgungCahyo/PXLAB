import { cache } from "react"
import { connection } from "next/server"
import { parseAvatarConfig, type AvatarConfig } from "@/lib/avatar-gen"
import { normalizeSearchValue, searchLikePattern } from "@/lib/creations"
import { createPublicSupabase } from "@/lib/supabase/public"
import { SEARCH_CREATOR_LIMIT, SEARCH_MIN_LENGTH } from "@/lib/site"

export type CreatorSearchResult = {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  avatarConfig: AvatarConfig | null
  /** Omitted when the batched count scan is truncated. */
  worksCount?: number
}

export type CreatorSearchResponse = {
  items: CreatorSearchResult[]
  total: number
  failed: boolean
}

const WORK_COUNT_SCAN_LIMIT = 2000

type RankedCreatorRow = {
  item: Record<string, unknown>
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
 * Creator search by username or display name. Prefers the ranked RPC; falls
 * back to the previous PostgREST filter when that function is not deployed.
 */
export const searchCreators = cache(async function searchCreators(
  rawQuery: string,
): Promise<CreatorSearchResponse> {
  const pattern = searchLikePattern(rawQuery)
  if (pattern.length < SEARCH_MIN_LENGTH + 2) return { items: [], total: 0, failed: false }

  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return { items: [], total: 0, failed: true }

  const ranked = await supabase.rpc("search_creators_ranked", {
    p_query: normalizeSearchValue(rawQuery),
    p_limit: SEARCH_CREATOR_LIMIT,
  })
  if (!isRankedRpcMissing(ranked.error)) {
    if (ranked.error || !Array.isArray(ranked.data)) {
      return { items: [], total: 0, failed: true }
    }

    const seen = new Set<string>()
    const items: CreatorSearchResult[] = []
    for (const row of ranked.data as RankedCreatorRow[]) {
      const item = row.item
      if (!item || typeof item !== "object") continue
      const id = item.id as string | undefined
      const username = item.username as string | undefined
      if (!id || !username || seen.has(id)) continue
      seen.add(id)
      const worksCount = Number(item.works_count)
      items.push({
        id,
        username,
        displayName: (item.display_name as string | null) ?? null,
        bio: (item.bio as string | null) ?? null,
        avatarUrl: (item.avatar_url as string | null) ?? null,
        avatarConfig: parseAvatarConfig(item.avatar_config),
        ...(Number.isFinite(worksCount) ? { worksCount } : {}),
      })
    }
    const total = Math.max(
      0,
      Number((ranked.data[0] as RankedCreatorRow | undefined)?.total ?? 0) || 0,
    )
    return { items, total, failed: false }
  }

  // Fallback until the ranking migration is applied: keep partial matching,
  // with deterministic username ordering and a batched works-count scan.
  const { data, count, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, avatar_config", {
      count: "exact",
    })
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .order("username", { ascending: true })
    .limit(SEARCH_CREATOR_LIMIT)

  if (error || !data) return { items: [], total: 0, failed: true }

  const rows = data.filter(
    (row) => typeof row.username === "string" && row.username.length > 0,
  )
  if (rows.length === 0) return { items: [], total: 0, failed: false }

  const ids = rows.map((row) => row.id as string)
  const { data: workRows, error: workError } = await supabase
    .from("creations")
    .select("user_id")
    .eq("status", "published")
    .eq("type", "pixel")
    .in("user_id", ids)
    .limit(WORK_COUNT_SCAN_LIMIT)

  const counts = new Map<string, number>()
  if (!workError && workRows) {
    for (const row of workRows) {
      const userId = row.user_id as string | null
      if (!userId) continue
      counts.set(userId, (counts.get(userId) ?? 0) + 1)
    }
  }
  const countsTruncated = workRows?.length === WORK_COUNT_SCAN_LIMIT

  return {
    items: rows.map((row) => ({
      id: row.id as string,
      username: row.username as string,
      displayName: (row.display_name as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      avatarConfig: parseAvatarConfig(row.avatar_config),
      ...(countsTruncated ? {} : { worksCount: counts.get(row.id as string) ?? 0 }),
    })),
    total: count ?? rows.length,
    failed: false,
  }
})
