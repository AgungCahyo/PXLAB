"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import { TileGridSkeleton } from "@/components/social/Skeleton"
import { useInfiniteList } from "@/components/social/useInfiniteList"
import { socialButtonClass } from "@/components/social/socialButton"
import { WorkTile } from "@/components/social/WorkTile"
import type { CreationCard } from "@/features/creations/queries"
import { loadMoreExploreAction } from "@/features/explore/actions"
import { copy } from "@/lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { exploreHref, type ExploreCategoryFilter, type ExploreFeed as Feed } from "@/lib/creations"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Saved = { items: CreationCard[]; page: number; pageCount: number; y: number; at: number }

const RESUME_TTL_MS = 10 * 60 * 1000

function readSaved(key: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

/**
 * Infinite scroll on top of URL pagination.
 * - Page N is server-rendered; later pages come from loadMoreExploreAction.
 * - Without JS (or if the observer/action fails) the prev/next links still work.
 * - Items are de-duplicated by id, so a work published mid-scroll never shows twice.
 * - Returning from a work restores the loaded items and scroll position.
 */
export function ExploreInfinite({
  lang,
  category,
  q,
  feed,
  initialItems,
  initialPage,
  pageCount: initialPageCount,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed: Feed
  initialItems: CreationCard[]
  initialPage: number
  pageCount: number
}) {
  const fetchPage = useCallback(
    (page: number) => loadMoreExploreAction({ category, q, feed, page }),
    [category, q, feed],
  )
  const { items, lastPage, pageCount, status, hasMore, sentinelRef, observerSupported, loadNext, restore } =
    useInfiniteList({ initialItems, initialPage, pageCount: initialPageCount, fetchPage })
  const scrollYRef = useRef(0)
  const stateRef = useRef({ items, lastPage, pageCount })

  const query = { category, q, feed }
  const storageKey = `pxlb:explore:${lang}:${feed}:${category}:${q}:${initialPage}`
  const resumeKey = `${storageKey}:resume`
  // False in server HTML (no-JS users see the pagination links), true once hydrated.
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Keep the latest state for the unload/unmount save below.
  useEffect(() => {
    stateRef.current = { items, lastPage, pageCount }
  }, [items, lastPage, pageCount])

  // Restore after coming back from a work (flag is set only when a tile was clicked).
  useEffect(() => {
    let frame = 0
    try {
      const resume = sessionStorage.getItem(resumeKey)
      sessionStorage.removeItem(resumeKey)
      const saved = resume ? readSaved(storageKey) : null
      if (
        saved &&
        Date.now() - saved.at < RESUME_TTL_MS &&
        saved.page > initialPage &&
        saved.items[0]?.id === initialItems[0]?.id
      ) {
        // Deferred: avoids a synchronous setState inside the effect body.
        frame = requestAnimationFrame(() => {
          restore({ items: saved.items, page: saved.page, pageCount: saved.pageCount })
          frame = requestAnimationFrame(() => window.scrollTo(0, saved.y))
        })
      }
    } catch {}
    return () => cancelAnimationFrame(frame)
    // Mount-only on purpose: keyed by the filters via the parent's `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track scroll and persist on leave (client navigation unmounts; tab close fires pagehide).
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY
    }
    const save = () => {
      try {
        const { items: current, lastPage: page, pageCount: count } = stateRef.current
        if (page <= initialPage) return
        const payload: Saved = { items: current, page, pageCount: count, y: scrollYRef.current, at: Date.now() }
        sessionStorage.setItem(storageKey, JSON.stringify(payload))
      } catch {}
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pagehide", save)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pagehide", save)
      save()
    }
  }, [storageKey, initialPage])

  const markResume = () => {
    try {
      sessionStorage.setItem(resumeKey, "1")
    } catch {}
  }

  const prevHref = initialPage > 1 ? exploreHref(lang, { ...query, page: initialPage - 1 }) : null
  const nextHref = hasMore ? exploreHref(lang, { ...query, page: lastPage + 1 }) : null
  const t = socialCopy.explore

  return (
    <div className="grid min-w-0 gap-4">
      {prevHref ? (
        <Link
          href={prevHref}
          className="inline-flex min-h-11 items-center justify-self-start text-[14px] text-muted hover:text-fg"
        >
          ← {copy.pagePrev[lang]}
        </Link>
      ) : null}

      <ul
        onClickCapture={(event) => {
          if ((event.target as Element).closest("a[href]")) markResume()
        }}
        className="grid min-w-0 grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5 lg:grid-cols-4"
      >
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <WorkTile creation={item} lang={lang} />
          </li>
        ))}
      </ul>

      {status === "loading" ? <TileGridSkeleton count={4} /> : null}

      {status === "error" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
          <p className="text-[14px] text-muted">{t.loadError[lang]}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void loadNext()}
              className={socialButtonClass({ variant: "solid" })}
            >
              {t.retry[lang]}
            </button>
            {nextHref ? (
              <Link href={nextHref} className={socialButtonClass({ variant: "soft" })}>
                {copy.pageNext[lang]}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Observer target. Zero height: layout never shifts. */}
      {hasMore && status === "idle" ? <div ref={sentinelRef} aria-hidden="true" className="h-px" /> : null}

      {/* Manual fallback when IntersectionObserver is unavailable. */}
      {hasMore && status === "idle" && !observerSupported ? (
        <button
          type="button"
          onClick={() => void loadNext()}
          className={socialButtonClass({ variant: "soft", className: "justify-self-center" })}
        >
          {t.loadMore[lang]}
        </button>
      ) : null}

      {!hasMore && pageCount > 1 ? (
        <p className="py-6 text-center text-[13px] text-muted">{t.end[lang]}</p>
      ) : null}

      {/*
        Pagination landmark. Visible without JS; once hydrated it stays in the DOM as
        screen-reader/crawler links while sighted users get infinite scroll.
      */}
      <nav
        aria-label={copy.explorePaginationAria[lang]}
        className={cn(
          "flex items-center justify-between gap-3",
          enhanced ? "sr-only" : "py-2",
        )}
      >
        {prevHref ? <Link href={prevHref}>{copy.pagePrev[lang]}</Link> : <span />}
        <p aria-current="page" className="text-[13px] text-muted">
          {copy.explorePageStatus[lang]
            .replace("{page}", String(lastPage))
            .replace("{pages}", String(pageCount))}
        </p>
        {nextHref ? <Link href={nextHref}>{copy.pageNext[lang]}</Link> : <span />}
      </nav>

      <span className="sr-only" role="status" aria-live="polite">
        {status === "loading" ? t.loadingMore[lang] : ""}
      </span>
    </div>
  )
}
