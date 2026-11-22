import type { ReactNode } from "react"
import Link from "next/link"
import { ExploreSearch } from "@/components/creations/ExploreSearch"
import { ExploreInfinite } from "@/components/social/ExploreInfinite"
import { Pill } from "@/components/social/Pill"
import { PullToRefresh } from "@/components/social/PullToRefresh"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import {
  exploreHref,
  type ExploreCategoryFilter,
  type ExploreFeed,
} from "@/lib/creations"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { CREATION_CATEGORIES } from "@/lib/site"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function ExploreFilters({
  lang,
  category,
  q,
  feed = "all",
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed?: ExploreFeed
}) {
  const base = { category, q, feed }
  return (
    <div className="grid min-w-0 gap-3">
      {/* 1. Search is the primary control: big, calm, first. */}
      <ExploreSearch key={q} lang={lang} category={category} q={q} feed={feed} />

      {/* 2. One quiet row of pills: feed switch first, then the size filters. */}
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
        <span className="h-5 w-px shrink-0 bg-[color:var(--soc-hairline)]" aria-hidden="true" />
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
      </div>
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
      {items.length === 0 ? (
        <SocialEmptyState title={copy.exploreEmptyTitle[lang]} description={emptyDescription} />
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
          href={loginHref(lang, "/explore?feed=following")}
          className={socialButtonClass({ variant: "solid" })}
        >
          {copy.followSignIn[lang]}
        </Link>
      }
    />
  )
}
