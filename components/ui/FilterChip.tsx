import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FilterChipProps = {
  href: string
  selected?: boolean
  children: ReactNode
  className?: string
  size?: "sm" | "md"
}

/** Link-style filter chip (Explore feed/size, Admin report status). */
export function FilterChip({
  href,
  selected = false,
  children,
  className,
  size = "md",
}: FilterChipProps) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex items-center border-[3px] border-earth whitespace-nowrap",
        size === "sm" ? "min-h-9 px-3 text-[13px]" : "min-h-11 px-3 text-[14px]",
        selected
          ? "bg-brick text-white shadow-[4px_4px_0_0_var(--fg)]"
          : "bg-card text-muted hover:bg-soft hover:text-fg",
        className,
      )}
    >
      {children}
    </Link>
  )
}
