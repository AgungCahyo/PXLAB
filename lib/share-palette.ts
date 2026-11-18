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
  if (full.length !== 6) return 0.2
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
  artStageBg: string
  panelBg: string
  panelFg: string
  panelMuted: string
  accent: string
  artIsDark: boolean
}

/**
 * Derive editorial stage/panel colors from artwork palette usage.
 * Avoids a fixed cream card look; keeps strong contrast for type.
 */
export function socialCardPalette(
  usage: { hex: string; count: number }[] | null | undefined,
): SocialCardPalette {
  const top = (usage ?? [])
    .filter((e) => e.hex && e.hex.toLowerCase() !== "#00000000")
    .slice(0, 4)
  const accent = top[0]?.hex ?? "#59bceb"
  const secondary = top[1]?.hex ?? accent
  const lum = hexLuminance(accent)
  const artIsDark = lum < 0.35

  // Stage: pull from palette, biased dark enough that pixel art pops.
  const artStageBg = artIsDark
    ? mixHex(accent, "#0a0b10", 0.55)
    : mixHex(mixHex(accent, secondary, 0.35), "#12141c", 0.62)

  const panelBg = mixHex("#101218", accent, 0.12)
  return {
    artStageBg,
    panelBg,
    panelFg: "#f3f0ea",
    panelMuted: "#a8a3b0",
    accent,
    artIsDark,
  }
}
