import Link from "next/link"
import { Search } from "pixelarticons/react"
import { ExploreInfinite } from "@/components/social/ExploreInfinite"
import { Pill, TabLink } from "@/components/social/Pill"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
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
  return (
    <div className="grid min-w-0 gap-3">
      <form action={href(lang, "/explore")} method="get" role="search" className="flex min-w-0 gap-2">
        {feed === "following" ? <input type="hidden" name="feed" value="following" /> : null}
        {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{copy.exploreSearchLabel[lang]}</span>
          <Search
            width={18}
            height={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={EXPLORE_SEARCH_MAX}
            enterKeyHint="search"
            placeholder={copy.exploreSearchPlaceholder[lang]}
            className="min-h-11 w-full min-w-0 border border-transparent bg-soft py-2 pl-10 pr-3 text-[15px] text-fg placeholder:text-muted focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          />
        </label>
        <button type="submit" className={socialButtonClass({ variant: "solid", className: "shrink-0" })}>
          {copy.exploreSearchSubmit[lang]}
        </button>
      </form>

      <nav
        aria-label={copy.exploreFeedAria[lang]}
        className="flex border-b border-[color:var(--soc-hairline)]"
      >
        <TabLink href={exploreHref(lang, { ...base, feed: "all", page: 1 })} selected={feed === "all"}>
          {copy.exploreFeedAll[lang]}
        </TabLink>
        <TabLink
          href={exploreHref(lang, { ...base, feed: "following", page: 1 })}
          selected={feed === "following"}
        >
          {copy.exploreFeedFollowing[lang]}
        </TabLink>
      </nav>

      <nav aria-label={copy.categoryAria[lang]} className="min-w-0">
        <ul className="flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed?: ExploreFeed
  page: number
  pageCount: number
  items: CreationCardData[]
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
