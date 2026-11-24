import { glyphRows, PIXEL_FONT_H, PIXEL_FONT_W } from "@/lib/pixel-font"

/**
 * Font faces the text engine can lay out and rasterise.
 *
 * Only a bitmap face ships today, but layout and raster talk to this interface rather than to the
 * glyph table, so another face (a second bitmap font, or a vector font drawn through an offscreen
 * canvas) can be registered later without touching the layout or the text object model.
 */
export type PixelFontFace = {
  id: string
  label: string
  /** Bitmap faces are drawn on whole-pixel multiples and never anti-aliased. */
  kind: "bitmap"
  /** Native cell height in font pixels (glyph height at scale 1). */
  nativeSize: number
  /** Advance of `char` in font pixels, before letter spacing and bold. */
  advance: (char: string) => number
  /** Row bitmasks for `char`, `nativeSize` rows, bit (advance-1) is the left column. */
  rows: (char: string) => readonly number[]
  /** Glyph bitmap width in columns (<= advance). */
  glyphWidth: number
}

const bitmap5x7: PixelFontFace = {
  id: "pixel-5x7",
  label: "Pixel 5×7",
  kind: "bitmap",
  nativeSize: PIXEL_FONT_H,
  glyphWidth: PIXEL_FONT_W,
  advance: () => PIXEL_FONT_W,
  rows: (char) => glyphRows(char),
}

const registry = new Map<string, PixelFontFace>([[bitmap5x7.id, bitmap5x7]])

export const PIXEL_TEXT_FALLBACK_FONT = bitmap5x7.id

export function registerPixelFont(face: PixelFontFace) {
  registry.set(face.id, face)
}

export function listPixelFonts(): PixelFontFace[] {
  return [...registry.values()]
}

/** Unknown families fall back to the bundled pixel font so a document always renders. */
export function resolvePixelFont(family: string): PixelFontFace {
  return registry.get(family) ?? bitmap5x7
}

/** Integer scale a font size resolves to. Never below 1 so the glyph never collapses. */
export function resolveFontScale(face: PixelFontFace, fontSize: number) {
  return Math.max(1, Math.round(fontSize / face.nativeSize))
}

/** Snap a requested size to what the face can actually draw. */
export function snapFontSize(face: PixelFontFace, fontSize: number) {
  return resolveFontScale(face, fontSize) * face.nativeSize
}
