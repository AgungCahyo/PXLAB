import Link from "next/link"
import { cn } from "@/lib/utils"

export type PxlbLogoSize = "xs" | "sm" | "md" | "lg" | "xl"
export type PxlbLogoLayout = "horizontal" | "stacked" | "mark-only" | "text-only"

const MARK_SIZES: Record<PxlbLogoSize, { box: number; rect: number; gap: number }> = {
  xs: { box: 18, rect: 7, gap: 2 },
  sm: { box: 24, rect: 9, gap: 3 },
  md: { box: 32, rect: 12, gap: 4 },
  lg: { box: 40, rect: 15, gap: 5 },
  xl: { box: 52, rect: 20, gap: 6 },
}

const TEXT_SIZES: Record<PxlbLogoSize, string> = {
  xs: "text-[14px] tracking-tight font-bold",
  sm: "text-[17px] tracking-tight font-bold",
  md: "text-[22px] tracking-tight font-extrabold",
  lg: "text-[28px] tracking-tight font-black",
  xl: "text-[36px] tracking-tight font-black",
}

/**
 * PXLB Mark: The signature 4-quadrant pixel emblem.
 * Uses PXLB's vibrant primary color palette:
 * Sky (Cyan/Blue), Grass (Green), Coin (Gold/Yellow), Brick (Coral/Red).
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
  const { box, rect, gap } = MARK_SIZES[size]
  const offset2 = rect + gap

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={box}
      height={box}
      className={cn(
        "pixel-deco shrink-0 select-none transition-transform duration-200",
        animated && "hover:scale-105 active:scale-95",
        className,
      )}
      aria-hidden="true"
    >
      {/* Top-left: Sky */}
      <rect x="0" y="0" width={rect} height={rect} rx="1.5" className="fill-[#38bdf8]" />
      {/* Top-right: Grass */}
      <rect x={offset2} y="0" width={rect} height={rect} rx="1.5" className="fill-[#34d399]" />
      {/* Bottom-left: Coin */}
      <rect x="0" y={offset2} width={rect} height={rect} rx="1.5" className="fill-[#fbbf24]" />
      {/* Bottom-right: Brick */}
      <rect x={offset2} y={offset2} width={rect} height={rect} rx="1.5" className="fill-[#f43f5e]" />
    </svg>
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
              animated && "group-hover:text-[#6355d8]",
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
        className="inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6355d8]"
        aria-label="PXLB Home"
      >
        {content}
      </Link>
    )
  }

  return content
}
