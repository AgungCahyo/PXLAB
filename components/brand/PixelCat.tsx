import Image from "next/image"
import { cn } from "@/lib/utils"

export const PIXEL_CAT_VARIANTS = [
  "sitting",
  "idle",
  "happy",
  "excited",
  "laughing",
  "sleeping",
  "curious",
  "confused",
  "surprised",
  "sad",
  "waving",
  "drawing",
  "painting",
  "palette",
  "celebrating",
  "peeking",
  "computer",
  "reading",
  "jumping",
  "playing",
  "looking",
] as const

export type PixelCatVariant = (typeof PIXEL_CAT_VARIANTS)[number]

const SIZES = {
  xs: 32,
  sm: 48,
  md: 72,
  lg: 96,
  xl: 128,
  "2xl": 160,
  hero: 192,
  banner: 240,
} as const

export type PixelCatSize = keyof typeof SIZES

export type PixelCatAnimation =
  | boolean
  | "float"
  | "bob"
  | "breathe"
  | "bounce"
  | "wiggle"

const ANIMATION_CLASSES: Record<Exclude<PixelCatAnimation, false | true>, string> = {
  float: "motion-safe:animate-[pxlb-float_4s_ease-in-out_infinite]",
  bob: "motion-safe:animate-[pxlb-bob_3s_ease-in-out_infinite]",
  breathe: "motion-safe:animate-[pxlb-breathe_4s_ease-in-out_infinite]",
  bounce: "motion-safe:animate-[pxlb-bounce_2s_ease-in-out_infinite]",
  wiggle: "motion-safe:hover:animate-[pxlb-wiggle_0.4s_ease-in-out]",
}

/**
 * Pixel Cat 2.0: The official brand mascot of PXLB.
 * Extremely cute, chibi-proportioned cat with oversized rounded head,
 * large expressive pixel eyes with sparkling reflections, and distinct poses.
 */
export function PixelCat({
  variant = "sitting",
  size = "md",
  className,
  decorative = true,
  label,
  animated = false,
  glow = false,
  priority = false,
}: {
  variant?: PixelCatVariant
  size?: PixelCatSize
  className?: string
  decorative?: boolean
  label?: string
  animated?: PixelCatAnimation
  glow?: boolean
  priority?: boolean
}) {
  const px = SIZES[size] ?? SIZES.md
  // Resolve 'idle' to 'sitting' file
  const fileVariant = variant === "idle" ? "sitting" : variant

  const animKey =
    animated === true
      ? "float"
      : animated === false
        ? null
        : animated
  const animClass = animKey ? ANIMATION_CLASSES[animKey] : undefined

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        glow && "before:absolute before:inset-0 before:rounded-full before:bg-purple-200/50 before:blur-xl before:-z-10",
      )}
    >
      <Image
        src={`/pixel-cats/${fileVariant}.svg`}
        alt={decorative ? "" : label ?? `PXLB Pixel Cat (${variant})`}
        aria-hidden={decorative ? true : undefined}
        width={px}
        height={px}
        priority={priority}
        className={cn(
          "select-none pointer-events-none [image-rendering:pixelated] transition-transform duration-200",
          animClass,
          className,
        )}
      />
    </div>
  )
}

/**
 * PeekingPixelCat: Signature mascot peeking over borders, cards, and banners.
 * Matches the reference design: Crisp vector pixel-art silhouette, pointy ears with pink pads,
 * solid pixel eyes, pink nose & :3 mouth, raised waving paw with sparkles, and paws resting on the frame.
 */
export function PeekingPixelCat({
  className,
  paws = true,
  animated = false,
}: {
  className?: string
  paws?: boolean
  animated?: boolean
}) {
  return (
    <svg
      viewBox="0 0 120 70"
      className={cn(
        "pixel-deco select-none pointer-events-none transition-transform duration-300",
        animated && "motion-safe:animate-[pxlb-bob_4s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden="true"
    >
      {/* Yellow Sparkles on left matching reference */}
      <g fill="#ffd447">
        <rect x="8" y="16" width="3" height="3" />
        <rect x="14" y="14" width="4" height="4" />
        <rect x="18" y="18" width="3" height="3" />
        <rect x="4" y="27" width="3" height="3" />
        <rect x="10" y="29" width="4" height="4" />
      </g>

      {/* Cat body & head silhouette */}
      <rect x="25" y="30" width="70" height="40" fill="#ffffff" />
      <rect x="35" y="15" width="50" height="35" fill="#ffffff" />

      {/* Ears */}
      <rect x="30" y="10" width="15" height="15" fill="#ffffff" />
      <rect x="75" y="10" width="15" height="15" fill="#ffffff" />

      {/* Inner ears */}
      <rect x="33" y="13" width="7" height="7" fill="#fecdd3" />
      <rect x="80" y="13" width="7" height="7" fill="#fecdd3" />

      {/* Stepped dark pixel outline */}
      <path
        d="M28,60 H23 V30 H28 V20 H33 V10 H45 V15 H75 V10 H87 V20 H92 V30 H97 V60 H92 V70 H28 Z"
        fill="none"
        stroke="#1e1b4b"
        strokeWidth="3"
        strokeLinejoin="miter"
      />

      {/* Solid pixel eyes */}
      <rect x="42" y="27" width="4" height="4" fill="#1e1b4b" />
      <rect x="74" y="27" width="4" height="4" fill="#1e1b4b" />

      {/* Nose & cute :3 mouth */}
      <rect x="58" y="31" width="4" height="3" fill="#fb7185" />
      <path
        d="M54,36 H58 V38 H54 Z M62,36 H66 V38 H62 Z M58,36 V39 H62 V36"
        fill="#1e1b4b"
      />

      {/* Paws on border */}
      {paws && (
        <>
          <rect
            x="20"
            y="48"
            width="14"
            height="16"
            rx="4"
            fill="#ffffff"
            stroke="#1e1b4b"
            strokeWidth="3"
          />
          <rect
            x="86"
            y="48"
            width="14"
            height="16"
            rx="4"
            fill="#ffffff"
            stroke="#1e1b4b"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  )
}

/**
 * PixelCatCorner: Convenient positioning for corners or edges.
 */
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
