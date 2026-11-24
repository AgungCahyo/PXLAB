import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Modern rounded filter pill for social surfaces (Explore categories, profile filters). */
export function Pill({
  href,
  selected,
  tone = "default",
  children,
}: {
  href: string
  selected: boolean
  /** "brand" marks the primary switch (feed); "default" is a plain filter. */
  tone?: "default" | "brand"
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-all shadow-sm",
        selected
          ? "bg-[#6355d8] text-white shadow-purple-500/20"
          : "border border-slate-200/80 bg-card text-muted hover:border-slate-300 hover:text-fg",
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
        "inline-flex min-h-11 flex-1 items-center justify-center border-b-2 px-5 text-[14px] font-semibold transition-colors sm:flex-none",
        selected
          ? "border-[#6355d8] text-[#6355d8]"
          : "border-transparent text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  )
}
