"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"
import { MosaicGrid } from "@/components/social/MosaicGrid"
import { TileGridSkeleton } from "@/components/social/Skeleton"
import { useInfiniteList } from "@/components/social/useInfiniteList"
import { socialButtonClass } from "@/components/social/socialButton"
import { WorkTile } from "@/components/social/WorkTile"
import type { CreationCard } from "@/features/creations/queries"
import { loadMoreExploreAction } from "@/features/explore/actions"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { exploreHref, type ExploreCategoryFilter, type ExploreFeed as Feed } from "@/lib/creations"
import type { Lang } from "@/lib/i18n"
import { isLargeTile, mosaicTileClass, segmentWithBands } from "@/lib/social-mosaic"
import { cn } from "@/lib/utils"

type Saved = { items: CreationCard[]; page: number; pageCount: number; y: number; at: number }

const RESUME_TTL_MS = 10 * 60 * 1000
const RESUME_KEY = "pxlb:explore:resume"
const STORAGE_INDEX_KEY = "pxlb:explore:keys"
const MAX_RESTORE_KEYS = 6
const MAX_RESTORE_ITEMS = 96

function readSaved(key: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

function readKeyIndex(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : []
  } catch {
    return []
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
  interludes,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  feed: Feed
  initialItems: CreationCard[]
  initialPage: number
  pageCount: number
  /** Server-rendered bands placed inside the feed after `at` works (`at` must be a multiple of 5). */
  interludes?: { at: number; node: ReactNode }[]
}) {
  const fetchPage = useCallback(
    (page: number) => loadMoreExploreAction({ category, q, feed, page }),
    [category, q, feed],
  )
  const { items, lastPage, pageCount, status, hasMore, sentinelRef, observerSupported, autoPaused, loadNext, restore } =
    useInfiniteList({ initialItems, initialPage, pageCount: initialPageCount, fetchPage })
  const scrollYRef = useRef(0)
  const stateRef = useRef({ items, lastPage, pageCount })

  const query = { category, q, feed }
  const storageKey = `pxlb:explore:${lang}:${feed}:${category}:${q}:${initialPage}`
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
      const resume = sessionStorage.getItem(RESUME_KEY)
      sessionStorage.removeItem(RESUME_KEY)
      const saved = resume === storageKey ? readSaved(storageKey) : null
      if (
        saved &&
        Date.now() - saved.at < RESUME_TTL_MS &&
        saved.page > initialPage &&
        saved.items[0]?.id === initialItems[0]?.id
      ) {
        // Deferred: avoids a synchronous setState inside the effect body.
        frame = requestAnimationFrame(() => {
          restore({ items: saved.items, page: saved.page, pageCount: saved.pageCount })
          // `instant` overrides the global CSS smooth scrolling; Next's own
          // smooth-scroll guard only covers its route transition, not this
          // post-commit restore.
          frame = requestAnimationFrame(() =>
            window.scrollTo({ top: saved.y, left: 0, behavior: "instant" }),
          )
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
        const payload: Saved = {
          items: current.slice(0, MAX_RESTORE_ITEMS),
          page,
          pageCount: count,
          y: scrollYRef.current,
          at: Date.now(),
        }
        sessionStorage.setItem(storageKey, JSON.stringify(payload))
        const keys = readKeyIndex().filter((key) => key !== storageKey)
        keys.push(storageKey)
        while (keys.length > MAX_RESTORE_KEYS) {
          const oldest = keys.shift()
          if (oldest) sessionStorage.removeItem(oldest)
        }
        sessionStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(keys))
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
      sessionStorage.setItem(RESUME_KEY, storageKey)
    } catch {}
  }

  const segments = segmentWithBands(items, interludes ?? [], !hasMore)

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

      <div
        onClickCapture={(event) => {
          // Only opted-in links set the resume marker. Links without it keep
          // Next's normal scroll behavior and never race with the restore.
          if ((event.target as Element).closest("a[data-explore-resume]")) markResume()
        }}
        className="grid min-w-0 gap-2 sm:gap-3"
      >
        {segments.map((segment) =>
          segment.kind === "tiles" ? (
            <MosaicGrid key={`tiles-${segment.start}`}>
              {segment.items.map((item, offset) => {
                const index = segment.start + offset
                const large = isLargeTile(index, items.length, !hasMore)
                return (
                  <li key={item.id} className={cn("min-w-0", mosaicTileClass(index, large))}>
                    <WorkTile
                      creation={item}
                      lang={lang}
                      size={large ? "large" : "default"}
                      preserveScroll
                    />
                  </li>
                )
              })}
            </MosaicGrid>
          ) : (
            <div key={`band-${segment.at}`} className="min-w-0">
              {segment.node}
            </div>
          ),
        )}
      </div>

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
      {hasMore && status === "idle" && (!observerSupported || autoPaused) ? (
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
