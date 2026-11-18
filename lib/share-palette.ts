/**
 * Dedicated social-preview design tokens.
 * Independent from website theme / dark mode / CSS variables.
 */

/** Warm ivory canvas — social previews only. */
export const SOCIAL_IVORY = "#faf6ee"
/** Soft warm neutral for stage wash. */
export const SOCIAL_WARM = "#f3ede3"
/** Readable ink on ivory. */
export const SOCIAL_INK = "#2c2825"
/** Secondary type. */
export const SOCIAL_MUTED = "#6b645c"
/** PXLB earth accent (small marks only). */
export const SOCIAL_EARTH = "#936037"
/** Fallback accent when artwork has no usable color. */
export const SOCIAL_SKY = "#59bceb"

/** Relative luminance 0–1 for sRGB hex (#rgb / #rrggbb). */
export function hexLuminance(hex: string): number {
  const raw = hex.replace("#", "").trim()
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw
  if (full.length !== 6) return 0.5
  const channel = (i: number) => {
    const v = Number.parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

export function mixHex(a: string, b: string, amountOfB: number): string {
  const t = Math.min(1, Math.max(0, amountOfB))
  const parse = (hex: string) => {
    const raw = hex.replace("#", "")
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((c) => c + c)
            .join("")
        : raw
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) || 0)
  }
  const A = parse(a)
  const B = parse(b)
  const out = A.map((v, i) => Math.round(v + (B[i]! - v) * t))
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

export type SocialArtAspect = "square" | "portrait" | "landscape"

export function socialArtAspect(width: number, height: number): SocialArtAspect {
  if (!width || !height) return "square"
  const ratio = width / height
  if (ratio > 1.15) return "landscape"
  if (ratio < 0.85) return "portrait"
  return "square"
}

export type SocialCardPalette = {
  /** Full canvas / info band background (warm ivory family). */
  canvasBg: string
  /** Artwork stage wash — ivory lightly tinted by artwork. */
  artStageBg: string
  /** Primary text. */
  ink: string
  /** Secondary text. */
  muted: string
  /** Small accent (artwork hue or PXLB earth). */
  accent: string
  artIsDark: boolean
}

/**
 * Warm editorial palette for social cards.
 * Never returns dark/black panels. Artwork may tint ivory slightly.
 */
export function socialCardPalette(
  usage: { hex: string; count: number }[] | null | undefined,
): SocialCardPalette {
  const top = (usage ?? [])
    .filter((e) => {
      if (!e.hex) return false
      const h = e.hex.toLowerCase()
      return h !== "#00000000" && h !== "#000000" && h !== "#ffffff"
    })
    .slice(0, 4)

  const rawAccent = top[0]?.hex ?? SOCIAL_SKY
  const lum = hexLuminance(rawAccent)
  const artIsDark = lum < 0.35

  // Prefer a mid/bright accent for marks; if dominant is very dark, use earth or secondary.
  const accent =
    lum < 0.22
      ? top.find((e) => hexLuminance(e.hex) >= 0.28)?.hex ?? SOCIAL_EARTH
      : rawAccent

  // Stage: ivory + light wash of artwork color (never darken toward black).
  const washAmount = artIsDark ? 0.08 : 0.14
  const artStageBg = mixHex(SOCIAL_IVORY, accent, washAmount)
  const canvasBg = mixHex(SOCIAL_IVORY, SOCIAL_WARM, 0.35)

  return {
    canvasBg,
    artStageBg,
    ink: SOCIAL_INK,
    muted: SOCIAL_MUTED,
    accent: mixHex(accent, SOCIAL_EARTH, lum > 0.7 ? 0.25 : 0.08),
    artIsDark,
  }
}
