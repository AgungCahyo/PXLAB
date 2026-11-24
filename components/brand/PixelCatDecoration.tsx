import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  PixelCat,
  PeekingPixelCat,
  type PixelCatAnimation,
  type PixelCatSize,
  type PixelCatVariant,
} from "./PixelCat"

export type PixelCatPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "bottom-edge"
  | "inline"

const POS: Record<Exclude<PixelCatPosition, "inline" | "bottom-edge">, string> = {
  "top-right": "right-3 top-3 sm:right-5 sm:top-5",
  "top-left": "left-3 top-3 sm:left-5 sm:top-5",
  "bottom-right": "bottom-3 right-3 sm:bottom-5 sm:right-5",
  "bottom-left": "bottom-3 left-3 sm:bottom-5 sm:left-5",
}

/**
 * PixelCatDecoration: Places a pixel cat mascot cleanly inside cards,
 * banners, or sections without interfering with interactive text/buttons.
 */
export function PixelCatDecoration({
  variant = "sitting",
  size = "md",
  position = "top-right",
  animated = false,
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  position?: PixelCatPosition
  animated?: PixelCatAnimation
  className?: string
}) {
  if (position === "inline") {
    return <PixelCat variant={variant} size={size} animated={animated} className={className} />
  }

  if (position === "bottom-edge") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 right-8 z-0 hidden select-none sm:block",
          className,
        )}
      >
        <PeekingPixelCat className="h-16 w-28 opacity-95" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-0 select-none",
        POS[position],
        className,
      )}
    >
      <PixelCat variant={variant} size={size} animated={animated} />
    </div>
  )
}

/**
 * PixelCatEmptyState: Friendly, modern empty state illustration.
 * Features a cute mascot, soft ambient glow, clear typography, and action buttons.
 */
export function PixelCatEmptyState({
  variant = "sleeping",
  size = "lg",
  title,
  description,
  action,
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className,
      )}
    >
      {/* Mascot with soft decorative halo */}
      <div className="relative mb-3 flex items-center justify-center">
        <div
          className="pointer-events-none absolute h-24 w-24 rounded-full bg-purple-100/60 blur-xl"
          aria-hidden="true"
        />
        <div className="relative z-10" aria-hidden="true">
          <PixelCat variant={variant} size={size} animated="float" />
        </div>
      </div>

      {title && (
        <h3 className="text-[16px] font-semibold tracking-tight text-fg sm:text-[18px]">
          {title}
        </h3>
      )}

      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted sm:text-[14px]">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * PixelCatCardAccent: Subtle corner accent for cards.
 */
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
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none opacity-80 transition-opacity hover:opacity-100",
        className,
      )}
    >
      <PixelCat variant={variant} size={size} />
    </div>
  )
}

/**
 * PixelCatSectionHeader: Clean rounded card header with PXLB mascot accent.
 */
export function PixelCatSectionHeader({
  title,
  description,
  badge = "PXLB",
  variant = "sitting",
  peeking = false,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  badge?: string | null
  variant?: PixelCatVariant
  peeking?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      {/* Decorative ambient gradient */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-purple-100/40 via-sky/10 to-transparent blur-2xl"
        aria-hidden="true"
      />

      {/* Mascot Placement */}
      {peeking ? (
        <div className="pointer-events-none absolute bottom-0 right-8 z-0 hidden sm:block">
          <PeekingPixelCat className="h-16 w-28 opacity-95" />
        </div>
      ) : (
        <PixelCatDecoration variant={variant} position="top-right" className="opacity-90" />
      )}

      <div className="relative z-[1] min-w-0 max-w-2xl pr-16 sm:pr-24">
        {badge && (
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">
            {badge}
          </p>
        )}
        <div className="min-w-0 text-[22px] font-semibold tracking-tight text-fg sm:text-[26px]">
          {title}
        </div>
        {description ? (
          <div className="mt-2 text-[14px] leading-relaxed text-muted">{description}</div>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  )
}

/**
 * PixelCatBanner: Complete banner card matching the PXLB modern dashboard signature.
 */
export function PixelCatBanner({
  breadcrumb,
  sparkle = true,
  title,
  subtitle,
  actions,
  className,
}: {
  breadcrumb?: ReactNode
  sparkle?: boolean
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-6 shadow-sm transition-all sm:p-8",
        className,
      )}
    >
      {/* Subtle ambient light */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100/40 via-sky/10 to-transparent blur-2xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {breadcrumb && (
            <div className="mb-2.5 text-[13px] text-muted">{breadcrumb}</div>
          )}

          <div className="flex items-center gap-2.5">
            {sparkle && (
              <span className="text-xl sm:text-2xl" role="img" aria-hidden="true">
                ✨
              </span>
            )}
            <h1 className="text-[17px] font-semibold leading-snug text-fg sm:text-[26px]">
              {title}
            </h1>
          </div>

          {subtitle && (
            <div className="mt-1.5 text-[14px] leading-relaxed text-muted">
              {subtitle}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex flex-col items-end gap-3 self-end sm:self-center">
            {actions}
          </div>
        )}
      </div>

      {/* Peeking Mascot on the Right edge */}
      <div className="pointer-events-none absolute bottom-0 right-10 hidden sm:block">
        <PeekingPixelCat className="h-16 w-28 opacity-95" />
      </div>
    </section>
  )
}
