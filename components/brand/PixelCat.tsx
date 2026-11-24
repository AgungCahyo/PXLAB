import Image from "next/image"
import { cn } from "@/lib/utils"

export const PIXEL_CAT_VARIANTS = [
  "sitting",
  "sleeping",
  "waving",
  "drawing",
  "looking",
  "celebrating",
  "confused",
  "peeking",
  "computer",
  "palette",
  "reading",
  "jumping",
  "playing",
  "curious",
] as const

export type PixelCatVariant = (typeof PIXEL_CAT_VARIANTS)[number]

const SIZES = {
  sm: 48,
  md: 72,
  lg: 96,
  xl: 128,
} as const

export type PixelCatSize = keyof typeof SIZES

export function PixelCat({
  variant = "sitting",
  size = "md",
  className,
  decorative = true,
  label,
  animated = false,
  priority = false,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  className?: string
  decorative?: boolean
  label?: string
  animated?: boolean
  priority?: boolean
}) {
  const px = SIZES[size]
  return (
    <Image
      src={`/pixel-cats/${variant}.svg`}
      alt={decorative ? "" : label ?? "Pixel cat"}
      aria-hidden={decorative ? true : undefined}
      width={px}
      height={px}
      priority={priority}
      className={cn(
        "select-none pointer-events-none [image-rendering:pixelated]",
        animated && "motion-safe:animate-[pxlb-float_4s_ease-in-out_infinite]",
        className,
      )}
    />
  )
}

export function PixelCatCorner({
  variant = "peeking",
  size = "md",
  className,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute select-none", className)}
    >
      <PixelCat variant={variant} size={size} />
    </div>
  )
}
