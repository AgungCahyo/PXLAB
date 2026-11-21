import type { ReactNode } from "react"
import Link from "next/link"
import { Search } from "pixelarticons/react"
import { ExploreInfinite } from "@/components/social/ExploreInfinite"
import { Pill } from "@/components/social/Pill"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { socialCopy } from "@/lib/copy-social"
import {
  exploreHref,
  type ExploreCategoryFilter,
  type ExploreFeed,
} from "@/lib/creations"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { CREATION_CATEGORIES, EXPLORE_SEARCH_MAX } from "@/lib/site"
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
  const t = socialCopy.explore
  return (
    <div className="grid min-w-0 gap-3">
      {/* 1. Search is the primary control: big, calm, first. */}
      <form action={href(lang, "/explore")} method="get" role="search" className="flex min-w-0 gap-2">
        {feed === "following" ? <input type="hidden" name="feed" value="following" /> : null}
        {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{copy.exploreSearchLabel[lang]}</span>
          <Search
            width={20}
            height={20}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={EXPLORE_SEARCH_MAX}
            enterKeyHint="search"
            placeholder={t.searchPlaceholder[lang]}
            className="min-h-12 w-full min-w-0 border border-transparent bg-soft py-2.5 pl-11 pr-3 text-[16px] text-fg placeholder:text-muted focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          />
        </label>
        {/* Visible from sm up; on phones the keyboard's search key submits (still focusable for a11y). */}
        <button
          type="submit"
          className={socialButtonClass({
            variant: "solid",
            size: "lg",
            className: "sr-only shrink-0 focus:not-sr-only sm:not-sr-only",
          })}
        >
          {t.searchSubmit[lang]}
        </button>
      </form>

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

  if (items.length === 0) {
    return <SocialEmptyState title={copy.exploreEmptyTitle[lang]} description={emptyDescription} />
  }

  return (
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
