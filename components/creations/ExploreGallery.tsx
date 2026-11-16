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

      <div role="toolbar" aria-label={copy.categoryAria[lang]} className="flex flex-wrap gap-2">
        <FilterLink
          href={exploreHref(lang, { ...base, category: "all", page: 1 })}
          selected={category === "all"}
          label={copy.categoryAll[lang]}
        />
        {CREATION_CATEGORIES.map((item) => (
          <FilterLink
            key={item}
            href={exploreHref(lang, { ...base, category: item, page: 1 })}
            selected={category === item}
            label={creationCategoryLabels[item][lang]}
          />
        ))}
      </div>
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
        <nav aria-label={copy.exploreTitle[lang]} className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              href={exploreHref(lang, { ...query, page: page - 1 })}
              className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg"
            >
              {copy.pagePrev[lang]}
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link
              href={exploreHref(lang, { ...query, page: page + 1 })}
              className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg"
            >
              {copy.pageNext[lang]}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
