"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { mergeUnique } from "@/lib/social-feed"

export type InfiniteStatus = "idle" | "loading" | "error"
export type PageResult<T> = { ok: true; items: T[]; page: number; pageCount: number } | { ok: false }

const AUTO_LOAD_LIMIT = 3
const AUTO_ROOT_MARGIN = "240px 0px"

/**
 * Shared infinite-scroll engine (Explore + Home feed).
 * - one request at a time, items de-duplicated by id
 * - IntersectionObserver on a sentinel, re-created after each load; automatic
 *   continuations are capped so a tall viewport cannot walk the whole feed
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
  const [autoPaused, setAutoPaused] = useState(false)
  const loadingRef = useRef(false)
  const autoLoadsRef = useRef(0)
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
    const resetAutoLoads = () => {
      autoLoadsRef.current = 0
      setAutoPaused((prev) => (prev ? false : prev))
    }
    window.addEventListener("scroll", resetAutoLoads, { passive: true })
    return () => window.removeEventListener("scroll", resetAutoLoads)
  }, [])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || status !== "idle" || autoPaused || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        if (autoLoadsRef.current >= AUTO_LOAD_LIMIT) {
          setAutoPaused(true)
          observer.disconnect()
          return
        }
        autoLoadsRef.current += 1
        loadNextRef.current()
      },
      { rootMargin: AUTO_ROOT_MARGIN },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [autoPaused, hasMore, status, lastPage])

  const restore = useCallback((next: { items: T[]; page: number; pageCount: number }) => {
    setItems(next.items)
    setLastPage(next.page)
    setPageCount(next.pageCount)
  }, [])

  return {
    items,
    lastPage,
    pageCount,
    status,
    hasMore,
    sentinelRef,
    observerSupported,
    autoPaused,
    loadNext,
    restore,
  }
}
