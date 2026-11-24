"use client"

import Link from "next/link"
import { useCallback, useSyncExternalStore } from "react"
import { FeedPost } from "@/components/social/FeedPost"
import { PullToRefresh } from "@/components/social/PullToRefresh"
import type { FeedViewer } from "@/components/social/CommentPanel"
import { FeedSkeleton } from "@/components/social/Skeleton"
import { socialButtonClass } from "@/components/social/socialButton"
import { useInfiniteList } from "@/components/social/useInfiniteList"
import { loadMoreHomeFeedAction } from "@/features/feed/actions"
import type { FeedKind, FeedPostData } from "@/features/feed/queries"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type HomeFeedProps = {
  lang: Lang
  feed: FeedKind
  viewer: FeedViewer | null
  initialItems: FeedPostData[]
  initialPage: number
  pageCount: number
}

function pageHref(lang: Lang, feed: FeedKind, page: number) {
  const prefix = lang === "id" ? "" : `/${lang}`
  const params = new URLSearchParams()
  if (feed === "following") params.set("feed", "following")
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  return `${prefix}/home${query ? `?${query}` : ""}`
}

/** Home feed list: same infinite-scroll engine as Explore, with a pagination landmark fallback. */
function HomeFeedList({
  lang,
  feed,
  viewer,
  initialItems,
  initialPage,
  pageCount: initialPageCount,
}: HomeFeedProps) {
  const t = socialCopy.explore
  const fetchPage = useCallback((page: number) => loadMoreHomeFeedAction({ feed, page }), [feed])
  const { items, lastPage, pageCount, status, hasMore, sentinelRef, observerSupported, autoPaused, loadNext } =
    useInfiniteList({ initialItems, initialPage, pageCount: initialPageCount, fetchPage })
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const prevHref = initialPage > 1 ? pageHref(lang, feed, initialPage - 1) : null
  const nextHref = hasMore ? pageHref(lang, feed, lastPage + 1) : null

  return (
    <div className="min-w-0">
      {prevHref ? (
        <Link href={prevHref} className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg">
          ← {copy.pagePrev[lang]}
        </Link>
      ) : null}

      <div className="grid gap-1">
        {items.map((post) => (
          <FeedPost
            key={post.id}
            lang={lang}
            post={post}
            viewer={viewer}
            loginNext={pageHref(lang, feed, initialPage)}
          />
        ))}
      </div>

      {status === "loading" ? <FeedSkeleton count={1} /> : null}

      {status === "error" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
          <p className="text-[14px] text-muted">{t.loadError[lang]}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => void loadNext()} className={socialButtonClass({ variant: "solid" })}>
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

      {hasMore && status === "idle" ? <div ref={sentinelRef} aria-hidden="true" className="h-px" /> : null}

      {hasMore && status === "idle" && (!observerSupported || autoPaused) ? (
        <div className="flex justify-center py-4">
          <button type="button" onClick={() => void loadNext()} className={socialButtonClass({ variant: "soft" })}>
            {t.loadMore[lang]}
          </button>
        </div>
      ) : null}

      {!hasMore && pageCount > 1 ? <p className="py-6 text-center text-[13px] text-muted">{t.end[lang]}</p> : null}

      <nav
        aria-label={copy.explorePaginationAria[lang]}
        className={cn("flex items-center justify-between gap-3", enhanced ? "sr-only" : "py-2")}
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

/** Pull-to-refresh owns only the remount boundary; the list owns infinite state. */
export function HomeFeed(props: HomeFeedProps) {
  return (
    <PullToRefresh lang={props.lang}>
      <HomeFeedList {...props} />
    </PullToRefresh>
  )
}
