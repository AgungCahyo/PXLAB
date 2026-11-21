import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Flat filter chip for social surfaces (Explore categories, profile filters). */
export function Pill({
  href,
  selected,
  children,
}: {
  href: string
  selected: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center whitespace-nowrap px-3.5 text-[13px] font-semibold transition-colors",
        selected ? "bg-fg text-bg" : "bg-soft text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  )
}

/** Underlined tab link (Instagram/Threads style) for switching between feeds. */
export function TabLink({
  href,
  selected,
  children,
}: {
  href: string
  selected: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center border-b-2 px-4 text-[14px] font-semibold transition-colors sm:flex-none",
        selected ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  )
}
