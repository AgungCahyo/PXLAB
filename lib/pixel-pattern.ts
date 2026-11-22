/**
 * Fill patterns for the fill tool. Patterns are anchored to canvas coordinates (not to the
 * click), so two fills next to each other tile seamlessly. A hit means "paint this cell with the
 * current colour"; a miss leaves the cell as it was, which is the usual pixel-art dither look.
 */
export const PIXEL_FILL_PATTERNS = [
  "solid",
  "checker",
  "dots",
  "dither25",
  "dither75",
  "lines-h",
  "lines-v",
  "diagonal",
  "crosshatch",
  "bricks",
] as const

export type PixelFillPattern = (typeof PIXEL_FILL_PATTERNS)[number]

export function isPixelFillPattern(value: unknown): value is PixelFillPattern {
  return typeof value === "string" && (PIXEL_FILL_PATTERNS as readonly string[]).includes(value)
}

// Classic 4x4 Bayer thresholds, 0..15.
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function mod(n: number, m: number) {
  return ((n % m) + m) % m
}

export function patternHit(pattern: PixelFillPattern, x: number, y: number): boolean {
  switch (pattern) {
    case "solid":
      return true
    case "checker":
      return mod(x + y, 2) === 0
    case "dots":
      return mod(x, 2) === 0 && mod(y, 2) === 0
    case "dither25":
      return BAYER_4[mod(y, 4) * 4 + mod(x, 4)]! < 4
    case "dither75":
      return BAYER_4[mod(y, 4) * 4 + mod(x, 4)]! < 12
    case "lines-h":
      return mod(y, 2) === 0
    case "lines-v":
      return mod(x, 2) === 0
    case "diagonal":
      return mod(x + y, 4) === 0
    case "crosshatch":
      return mod(x, 4) === 0 || mod(y, 4) === 0
    case "bricks": {
      if (mod(y, 4) === 0) return true
      const offset = mod(Math.floor(y / 4), 2) * 4
      return mod(x + offset, 8) === 0
    }
  }
}
