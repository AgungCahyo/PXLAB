"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { socialButtonClass } from "@/components/social/socialButton"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const THRESHOLD = 72
const RESISTANCE = 0.5
const MAX_PULL = 120
const SETTLE_MS = 450
const DONE_MS = 1200
const REFRESH_TIMEOUT_MS = 8000

/** Controls that own their own touch gestures must never start a feed refresh. */
const IGNORE_SELECTOR = [
  "canvas",
  "[data-pull-refresh-ignore]",
  "[role='dialog']",
  "[aria-modal='true']",
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[class*='overflow-x-auto']",
].join(",")

type PullStatus = "idle" | "pulling" | "refreshing" | "done" | "error"

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)")
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const getServerReducedMotion = () => false

/**
 * Pull-to-refresh for top-level feeds only.
 *
 * The gesture starts only from the first touch at scrollY 0, ignores controls
 * that own touch gestures, and cancels native pull-to-refresh only while the
 * feed is actively being pulled. `router.refresh()` keeps the current content
 * visible; a key bump after it settles remounts the list with fresh server data.
 */
export function PullToRefresh({
  lang,
  children,
  className,
}: {
  lang: Lang
  children: ReactNode
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<PullStatus>("idle")
  const [pull, setPull] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<PullStatus>("idle")
  const pullRef = useRef(0)
  const startYRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const updateStatus = useCallback((next: PullStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const setPullValue = useCallback((value: number) => {
    pullRef.current = value
    setPull(value)
  }, [])

  const resetGesture = useCallback(() => {
    startYRef.current = null
    activeRef.current = false
    setPullValue(0)
    if (statusRef.current === "pulling") updateStatus("idle")
  }, [setPullValue, updateStatus])

  const beginRefresh = useCallback(() => {
    if (statusRef.current === "refreshing") return
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPullValue(0)
      updateStatus("error")
      return
    }
    setPullValue(THRESHOLD)
    updateStatus("refreshing")
    startTransition(() => {
      try {
        router.refresh()
      } catch {
        setPullValue(0)
        updateStatus("error")
      }
    })
  }, [router, setPullValue, updateStatus])

  const endGesture = useCallback(
    (commit: boolean) => {
      if (startYRef.current === null) return
      const reached = commit && pullRef.current >= THRESHOLD
      startYRef.current = null
      activeRef.current = false
      if (reached) beginRefresh()
      else resetGesture()
    },
    [beginRefresh, resetGesture],
  )

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const canStart = (target: EventTarget | null) =>
      !(target instanceof Element) || !target.closest(IGNORE_SELECTOR)

    const onStart = (event: TouchEvent) => {
      if (statusRef.current !== "idle" || event.touches.length !== 1) return
      if (window.scrollY > 0 || !canStart(event.target)) return
      startYRef.current = event.touches[0].clientY
    }

    const onMove = (event: TouchEvent) => {
      if (startYRef.current === null || event.touches.length !== 1) return
      const delta = event.touches[0].clientY - startYRef.current
      if (delta <= 0 || window.scrollY > 0) {
        resetGesture()
        return
      }
      activeRef.current = true
      if (statusRef.current === "idle") updateStatus("pulling")
      setPullValue(Math.min(MAX_PULL, delta * RESISTANCE))
      // Cancel the browser's native pull-to-refresh only while we own the pull.
      if (event.cancelable) event.preventDefault()
    }

    const onEnd = () => endGesture(true)
    const onCancel = () => endGesture(false)

    node.addEventListener("touchstart", onStart, { passive: true })
    node.addEventListener("touchmove", onMove, { passive: false })
    node.addEventListener("touchend", onEnd)
    node.addEventListener("touchcancel", onCancel)
    return () => {
      node.removeEventListener("touchstart", onStart)
      node.removeEventListener("touchmove", onMove)
      node.removeEventListener("touchend", onEnd)
      node.removeEventListener("touchcancel", onCancel)
    }
  }, [endGesture, resetGesture, setPullValue, updateStatus])

  useEffect(() => {
    if (status !== "refreshing" || !isPending) return
    // router.refresh() has no failure callback; do not spin forever on a hung
    // navigation. The retry control reuses the same gesture commit path.
    const timer = setTimeout(() => {
      setPullValue(0)
      updateStatus("error")
    }, REFRESH_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isPending, setPullValue, status, updateStatus])

  useEffect(() => {
    if (status !== "refreshing" || isPending) return
    const timer = setTimeout(() => {
      setPullValue(0)
      updateStatus("done")
      setRefreshKey((key) => key + 1)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [isPending, setPullValue, status, updateStatus])

  useEffect(() => {
    if (status !== "done") return
    const timer = setTimeout(() => updateStatus("idle"), DONE_MS)
    return () => clearTimeout(timer)
  }, [status, updateStatus])

  const message =
    status === "refreshing"
      ? copy.pullRefreshing[lang]
      : status === "done"
        ? copy.pullDone[lang]
        : status === "error"
          ? copy.pullFailed[lang]
          : pull >= THRESHOLD
            ? copy.pullRelease[lang]
            : copy.pullRefresh[lang]

  return (
    <div ref={rootRef} data-pull-refresh="true" className={cn("relative min-w-0", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          transform: `translateY(${status === "refreshing" || status === "done" || status === "error" ? 0 : pull - 44}px)`,
          opacity: status === "idle" ? 0 : 1,
          transition: status === "pulling" || reducedMotion ? "none" : "transform 160ms ease, opacity 160ms ease",
        }}
      >
        <div className="mt-1 flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] text-muted shadow-sm">
          <span className={cn("inline-block", status === "refreshing" && !reducedMotion && "animate-spin")}>
            {status === "done" ? "✓" : status === "error" ? "!" : "↻"}
          </span>
          <span>{message}</span>
        </div>
      </div>

      {status === "error" ? (
        <div className="flex justify-center py-3" role="alert">
          <button
            type="button"
            data-pull-refresh-ignore
            onClick={beginRefresh}
            className={socialButtonClass({ variant: "soft" })}
          >
            {copy.errorRetry[lang]}
          </button>
        </div>
      ) : null}

      <div key={refreshKey}>{children}</div>

      <span className="sr-only" role="status" aria-live="polite">
        {status === "idle" && pull === 0 ? "" : message}
      </span>
    </div>
  )
}
