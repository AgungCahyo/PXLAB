"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js once on supported browsers.
 * updateViaCache: "none" so SW updates are not stuck behind HTTP cache.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    // Avoid registering during local turbopack HMR noise unless explicitly desired.
    // Still register in production builds and preview; allow localhost for QA.
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        // Check for updates periodically while the tab is open.
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            void reg.update()
          }
        }
        document.addEventListener("visibilitychange", onVisible)
        return () => document.removeEventListener("visibilitychange", onVisible)
      } catch {
        // Registration can fail on HTTP (non-localhost) or blocked SW — non-fatal.
      }
    }
    void register()
  }, [])

  return null
}
