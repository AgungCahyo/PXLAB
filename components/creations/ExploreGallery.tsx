import Link from "next/link"
import { CreationCard } from "@/components/creations/CreationCard"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import {
  exploreHref,
  type ExploreCategoryFilter,
  type ExploreFeed,
} from "@/lib/creations"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { CREATION_CATEGORIES, EXPLORE_SEARCH_MAX } from "@/lib/site"
import { cn } from "@/lib/utils"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

function FilterLink({
  href: to,
  selected,
  label,
}: {
  href: string
  selected: boolean
  label: string
}) {
  return (
    <Link
      href={to}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center border-[3px] px-3 text-[14px]",
        "whitespace-nowrap",
        selected
          ? "border-earth bg-brick text-white shadow-[4px_4px_0_0_var(--fg)]"
          : "border-earth bg-card text-muted hover:bg-soft hover:text-fg",
      )}
    >
      {label}
    </Link>
  )
}

function SizeFilterList({
  lang,
  category,
  q,
  feed,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed: ExploreFeed
}) {
  const base = { category, q, feed }
  return (
    <ul className="flex w-full min-w-0 gap-2 flex-nowrap overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      <li className="shrink-0">
        <FilterLink
          href={exploreHref(lang, { ...base, category: "all", page: 1 })}
          selected={category === "all"}
          label={copy.categoryAll[lang]}
        />
      </li>
      {CREATION_CATEGORIES.map((item) => (
        <li key={item} className="shrink-0">
          <FilterLink
            href={exploreHref(lang, { ...base, category: item, page: 1 })}
            selected={category === item}
            label={creationCategoryLabels[item][lang]}
          />
        </li>
      ))}
    </ul>
  )
}

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
  return (
    <div className="min-w-0 border-b border-line pb-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <nav
          aria-label={copy.exploreFeedAria[lang]}
          className="flex shrink-0 flex-wrap gap-2"
        >
          <FilterLink
            href={exploreHref(lang, { feed: "all", category, q, page: 1 })}
            selected={feed === "all"}
            label={copy.exploreFeedAll[lang]}
          />
          <FilterLink
            href={exploreHref(lang, { feed: "following", category, q, page: 1 })}
            selected={feed === "following"}
            label={copy.exploreFeedFollowing[lang]}
          />
        </nav>

        <form
          action={href(lang, "/explore")}
          method="get"
          role="search"
          className="flex min-w-0 flex-1 gap-2"
        >
          {feed === "following" ? <input type="hidden" name="feed" value="following" /> : null}
          {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{copy.exploreSearchLabel[lang]}</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              <PixelIcon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={EXPLORE_SEARCH_MAX}
              placeholder={copy.exploreSearchPlaceholder[lang]}
              className="min-h-11 w-full min-w-0 border-[3px] border-earth bg-bg py-2 pl-10 pr-3 text-[15px] text-fg placeholder:text-muted"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center border-[3px] border-earth bg-brick px-3 text-[14px] text-white sm:px-4"
          >
            {copy.exploreSearchSubmit[lang]}
          </button>
        </form>
      </div>

      <div className="mt-3 min-w-0 max-w-full">
        <details className="group sm:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-[3px] border-earth bg-card px-3 text-[14px] font-medium text-fg [&::-webkit-details-marker]:hidden">
            <span>{copy.categoryFilterSummary[lang]}</span>
            <span className="truncate text-muted group-open:hidden">
              {category === "all" ? copy.categoryAll[lang] : creationCategoryLabels[category][lang]}
            </span>
            <span className="sr-only">{copy.categoryAria[lang]}</span>
          </summary>
          <nav aria-label={copy.categoryAria[lang]} className="mt-2 min-w-0">
            <SizeFilterList lang={lang} category={category} q={q} feed={feed} />
          </nav>
        </details>
        <nav aria-label={copy.categoryAria[lang]} className="hidden min-w-0 sm:block">
          <SizeFilterList lang={lang} category={category} q={q} feed={feed} />
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
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed?: ExploreFeed
  page: number
  pageCount: number
  items: CreationCardData[]
}) {
  const query = { category, q, feed }
  const emptyDescription =
    feed === "following"
      ? copy.exploreFollowingEmpty[lang]
      : q
        ? copy.exploreSearchEmpty[lang]
        : category !== "all"
          ? copy.exploreEmptySize[lang]
          : copy.exploreEmptyAll[lang]

  return (
    <div className="grid min-w-0 gap-6">
      {items.length === 0 ? (
        <EmptyState title={copy.exploreEmptyTitle[lang]} description={emptyDescription} />
      ) : (
        <ul className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <CreationCard creation={item} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label={copy.explorePaginationAria[lang]}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-[5.5rem]">
            {page > 1 ? (
              <Link
                href={exploreHref(lang, { ...query, page: page - 1 })}
                className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg"
              >
                {copy.pagePrev[lang]}
              </Link>
            ) : null}
          </div>
          <p className="text-[13px] text-muted" aria-current="page">
            {copy.explorePageStatus[lang]
              .replace("{page}", String(page))
              .replace("{pages}", String(pageCount))}
          </p>
          <div className="flex min-w-[5.5rem] justify-end">
            {page < pageCount ? (
              <Link
                href={exploreHref(lang, { ...query, page: page + 1 })}
                className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg"
              >
                {copy.pageNext[lang]}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  )
}

export function ExploreFollowingGuest({ lang }: { lang: Lang }) {
  return (
    <EmptyState
      title={copy.exploreFeedFollowing[lang]}
      description={copy.exploreFollowingGuest[lang]}
      action={
        <Link
          href={loginHref(lang, "/explore?feed=following")}
          className={buttonClassName({ size: "sm" })}
        >
          {copy.followSignIn[lang]}
        </Link>
      }
    />
  )
}
