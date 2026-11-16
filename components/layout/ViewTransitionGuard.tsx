"use client"

import { useEffect } from "react"
import { installViewTransitionAbortFilter } from "@/lib/view-transition-abort"

/**
 * Belt-and-suspenders for benign View Transition aborts (viewport resize / hidden tab).
 * Primary install is in `instrumentation-client.ts` before hydration.
 */
export function ViewTransitionGuard() {
  useEffect(() => {
    installViewTransitionAbortFilter()
  }, [])

  return null
}
