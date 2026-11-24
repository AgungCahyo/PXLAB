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
        "inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200/80 bg-card px-3.5 text-[14px] font-medium text-fg shadow-sm transition-colors hover:bg-slate-50 hover:text-[#6355d8]",
        className,
      )}
    >
      <PixelIcon name="back" />
      {children}
    </Link>
  )
}
