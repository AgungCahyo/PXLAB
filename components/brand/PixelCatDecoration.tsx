import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { PixelCat, type PixelCatSize, type PixelCatVariant } from "./PixelCat"

type Position =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "inline"

const POS: Record<Exclude<Position, "inline">, string> = {
  "top-right": "right-3 top-3 sm:right-4 sm:top-4",
  "top-left": "left-3 top-3 sm:left-4 sm:top-4",
  "bottom-right": "bottom-3 right-3 sm:bottom-4 sm:right-4",
  "bottom-left": "bottom-3 left-3 sm:bottom-4 sm:left-4",
}

export function PixelCatDecoration({
  variant = "sitting",
  size = "md",
  position = "top-right",
  animated = false,
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  position?: Position
  animated?: boolean
  className?: string
}) {
  if (position === "inline") {
    return <PixelCat variant={variant} size={size} animated={animated} className={className} />
  }
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute z-0 select-none", POS[position], className)}>
      <PixelCat variant={variant} size={size} animated={animated} />
    </div>
  )
}

export function PixelCatEmptyState({
  variant = "sleeping",
  size = "lg",
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  className?: string
}) {
  return (
    <div className={cn("mb-1 flex justify-center", className)} aria-hidden="true">
      <PixelCat variant={variant} size={size} animated />
    </div>
  )
}

export function PixelCatCardAccent({
  variant = "curious",
  size = "sm",
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  className?: string
}) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute select-none opacity-80", className)}>
      <PixelCat variant={variant} size={size} />
    </div>
  )
}

export function PixelCatSectionHeader({
  title,
  description,
  variant = "sitting",
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  variant?: PixelCatVariant
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6", className)}>
      <PixelCatDecoration variant={variant} position="top-right" className="opacity-90" />
      <div className="relative z-[1] min-w-0 max-w-2xl pr-16 sm:pr-24">
        <div className="min-w-0">{title}</div>
        {description ? <div className="mt-2 text-[14px] leading-relaxed text-muted">{description}</div> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  )
}
