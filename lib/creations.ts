import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import {
  EXPLORE_SEARCH_MAX,
  isCreationCategory,
  type CreationCategory,
} from "@/lib/site"

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

export type ExploreCategoryFilter = CreationCategory | "all"

export type ExploreQuery = {
  category?: ExploreCategoryFilter
  q?: string
  page?: number
}

export function parseExploreCategory(value?: string): ExploreCategoryFilter {
  if (!value || value === "all") return "all"
  if (isCreationCategory(value)) return value
  return "all"
}

export function parseExploreSearch(value?: string): string {
  if (!value) return ""
  return value.trim().slice(0, EXPLORE_SEARCH_MAX)
}

/** Escape LIKE wildcards for PostgREST ilike. */
export function ilikeContains(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
  return `%${escaped}%`
}

export function exploreHref(lang: Lang, query: ExploreQuery = {}, pageArg = 1) {
  const path = href(lang, "/explore")
  const category = query.category ?? "all"
  const q = parseExploreSearch(query.q)
  const page = Math.max(1, query.page ?? pageArg)

  const params = new URLSearchParams()
  if (category !== "all") params.set("category", category)
  if (q) params.set("q", q)
  if (page > 1) params.set("page", String(page))
  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}
