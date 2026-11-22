import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Flat empty state for social surfaces (feed, notifications, profile). */
export function SocialEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="grid h-14 w-14 place-items-center bg-soft text-earth" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[1.0625rem] font-semibold text-fg">{title}</h2>
      {description ? <p className="max-w-sm text-[14px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
