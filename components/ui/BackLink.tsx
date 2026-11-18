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
        "inline-flex h-11 w-fit items-center gap-2 border-[3px] border-earth bg-card px-3 text-[14px] font-medium text-fg hover:bg-soft",
        className,
      )}
    >
      <PixelIcon name="back" />
      {children}
    </Link>
  )
}
