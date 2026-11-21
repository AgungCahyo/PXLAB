/**
 * Blend-mode maths, kept separate from viewport rendering and layer storage.
 *
 * Formulas follow the W3C Compositing and Blending spec (separable modes). The backdrop
 * is always opaque (Paper sits under every layer) and a layer cell is either empty or fully
 * opaque, so the general alpha formula reduces to:
 *
 *   result = (1 - o) * backdrop + o * B(backdrop, source)
 *
 * where o is the layer opacity (0..1). `normal` at 100% is a plain copy, bit-identical to the
 * pre-V3 compositor.
 */
export const PIXEL_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "add",
  "difference",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "exclusion",
  "subtract",
] as const

export type PixelBlendMode = (typeof PIXEL_BLEND_MODES)[number]

export const PIXEL_OPACITY_MIN = 0
export const PIXEL_OPACITY_MAX = 100

export function isPixelBlendMode(value: unknown): value is PixelBlendMode {
  return typeof value === "string" && (PIXEL_BLEND_MODES as readonly string[]).includes(value)
}

export function clampLayerOpacity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return PIXEL_OPACITY_MAX
  return Math.max(PIXEL_OPACITY_MIN, Math.min(PIXEL_OPACITY_MAX, Math.round(value)))
}

function hardLight(cb: number, cs: number) {
  return cs <= 0.5 ? cb * 2 * cs : cb + (2 * cs - 1) - cb * (2 * cs - 1)
}

function softLight(cb: number, cs: number) {
  if (cs <= 0.5) return cb - (1 - 2 * cs) * cb * (1 - cb)
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb)
  return cb + (2 * cs - 1) * (d - cb)
}

/** B(cb, cs) for one channel, both in 0..1. */
export function blendChannel(mode: PixelBlendMode, cb: number, cs: number): number {
  switch (mode) {
    case "normal":
      return cs
    case "multiply":
      return cb * cs
    case "screen":
      return cb + cs - cb * cs
    case "overlay":
      return hardLight(cs, cb)
    case "darken":
      return Math.min(cb, cs)
    case "lighten":
      return Math.max(cb, cs)
    case "add":
      return Math.min(1, cb + cs)
    case "difference":
      return Math.abs(cb - cs)
    case "color-dodge":
      return cb === 0 ? 0 : cs >= 1 ? 1 : Math.min(1, cb / (1 - cs))
    case "color-burn":
      return cb >= 1 ? 1 : cs <= 0 ? 0 : 1 - Math.min(1, (1 - cb) / cs)
    case "hard-light":
      return hardLight(cb, cs)
    case "soft-light":
      return softLight(cb, cs)
    case "exclusion":
      return cb + cs - 2 * cb * cs
    case "subtract":
      return Math.max(0, cb - cs)
  }
}

/** True when a layer composites as a straight copy (the legacy fast path). */
export function isPlainBlend(opacity: number, mode: PixelBlendMode) {
  return mode === "normal" && opacity >= PIXEL_OPACITY_MAX
}

/**
 * Blend an opaque source colour over an opaque backdrop pixel in `out` at byte offset `p`.
 * `opacity` is 0..100. Alpha is left untouched (backdrop stays opaque).
 */
export function blendOverPixel(
  out: Uint8ClampedArray,
  p: number,
  sr: number,
  sg: number,
  sb: number,
  opacity: number,
  mode: PixelBlendMode,
) {
  if (opacity <= 0) return
  const o = opacity / PIXEL_OPACITY_MAX
  const br = out[p]!
  const bg = out[p + 1]!
  const bb = out[p + 2]!
  if (mode === "normal") {
    if (o >= 1) {
      out[p] = sr
      out[p + 1] = sg
      out[p + 2] = sb
      return
    }
    out[p] = Math.round(br + (sr - br) * o)
    out[p + 1] = Math.round(bg + (sg - bg) * o)
    out[p + 2] = Math.round(bb + (sb - bb) * o)
    return
  }
  const r = blendChannel(mode, br / 255, sr / 255) * 255
  const g = blendChannel(mode, bg / 255, sg / 255) * 255
  const b = blendChannel(mode, bb / 255, sb / 255) * 255
  out[p] = Math.round(br + (r - br) * o)
  out[p + 1] = Math.round(bg + (g - bg) * o)
  out[p + 2] = Math.round(bb + (b - bb) * o)
}
