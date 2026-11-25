"use client"

import { useEffect, useRef, useState, startTransition } from "react"
import { createPortal } from "react-dom"
import { usePathname, useSearchParams } from "next/navigation"
import { beginGlobalBusy, endGlobalBusy, subscribeGlobalBusy } from "@/lib/global-busy"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const MIN_VISIBLE_MS = 420

function isInternalHref(href: string) {
  if (!href || href.startsWith("#")) return false
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).origin === window.location.origin
    } catch {
      return false
    }
  }
  return href.startsWith("/")
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function isNextDataFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (headers.get("Next-Router-Prefetch") === "1") return false
  if (headers.get("Purpose") === "prefetch") return false
  if (headers.has("Next-Action")) return true
  if (headers.get("RSC") === "1") return true
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  return /[?&]_rsc=/.test(url)
}

/** Shared busy mark visual (studio embeds its own above the fullscreen stage). */
export function CornerBusyMark({
  lang,
  className,
  visible = true,
}: {
  lang: Lang
  className?: string
  visible?: boolean
}) {
  return (
    <div
      className={cn(
        "corner-busy pointer-events-none fixed z-[9999] flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-card shadow-xl shadow-slate-900/10 transition-opacity duration-200",
        "right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-5 md:right-5",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      aria-label={copy.globalBusy[lang]}
    >
      <span
        className="corner-busy-spin h-[18px] w-[18px] rounded-full border-2"
        style={{
          borderColor: "rgb(99 85 216 / 0.2)",
          borderTopColor: "#6355d8",
        }}
      />
      <span className="sr-only">{copy.globalBusy[lang]}</span>
    </div>
  )
}

/**
 * Small bottom-right busy mark for navigations, server work, and studio persist.
 * Portaled to body so fullscreen studio (z-60) cannot cover it.
 */
export function CornerBusy({ lang }: { lang: Lang }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [busyDepth, setBusyDepth] = useState(0)
  const [routePulse, setRoutePulse] = useState(0)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const shownAtRef = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routePulseRef = useRef(0)

  const wantVisible = busyDepth > 0 || routePulse > 0

  useEffect(() => {
    startTransition(() => setMounted(true))
  }, [])

  useEffect(() => subscribeGlobalBusy(setBusyDepth), [])

  useEffect(() => {
    if (wantVisible) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      shownAtRef.current = Date.now()
      startTransition(() => setVisible(true))
      return
    }
    const elapsed = Date.now() - shownAtRef.current
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      hideTimerRef.current = null
    }, wait)
  }, [wantVisible])

  useEffect(() => {
    routePulseRef.current = 0
    startTransition(() => setRoutePulse(0))
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const pulseRoute = () => {
      routePulseRef.current += 1
      setRoutePulse(routePulseRef.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = setTimeout(() => {
        routePulseRef.current = 0
        setRoutePulse(0)
      }, 8000)
    }

    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!href || !isInternalHref(href)) return
      try {
        const next = new URL(href, window.location.href)
        if (
          next.pathname === window.location.pathname &&
          next.search === window.location.search &&
          next.hash
        ) {
          return
        }
      } catch {
        return
      }
      pulseRoute()
    }

    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const track = isNextDataFetch(input, init)
      if (track) beginGlobalBusy()
      try {
        return await originalFetch(input, init)
      } finally {
        if (track) endGlobalBusy()
      }
    }

    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.fetch = originalFetch
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <CornerBusyMark lang={lang} visible={visible} className="corner-busy-shell" />,
    document.body,
  )
}
