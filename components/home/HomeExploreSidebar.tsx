"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "pixelarticons/react"
import { exploreHref, formatCreationTag } from "@/lib/creations"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { EXPLORE_SEARCH_MAX, SEARCH_MIN_LENGTH } from "@/lib/site"

export function HomeExploreSidebar({
  lang,
  trendingTags,
}: {
  lang: Lang
  trendingTags: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const t = socialCopy.feed

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = query.trim()
    setError("")
    if (!next) return
    if (next.length < SEARCH_MIN_LENGTH) {
      setError(copy.searchShort[lang])
      return
    }
    router.push(exploreHref(lang, { q: next, page: 1 }))
  }

  return (
    <aside
      aria-label={t.sidebarAria[lang]}
      className="hidden min-w-0 lg:sticky lg:top-[calc(var(--sticky-top,5px)+1.5rem)] lg:block lg:self-start"
    >
      <div className="grid gap-6">
        <section aria-labelledby="home-search-heading" className="grid gap-2.5">
          <form role="search" className="grid gap-2" onSubmit={onSubmit}>
            <label className="relative block min-w-0">
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
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setError("")
                }}
                maxLength={EXPLORE_SEARCH_MAX}
                enterKeyHint="search"
                placeholder={t.sidebarSearchPlaceholder[lang]}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "home-sidebar-search-error" : undefined}
                className="min-h-11 w-full min-w-0 rounded-[2px] border border-line bg-soft py-2 pl-10 pr-3 text-[14px] text-fg placeholder:text-muted/70 transition-colors focus-visible:border-accent focus-visible:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              />
            </label>
            {error ? (
              <p id="home-sidebar-search-error" role="status" className="text-[12px] text-brick">
                {error}
              </p>
            ) : null}
          </form>
        </section>

        <section aria-labelledby="home-trending-tags-heading" className="grid gap-2.5 border-t border-line pt-5">
          <h2
            id="home-trending-tags-heading"
            className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {t.trendingTagsTitle[lang]}
          </h2>
          {trendingTags.length > 0 ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-2">
              {trendingTags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={exploreHref(lang, { tag })}
                    className="text-[14px] text-fg/85 transition-colors hover:text-[#ff4f00] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    {formatCreationTag(tag)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">{t.trendingTagsEmpty[lang]}</p>
          )}
        </section>
      </div>
    </aside>
  )
}
