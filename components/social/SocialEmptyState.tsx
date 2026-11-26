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
  const mascot = illustration ?? (icon ? null : "sleeping")

  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {mascot ? (
        <div className="mb-2" aria-hidden="true">
          <PixelCat variant={mascot} size="lg" animated="float" glow />
        </div>
      ) : icon ? (
        <div className="grid h-14 w-14 place-items-center rounded-[2px] border border-line bg-soft text-fg" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[16px] font-semibold text-fg sm:text-[17px]">{title}</h2>
      {description ? <p className="max-w-sm text-[14px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
