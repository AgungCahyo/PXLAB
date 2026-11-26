"use client"

import { useEffect, useState } from "react"

const TOP_THRESHOLD = 24
const DELTA_THRESHOLD = 8

export function useScrollDirection() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY)
    let isHidden = false
    let raf = 0

    const setNextHidden = (next: boolean) => {
      if (isHidden === next) return
      isHidden = next
      setHidden(next)
    }

    const update = () => {
      raf = 0
      const y = Math.max(0, window.scrollY)

      if (y <= TOP_THRESHOLD) {
        setNextHidden(false)
        lastY = y
        return
      }

      const delta = y - lastY
      if (Math.abs(delta) < DELTA_THRESHOLD) {
        // Advance the anchor while continuing in the same direction so reversals
        // respond after DELTA_THRESHOLD instead of overcoming accumulated drift.
        if ((delta > 0 && isHidden) || (delta < 0 && !isHidden)) {
          lastY = y
        }
        return
      }

      setNextHidden(delta > 0)
      lastY = y
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return hidden
}
