"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js once on supported browsers — production builds only.
 *
 * In development the SW is never registered, and any registration/cache left over from an
 * earlier session is removed. The SW serves /_next/static/ cache-first, which in dev hands the
 * browser stale client chunks while the server renders fresh HTML (hydration mismatch on a
 * normal refresh, fine after a hard refresh). To QA the PWA locally use `next build && next start`.
 *
 * updateViaCache: "none" so SW updates are not stuck behind HTTP cache.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
          if ("caches" in window) {
            const keys = await caches.keys()
            await Promise.all(keys.filter((key) => key.startsWith("pxlb-pwa-")).map((key) => caches.delete(key)))
          }
        } catch {
          // Best effort cleanup — non-fatal.
        }
      })()
      return
    }

    let disposed = false
    let cleanup: (() => void) | undefined
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        if (disposed) return
        // Check for updates periodically while the tab is open.
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            void reg.update()
          }
        }
        document.addEventListener("visibilitychange", onVisible)
        cleanup = () => document.removeEventListener("visibilitychange", onVisible)
        if (disposed) {
          cleanup()
          cleanup = undefined
        }
      } catch {
        // Registration can fail on HTTP (non-localhost) or blocked SW — non-fatal.
      }
    }
    void register()
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  return null
}
