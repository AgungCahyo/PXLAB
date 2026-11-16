import Link from "next/link"
import { CreationCard } from "@/components/creations/CreationCard"
import { EmptyState } from "@/components/ui/EmptyState"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { exploreHref, type ExploreCategoryFilter } from "@/lib/creations"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
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
        "inline-flex min-h-11 items-center border-[3px] px-4 text-[14px]",
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

export function ExploreFilters({
  lang,
  category,
  q,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
}) {
  const base = { category, q }

  return (
    <div className="mb-6 grid gap-4">
      <form
        action={href(lang, "/explore")}
        method="get"
        role="search"
        className="flex flex-wrap items-end gap-2"
      >
        {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
        <label className="grid min-w-[min(100%,16rem)] flex-1 gap-1.5">
          <span className="text-[14px] font-medium text-fg">{copy.exploreSearchLabel[lang]}</span>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              <PixelIcon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={EXPLORE_SEARCH_MAX}
              placeholder={copy.exploreSearchPlaceholder[lang]}
              className="min-h-11 w-full border-[3px] border-earth bg-bg py-2 pl-10 pr-3 text-[15px] text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center border-[3px] border-earth bg-brick px-4 text-[14px] text-white"
        >
          {copy.exploreSearchSubmit[lang]}
        </button>
      </form>

      <nav aria-label={copy.categoryAria[lang]}>
        {/* Horizontal scroll on narrow viewports so size chips do not own the first screen (full fold = M7). */}
        <ul className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
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
      </nav>
    </div>
  )
}

export function ExploreGallery({
  lang,
  category,
  q,
  page,
  pageCount,
  items,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  page: number
  pageCount: number
  items: CreationCardData[]
}) {
  const query = { category, q }
  const emptyDescription = q
    ? copy.exploreSearchEmpty[lang]
    : category !== "all"
      ? copy.exploreEmptySize[lang]
      : copy.exploreEmptyAll[lang]

  return (
    <div className="grid gap-8">
      {items.length === 0 ? (
        <EmptyState
          icon={<PixelIcon name="grid" className="h-6 w-6" />}
          title={copy.exploreEmptyTitle[lang]}
          description={emptyDescription}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
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
