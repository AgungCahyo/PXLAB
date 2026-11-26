import Link from "next/link"
import { PxlbMark as CanonicalPxlbMark } from "@/components/layout/PxlbMark"
import { cn } from "@/lib/utils"

export type PxlbLogoSize = "xs" | "sm" | "md" | "lg" | "xl"
export type PxlbLogoLayout = "horizontal" | "stacked" | "mark-only" | "text-only"

const MARK_CLASSES: Record<PxlbLogoSize, string> = {
  xs: "h-[18px] w-[18px]",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-[52px] w-[52px]",
}

const TEXT_SIZES: Record<PxlbLogoSize, string> = {
  xs: "text-[14px] tracking-tight font-bold",
  sm: "text-[17px] tracking-tight font-bold",
  md: "text-[22px] tracking-tight font-extrabold",
  lg: "text-[28px] tracking-tight font-black",
  xl: "text-[36px] tracking-tight font-black",
}

/**
 * PXLB Mark: Delegates to the canonical sharp 4-quadrant pixel mark.
 */
export function PxlbMark({
  size = "md",
  className,
  animated = false,
}: {
  size?: PxlbLogoSize
  className?: string
  animated?: boolean
}) {
  return (
    <CanonicalPxlbMark
      className={cn(
        "shrink-0 select-none transition-transform duration-200",
        MARK_CLASSES[size],
        animated && "hover:scale-105 active:scale-95",
        className,
      )}
    />
  )
}

/**
 * PXLB Brand Logo: Full logo component with Mark and Typography.
 */
export function PxlbLogo({
  size = "md",
  layout = "horizontal",
  tagline,
  href,
  className,
  animated = true,
}: {
  size?: PxlbLogoSize
  layout?: PxlbLogoLayout
  tagline?: string
  href?: string
  className?: string
  animated?: boolean
}) {
  const showMark = layout !== "text-only"
  const showText = layout !== "mark-only"

  const content = (
    <div
      className={cn(
        "inline-flex items-center",
        layout === "stacked" ? "flex-col items-center gap-1.5 text-center" : "gap-2.5",
        animated && "group transition-all duration-200",
        className,
      )}
    >
      {showMark && <PxlbMark size={size} animated={animated} />}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-sans text-fg select-none transition-colors",
              TEXT_SIZES[size],
              animated && "group-hover:text-accent",
            )}
          >
            PXLB
          </span>
          {tagline && (
            <span className="mt-0.5 text-[10px] font-semibold tracking-wider uppercase text-muted">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {content}
      </Link>
    )
  }

  return content
}
