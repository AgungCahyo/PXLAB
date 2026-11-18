import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  kicker,
  title,
  intro,
  actions,
  children,
  className,
}: {
  kicker?: string
  title: string
  intro?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("min-w-0", className)}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          {kicker ? <p className="pixel-kicker mb-3">{kicker}</p> : null}
          <h1 className="pixel-title">{title}</h1>
          {intro ? (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{intro}</p>
          ) : null}
          {children}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

export function SectionHeader({
  id,
  title,
  hint,
  actions,
  className,
}: {
  id?: string
  title: string
  hint?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-0 flex min-w-0 flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-medium text-fg">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-[13px] text-muted">{hint}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
