import type { ReactNode } from "react"
import Link from "next/link"
import { CreatorCardList } from "@/components/creations/CreatorCardList"
import { ExploreFollowingGuest, ExploreGallery } from "@/components/creations/ExploreGallery"
import { Pill } from "@/components/social/Pill"
import {
  CreatorGridSkeleton,
  CreatorRailSkeleton,
  Skeleton,
  TileGridSkeleton,
} from "@/components/social/Skeleton"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import type { CreationCard, CreatorWorkPreview } from "@/features/creations/queries"
import type { CreatorSearchResponse } from "@/features/profiles/queries"
import {
  exploreHref,
  formatCreationTag,
  normalizeSearchValue,
  type ExploreCategoryFilter,
  type ExploreFeed,
  type ExploreScope,
} from "@/lib/creations"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

/** Tags from the current result page that actually relate to the search text. */
export function relevantTagsForSearch(items: CreationCard[], q: string): string[] {
  const needle = normalizeSearchValue(q).toLowerCase()
  if (!needle) return []
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      const lower = tag.toLowerCase()
      if (!lower.includes(needle) && !lower.replace(/_/g, " ").includes(needle)) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([tag]) => tag)
}

function ResultSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section aria-label={label} className="grid min-w-0 gap-2">
      <h3 className="text-[13px] font-semibold text-fg">{label}</h3>
      {children}
    </section>
  )
}

function SearchEmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-[color:var(--soc-hairline)] px-3 py-2 text-[12px] text-muted">
      {children}
    </p>
  )
}

export function SearchOverview({
  lang,
  q,
  category,
  feed,
  scope,
  creators,
  creatorPreviews,
  followingIds,
  member,
  returnPath,
  currentUserId,
  works,
  worksTotal,
  worksFailed,
  worksPage,
  worksPageCount,
  tags,
  guestFollowing = false,
}: {
  lang: Lang
  q: string
  category: ExploreCategoryFilter
  feed: ExploreFeed
  scope: ExploreScope
  creators: CreatorSearchResponse
  creatorPreviews: Record<string, CreatorWorkPreview[]>
  followingIds: Set<string>
  member: boolean
  returnPath: string
  currentUserId: string | null
  works: CreationCard[]
  worksTotal: number
  worksFailed: boolean
  worksPage: number
  worksPageCount: number
  tags: string[]
  guestFollowing?: boolean
}) {
  const clearHref = exploreHref(lang, { category, feed, page: 1 })
  const retryHref = exploreHref(lang, { category, feed, q, scope, page: 1 })
  const showCreators = scope !== "creations"
  const showCreations = scope !== "creators"
  const showTags = scope === "all"
  const creatorsVertical = scope === "creators"
  const hasCreators = showCreators && creators.total > 0
  const hasWorks = showCreations && worksTotal > 0
  const hasTags = showTags && tags.length > 0
  const hasAny = hasCreators || hasWorks || hasTags
  const hasFailed = (showCreators && creators.failed) || (showCreations && worksFailed)

  const header = (
    <>
      <h2 id="search-results-heading" className="sr-only">
        {copy.searchResultsTitle[lang]}
      </h2>
      <div className="flex min-w-0 items-center justify-end border-b border-[color:var(--soc-hairline)] pb-1">
        <Link
          href={clearHref}
          className="inline-flex min-h-11 items-center px-1 text-[13px] text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
        >
          {copy.searchClear[lang]}
        </Link>
      </div>
    </>
  )

  // One quiet message per scope. Never pair it with category-level empty notes.
  if (!hasAny && !hasFailed && !guestFollowing) {
    const empty =
      scope === "creators" ? (
        <SocialEmptyState
          className="px-4 py-8 sm:py-10"
          title={copy.searchCreatorEmpty[lang]}
          description=""
          action={
            <Link href={clearHref} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.searchClear[lang]}
            </Link>
          }
        />
      ) : scope === "creations" ? (
        <SocialEmptyState
          className="px-4 py-8 sm:py-10"
          title={copy.searchCreationEmpty[lang]}
          description=""
          action={
            <Link href={clearHref} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.searchClear[lang]}
            </Link>
          }
        />
      ) : (
        <SocialEmptyState
          className="px-4 py-8 sm:py-10"
          title={copy.searchAllEmpty[lang]}
          description=""
          action={
            <Link href={clearHref} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.searchClear[lang]}
            </Link>
          }
        />
      )
    return (
      <section aria-labelledby="search-results-heading" className="grid min-w-0 gap-2">
        {header}
        {empty}
      </section>
    )
  }

  return (
    <section aria-labelledby="search-results-heading" className="grid min-w-0 gap-4 sm:gap-5">
      {header}

      {showCreators && (hasCreators || creators.failed) ? (
        <ResultSection label={copy.searchSectionCreators[lang]}>
          {creators.failed ? (
            <SearchEmptyNote>
              {copy.searchCreatorError[lang]}{" "}
              <Link
                href={retryHref}
                className="font-semibold text-fg underline decoration-[color:var(--soc-hairline)] underline-offset-2"
              >
                {copy.exploreRetry[lang]}
              </Link>
            </SearchEmptyNote>
          ) : (
            <CreatorCardList
              lang={lang}
              items={creators.items}
              previews={creatorPreviews}
              followingIds={followingIds}
              member={member}
              returnPath={returnPath}
              currentUserId={currentUserId}
              layout={creatorsVertical ? "grid" : "rail"}
              label={copy.searchSectionCreators[lang]}
            />
          )}
        </ResultSection>
      ) : null}

      {showTags && hasTags ? (
        <ResultSection label={copy.searchSectionTags[lang]}>
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li key={tag}>
                <Pill
                  href={exploreHref(lang, { category, feed, q: tag, page: 1 })}
                  selected={q.toLowerCase() === tag.toLowerCase()}
                >
                  {formatCreationTag(tag)}
                </Pill>
              </li>
            ))}
          </ul>
        </ResultSection>
      ) : null}

      {showCreations && (hasWorks || worksFailed || guestFollowing) ? (
        <ResultSection label={copy.searchSectionWorks[lang]}>
          {guestFollowing ? (
            <ExploreFollowingGuest lang={lang} />
          ) : worksFailed ? (
            <SearchEmptyNote>
              {copy.exploreLoadError[lang]}{" "}
              <Link
                href={retryHref}
                className="font-semibold text-fg underline decoration-[color:var(--soc-hairline)] underline-offset-2"
              >
                {copy.exploreRetry[lang]}
              </Link>
            </SearchEmptyNote>
          ) : hasWorks ? (
            <ExploreGallery
              lang={lang}
              category={category}
              q={q}
              feed={feed}
              page={worksPage}
              pageCount={worksPageCount}
              items={works}
              showEmpty={false}
            />
          ) : null}
        </ResultSection>
      ) : null}
    </section>
  )
}

export function SearchOverviewSkeleton({ scope = "all" }: { scope?: ExploreScope }) {
  const showCreators = scope !== "creations"
  const showCreations = scope !== "creators"

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="grid min-w-0 gap-3"
    >
      {showCreators ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          {scope === "creators" ? (
            <CreatorGridSkeleton count={4} />
          ) : (
            <CreatorRailSkeleton count={3} />
          )}
        </div>
      ) : null}
      {showCreations ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <TileGridSkeleton count={4} />
        </div>
      ) : null}
    </div>
  )
}
