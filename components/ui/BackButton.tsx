"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { socialButtonClass } from "@/components/social/socialButton"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  fallbackHref: string
  label: string
  className?: string
}

/**
 * Navigates back in browser history when there is internal session history,
 * or falls back to `fallbackHref` on direct entry / external landing.
 */
export function BackButton({ fallbackHref, label, className }: BackButtonProps) {
  const router = useRouter()

  function handleBack() {
    if (typeof window === "undefined") {
      router.push(fallbackHref)
      return
    }

    const hasHistory = window.history.length > 1
    let landedFromExternal = false
    if (document.referrer) {
      try {
        landedFromExternal =
          new URL(document.referrer).origin !== window.location.origin &&
          window.history.length <= 2
      } catch {
        landedFromExternal = false
      }
    }

    if (hasHistory && !landedFromExternal) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        socialButtonClass({ variant: "ghost", size: "sm" }),
        "-ml-2.5 gap-1.5 text-muted hover:text-fg",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}
