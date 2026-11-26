import Link from "next/link"
import type { ReactNode } from "react"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { cn } from "@/lib/utils"

export function BackLink({
  href: to,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={to}
      className={cn(
        "inline-flex min-h-11 w-fit items-center gap-2 rounded-[2px] border border-line bg-card px-3.5 text-[14px] font-medium text-fg transition-colors hover:border-fg/30 hover:bg-soft hover:text-[#ff4f00]",
        className,
      )}
    >
      <PixelIcon name="back" />
      {children}
    </Link>
  )
}
