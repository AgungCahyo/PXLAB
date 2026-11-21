"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { mergeUnique } from "@/lib/social-feed"

export type InfiniteStatus = "idle" | "loading" | "error"
export type PageResult<T> = { ok: true; items: T[]; page: number; pageCount: number } | { ok: false }

/**
 * Shared infinite-scroll engine (Explore + Home feed).
 * - one request at a time, items de-duplicated by id
 * - IntersectionObserver on a sentinel, re-created after each load so a sentinel that is
 *   still on screen immediately pulls the next page
 * - exposes `restore` so callers can resume a previous session without extra renders here
 */
export function useInfiniteList<T extends { id: string }>({
  initialItems,
  initialPage,
  pageCount: initialPageCount,
  fetchPage,
}: {
  initialItems: T[]
  initialPage: number
  pageCount: number
  fetchPage: (page: number) => Promise<PageResult<T>>
}) {
  const [items, setItems] = useState(initialItems)
  const [lastPage, setLastPage] = useState(initialPage)
  const [pageCount, setPageCount] = useState(initialPageCount)
  const [status, setStatus] = useState<InfiniteStatus>("idle")
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadNextRef = useRef<() => void>(() => {})
  const hasMore = lastPage < pageCount

  const observerSupported = useSyncExternalStore(
    () => () => {},
    () => typeof IntersectionObserver !== "undefined",
    () => true,
  )

  const loadNext = useCallback(async () => {
    if (loadingRef.current || lastPage >= pageCount) return
    loadingRef.current = true
    setStatus("loading")
    try {
      const result = await fetchPage(lastPage + 1)
      if (!result.ok) throw new Error("load failed")
      setItems((prev) => mergeUnique(prev, result.items))
      setLastPage(result.page)
      setPageCount(result.pageCount)
      setStatus("idle")
    } catch {
      setStatus("error")
    } finally {
      loadingRef.current = false
    }
  }, [fetchPage, lastPage, pageCount])

  useEffect(() => {
    loadNextRef.current = () => void loadNext()
  }, [loadNext])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || status !== "idle" || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadNextRef.current()
      },
      { rootMargin: "800px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, status, lastPage])

  const restore = useCallback((next: { items: T[]; page: number; pageCount: number }) => {
    setItems(next.items)
    setLastPage(next.page)
    setPageCount(next.pageCount)
  }, [])

  return { items, lastPage, pageCount, status, hasMore, sentinelRef, observerSupported, loadNext, restore }
}
