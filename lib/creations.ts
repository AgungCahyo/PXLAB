import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import {
  CREATION_TAG_MAX_LEN,
  CREATION_TAG_MIN_LEN,
  EXPLORE_SEARCH_MAX,
  isCreationCategory,
  type CreationCategory,
} from "@/lib/site"

const TAG_BODY = new RegExp(
  `^[a-z0-9_]{${CREATION_TAG_MIN_LEN},${CREATION_TAG_MAX_LEN}}$`,
)

/**
 * Stored when a draft has no name yet. Schema requires 1–80 characters;
 * this marker is never shown as a public title.
 */
export const DRAFT_UNNAMED_TITLE = "\u2060"

const LEGACY_UNNAMED_TITLES = new Set(["Tanpa judul", "Untitled", DRAFT_UNNAMED_TITLE])

export function isUnnamedTitle(title: string) {
  return LEGACY_UNNAMED_TITLES.has(title.trim())
}

export function titleForStorage(title: string) {
  const next = title.trim()
  return next && !isUnnamedTitle(next) ? next : DRAFT_UNNAMED_TITLE
}

export function displayTitle(title: string, lang: Lang) {
  return isUnnamedTitle(title) ? copy.worksUnnamed[lang] : title
}

/** Card/list: collapse whitespace. Null if empty. */
export function captionForCard(caption: string | null | undefined) {
  if (!caption) return null
  const compact = caption.replace(/\s+/g, " ").trim()
  return compact.length > 0 ? compact : null
}

/** Canonical tag: lowercase, no #, a-z0-9_ only, length 2–24. */
export function normalizeCreationTag(raw: string): string | null {
  let value = raw.trim().toLowerCase()
  if (value.startsWith("#")) value = value.slice(1).trim()
  value = value.replace(/\s+/g, "")
  if (!TAG_BODY.test(value)) return null
  return value
}

export function formatCreationTag(tag: string) {
  return `#${tag}`
}

/** Up to 3 tags for cards; rest summarized as +N. */
export function tagsForCard(tags: string[] | null | undefined) {
  const list = (tags ?? []).filter(Boolean)
  if (list.length === 0) return { visible: [] as string[], more: 0 }
  return {
    visible: list.slice(0, 3),
    more: Math.max(0, list.length - 3),
  }
}

export type ExploreCategoryFilter = CreationCategory | "all"
export type ExploreFeed = "all" | "following"
export type ExploreScope = "all" | "creators" | "creations"

export type ExploreQuery = {
  category?: ExploreCategoryFilter
  q?: string
  /** Canonical tag without #. Ready for M5 filter. */
  tag?: string
  feed?: ExploreFeed
  /** Which result family is visible while a search query is active. */
  scope?: ExploreScope
  page?: number
}

export function parseExploreCategory(value?: string): ExploreCategoryFilter {
  if (!value || value === "all") return "all"
  if (isCreationCategory(value)) return value
  return "all"
}

export function parseExploreFeed(value?: string): ExploreFeed {
  return value === "following" ? "following" : "all"
}

export function parseExploreScope(value?: string): ExploreScope {
  return value === "creators" || value === "creations" ? value : "all"
}

export function parseExploreSearch(value?: string): string {
  if (!value) return ""
  return value.trim().slice(0, EXPLORE_SEARCH_MAX)
}

export function parseExploreTag(value?: string): string {
  if (!value) return ""
  return normalizeCreationTag(value) ?? ""
}

/** Escape LIKE wildcards for PostgREST ilike. */
export function ilikeContains(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
  return `%${escaped}%`
}

/** Strip an optional leading # and collapse whitespace before searching. */
export function normalizeSearchValue(value: string): string {
  return value.trim().replace(/^#/, "").replace(/\s+/g, " ").trim()
}

/**
 * LIKE pattern for raw `.or()` filters. Reserved PostgREST separators are
 * removed so the user's input cannot break the filter grammar; wildcards stay
 * escaped so they are matched literally.
 */
export function searchLikePattern(value: string): string {
  const term = normalizeSearchValue(value)
    .replace(/[\\",.:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!term) return ""
  return `%${term.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`
}

/** Best-effort canonical tag derived from free-form search text. */
export function searchTagValue(value: string): string | null {
  const raw = normalizeSearchValue(value).replace(/\s+/g, "_")
  return normalizeCreationTag(raw)
}

export function exploreHref(lang: Lang, query: ExploreQuery = {}, pageArg = 1) {
  const path = href(lang, "/explore")
  const category = query.category ?? "all"
  const q = parseExploreSearch(query.q)
  const tag = parseExploreTag(query.tag)
  const feed = query.feed ?? "all"
  const scope = query.scope ?? "all"
  const page = Math.max(1, query.page ?? pageArg)

  const params = new URLSearchParams()
  if (feed === "following") params.set("feed", "following")
  if (category !== "all") params.set("category", category)
  if (q) params.set("q", q)
  if (tag) params.set("tag", tag)
  if (scope !== "all") params.set("scope", scope)
  if (page > 1) params.set("page", String(page))
  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}
