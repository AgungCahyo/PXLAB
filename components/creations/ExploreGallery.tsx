import type { ReactNode } from "react"
import Link from "next/link"
import { ExploreSearch } from "@/components/creations/ExploreSearch"
import { ExploreInfinite } from "@/components/social/ExploreInfinite"
import { Pill, TabLink } from "@/components/social/Pill"
import { PullToRefresh } from "@/components/social/PullToRefresh"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import {
  exploreHref,
  type ExploreCategoryFilter,
  type ExploreFeed,
  type ExploreScope,
} from "@/lib/creations"
import { copy, creationCategoryLabels } from "../../lib/copy"
import { type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { CREATION_CATEGORIES, SEARCH_MIN_LENGTH } from "@/lib/site"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function ExploreFilters({
  lang,
  category,
  q,
  feed = "all",
  scope = "all",
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed?: ExploreFeed
  scope?: ExploreScope
}) {
  const base = { category, q, feed, scope }
  const activeQ = q.length >= SEARCH_MIN_LENGTH
  const scopeTabs: { id: ExploreScope; label: string }[] = [
    { id: "all", label: copy.searchTabAll[lang] },
    { id: "creators", label: copy.searchTabCreators[lang] },
    { id: "creations", label: copy.searchTabCreations[lang] },
  ]

  const categoryNav = (
    <nav aria-label={copy.categoryAria[lang]} className="min-w-0">
      <ul className="flex flex-nowrap gap-1.5">
        <li className="shrink-0">
          <Pill href={exploreHref(lang, { ...base, category: "all", page: 1 })} selected={category === "all"}>
            {copy.categoryAll[lang]}
          </Pill>
        </li>
        {CREATION_CATEGORIES.map((item) => (
          <li key={item} className="shrink-0">
            <Pill href={exploreHref(lang, { ...base, category: item, page: 1 })} selected={category === item}>
              {creationCategoryLabels[item][lang]}
            </Pill>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div className="grid min-w-0 gap-3 border-b border-line pb-4 sm:gap-4">
      {/* Search stays the single primary control in both contexts. */}
      <ExploreSearch key={q} lang={lang} category={category} q={q} feed={feed} scope={scope} />

      {activeQ ? (
        <>
          {/* Search replaces the feed switch; never show both navigation systems. */}
          <nav aria-label={copy.searchScopeAria[lang]} className="-mx-1 min-w-0 px-1 sm:mx-0 sm:px-0">
            <ul className="flex min-w-0 border-b border-line">
              {scopeTabs.map((tab) => (
                <li key={tab.id} className="min-w-0 flex-1">
                  <TabLink
                    href={exploreHref(lang, { ...base, scope: tab.id, page: 1 })}
                    selected={scope === tab.id}
                  >
                    {tab.label}
                  </TabLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Creation-only filters appear only when creations are the visible result. */}
          {scope === "creations" ? (
            <div className="-mx-3 min-w-0 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryNav}
            </div>
          ) : null}
        </>
      ) : (
        <div className="-mx-3 flex min-w-0 items-center gap-2 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav aria-label={copy.exploreFeedAria[lang]} className="shrink-0">
            <ul className="flex gap-1.5">
              <li>
                <Pill href={exploreHref(lang, { ...base, feed: "all", page: 1 })} selected={feed === "all"} tone="brand">
                  {copy.exploreFeedAll[lang]}
                </Pill>
              </li>
              <li>
                <Pill
                  href={exploreHref(lang, { ...base, feed: "following", page: 1 })}
                  selected={feed === "following"}
                  tone="brand"
                >
                  {copy.exploreFeedFollowing[lang]}
                </Pill>
              </li>
            </ul>
          </nav>
          <span className="h-5 w-px shrink-0 bg-line" aria-hidden="true" />
          {categoryNav}
        </div>
      )}
    </div>
  )
}

export function ExploreGallery({
  lang,
  category,
  q,
  feed = "all",
  page,
  pageCount,
  items,
  interludes,
  failed = false,
  showEmpty = true,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed?: ExploreFeed
  page: number
  pageCount: number
  items: CreationCardData[]
  /** Bands shown inside the feed (creators rail, quiet works). Discovery view only. */
  interludes?: { at: number; node: ReactNode }[]
  failed?: boolean
  /** Search results own their empty state; the gallery only renders works there. */
  showEmpty?: boolean
}) {
  const emptyDescription =
    feed === "following"
      ? copy.exploreFollowingEmpty[lang]
      : q
        ? copy.exploreSearchEmpty[lang]
        : category !== "all"
          ? copy.exploreEmptySize[lang]
          : copy.exploreEmptyAll[lang]

  return (
    <PullToRefresh lang={lang}>
      {failed ? (
        <SocialEmptyState
          className="px-4 py-10"
          title={copy.exploreLoadError[lang]}
          description={copy.exploreLoadHint[lang]}
          action={
            <Link
              href={exploreHref(lang, { category, feed, q, page: 1 })}
              className={socialButtonClass({ variant: "solid", size: "sm" })}
            >
              {copy.exploreRetry[lang]}
            </Link>
          }
        />
      ) : items.length === 0 ? (
        showEmpty ? (
          <SocialEmptyState
            className="px-4 py-10 rounded-none border border-dashed border-line bg-soft"
            illustration={feed === "following" ? "looking" : q ? "confused" : "curious"}
            title={copy.exploreEmptyTitle[lang]}
            description={emptyDescription}
          />
        ) : null
      ) : (
        <ExploreInfinite
          // New filters/page = fresh client state (loaded pages, scroll bookkeeping).
          key={`${feed}|${category}|${q}|${page}`}
          lang={lang}
          category={category}
          q={q}
          feed={feed}
          initialItems={items}
          initialPage={page}
          pageCount={pageCount}
          interludes={interludes}
        />
      )}
    </PullToRefresh>
  )
}

export function ExploreFollowingGuest({ lang }: { lang: Lang }) {
  return (
    <SocialEmptyState
      title={copy.exploreFeedFollowing[lang]}
      description={copy.exploreFollowingGuest[lang]}
      action={
        <Link
          href={loginHref(lang, exploreHref(lang, { feed: "following" }))}
          className={socialButtonClass({ variant: "solid" })}
        >
          {copy.followSignIn[lang]}
        </Link>
      }
    />
  )
}
