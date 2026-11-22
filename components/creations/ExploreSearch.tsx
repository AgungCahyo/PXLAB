"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Search } from "pixelarticons/react"
import { socialCopy } from "@/lib/copy-social"
import {
  exploreHref,
  type ExploreCategoryFilter,
  type ExploreFeed,
} from "@/lib/creations"
import { copy } from "@/lib/copy"
import { socialButtonClass } from "@/components/social/socialButton"
import type { Lang } from "@/lib/i18n"
import { EXPLORE_SEARCH_MAX } from "@/lib/site"

export function ExploreSearch({
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
  const router = useRouter()
  const [query, setQuery] = useState(q)
  const t = socialCopy.explore

  // Remounted by `key={q}` in ExploreGallery when Back/Forward or pills change
  // the URL, so local input state starts from the current q each time.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = query.trim()
    router.push(exploreHref(lang, { category, q: next, feed, page: 1 }))
  }

  return (
    <form role="search" className="flex min-w-0 gap-2" onSubmit={onSubmit}>
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
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={EXPLORE_SEARCH_MAX}
          enterKeyHint="search"
          placeholder={t.searchPlaceholder[lang]}
          className="min-h-12 w-full min-w-0 border border-transparent bg-soft py-2.5 pl-11 pr-3 text-[16px] text-fg placeholder:text-muted focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
        />
      </label>
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
  )
}
