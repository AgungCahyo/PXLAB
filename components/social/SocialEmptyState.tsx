import type { ReactNode } from "react"
import { PixelCat, type PixelCatVariant } from "@/components/brand/PixelCat"
import { cn } from "@/lib/utils"

/** Flat empty state for social surfaces (feed, notifications, profile). */
export function SocialEmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  illustration?: PixelCatVariant
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {illustration ? (
        <div className="mb-1" aria-hidden="true">
          <PixelCat variant={illustration} size="lg" animated />
        </div>
      ) : icon ? (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-[#6355d8]" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[16px] font-semibold text-fg sm:text-[17px]">{title}</h2>
      {description ? <p className="max-w-sm text-[14px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
