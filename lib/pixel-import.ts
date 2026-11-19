/**
 * Import Image → indexed pixel art (nearest scale, quantize, dither).
 * View/export buffer stays compatible with PixelBoard layers (index 0 = paper/transparent).
 */
import {
  PIXEL_CANVAS_AREA_MAX,
  PIXEL_CANVAS_MAX,
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PAPER,
  PIXEL_SIZE_PRESETS,
  ensurePaletteColor,
  hexToRgb,
  isPixelCanvasSize,
  normalizePixelHex,
  rgb24Key,
  rgbToHex,
  type PixelSizePresetId,
} from "@/lib/pixel"

export const PIXEL_IMPORT_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
export const PIXEL_IMPORT_MAX_BYTES = 8 * 1024 * 1024
export const PIXEL_IMPORT_MAX_EDGE = 4096
export const PIXEL_IMPORT_ALPHA_THRESHOLD = 128
/** Max colors excluding Paper (index 0). */
export const PIXEL_IMPORT_COLOR_MIN = 2
export const PIXEL_IMPORT_COLOR_MAX = PIXEL_DOCUMENT_PALETTE_MAX - 1

export type PixelImportDither = "none" | "floyd-steinberg" | "ordered"
export type PixelImportPaletteMode = "reduce" | "document"

export type PixelImportSettings = {
  width: number
  height: number
  maintainAspect: boolean
  colorCount: number
  paletteMode: PixelImportPaletteMode
  dither: PixelImportDither
}

export type DecodedImportImage = {
  data: Uint8ClampedArray
  width: number
  height: number
}

export type PixelArtImportResult = {
  indices: Uint8Array
  width: number
  height: number
  /** Local palette; index 0 is always Paper. */
  palette: string[]
}

export type PixelImportValidateError =
  | "type"
  | "too_large"
  | "empty"
  | "dimensions"
  | "decode"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/jpg"])

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

export function validateImportFile(file: File): PixelImportValidateError | null {
  if (!file || file.size <= 0) return "empty"
  if (file.size > PIXEL_IMPORT_MAX_BYTES) return "too_large"
  const type = (file.type || "").toLowerCase()
  if (type && !ALLOWED_TYPES.has(type) && type !== "image/jpg") {
    const name = file.name.toLowerCase()
    if (!/\.(png|jpe?g|webp)$/.test(name)) return "type"
  }
  return null
}

export function defaultImportSettings(
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
): PixelImportSettings {
  const fitted = fitInside(srcW, srcH, canvasW, canvasH)
  return {
    width: fitted.width,
    height: fitted.height,
    maintainAspect: true,
    colorCount: 16,
    paletteMode: "reduce",
    dither: "none",
  }
}

/** Largest size ≤ max that preserves aspect (nearest integers). */
export function fitInside(srcW: number, srcH: number, maxW: number, maxH: number) {
  const sw = Math.max(1, Math.floor(srcW))
  const sh = Math.max(1, Math.floor(srcH))
  const mw = Math.max(1, Math.floor(maxW))
  const mh = Math.max(1, Math.floor(maxH))
  const scale = Math.min(1, mw / sw, mh / sh)
  return {
    width: Math.max(1, Math.round(sw * scale)),
    height: Math.max(1, Math.round(sh * scale)),
  }
}

export function clampImportSize(width: number, height: number, canvasW: number, canvasH: number) {
  let w = Math.round(width)
  let h = Math.round(height)
  // Import patches may be smaller than PIXEL_CANVAS_MIN; never exceed the document.
  w = Math.max(1, Math.min(PIXEL_CANVAS_MAX, canvasW, w))
  h = Math.max(1, Math.min(PIXEL_CANVAS_MAX, canvasH, h))
  if (w * h > PIXEL_CANVAS_AREA_MAX) {
    const scale = Math.sqrt(PIXEL_CANVAS_AREA_MAX / (w * h))
    w = Math.max(1, Math.floor(w * scale))
    h = Math.max(1, Math.floor(h * scale))
  }
  return { width: w, height: h }
}

export function sizeFromPreset(
  id: PixelSizePresetId,
  canvasW: number,
  canvasH: number,
): { width: number; height: number } | null {
  const preset = PIXEL_SIZE_PRESETS.find((item) => item.id === id)
  if (!preset) return null
  return clampImportSize(preset.width, preset.height, canvasW, canvasH)
}

export function resolveImportOutputSize(
  settings: PixelImportSettings,
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
): { width: number; height: number } {
  let width = settings.width
  let height = settings.height
  if (settings.maintainAspect && srcW > 0 && srcH > 0) {
    const aspect = srcW / srcH
    if (width / height > aspect) {
      width = Math.max(1, Math.round(height * aspect))
    } else {
      height = Math.max(1, Math.round(width / aspect))
    }
  }
  return clampImportSize(width, height, canvasW, canvasH)
}

function makeCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

export async function decodeImportImage(file: File): Promise<DecodedImportImage> {
  const invalid = validateImportFile(file)
  if (invalid) throw new Error(invalid)

  const bitmap = await createImageBitmap(file, { colorSpaceConversion: "none" })
  try {
    const width = bitmap.width
    const height = bitmap.height
    if (width < 1 || height < 1) throw new Error("dimensions")
    if (width > PIXEL_IMPORT_MAX_EDGE || height > PIXEL_IMPORT_MAX_EDGE) throw new Error("dimensions")

    const canvas = makeCanvas(width, height)
    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!ctx) throw new Error("decode")
    ctx.drawImage(bitmap, 0, 0)
    const image = ctx.getImageData(0, 0, width, height)
    return { data: image.data, width, height }
  } finally {
    bitmap.close()
  }
}

/** Nearest-neighbor resize to arbitrary size (down or up). */
export function resizeRgbaNearest(
  source: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const sw = Math.max(1, Math.floor(srcW))
  const sh = Math.max(1, Math.floor(srcH))
  const dw = Math.max(1, Math.floor(dstW))
  const dh = Math.max(1, Math.floor(dstH))
  if (source.length < sw * sh * 4) throw new Error("buffer")
  if (sw === dw && sh === dh) return new Uint8ClampedArray(source)

  const out = new Uint8ClampedArray(dw * dh * 4)
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(sh - 1, Math.floor(((y + 0.5) * sh) / dh))
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(sw - 1, Math.floor(((x + 0.5) * sw) / dw))
      const si = (sy * sw + sx) * 4
      const oi = (y * dw + x) * 4
      out[oi] = source[si]!
      out[oi + 1] = source[si + 1]!
      out[oi + 2] = source[si + 2]!
      out[oi + 3] = source[si + 3]!
    }
  }
  return out
}

function colorDistance2(
  r: number,
  g: number,
  b: number,
  pr: number,
  pg: number,
  pb: number,
) {
  const dr = r - pr
  const dg = g - pg
  const db = b - pb
  return dr * dr + dg * dg + db * db
}

function nearestPaletteIndex(
  r: number,
  g: number,
  b: number,
  paletteRgb: readonly (readonly [number, number, number])[],
  startIndex = 1,
) {
  let best = startIndex
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = startIndex; i < paletteRgb.length; i += 1) {
    const [pr, pg, pb] = paletteRgb[i]!
    const dist = colorDistance2(r, g, b, pr, pg, pb)
    if (dist < bestDist) {
      bestDist = dist
      best = i
      if (dist === 0) break
    }
  }
  return best
}

type RgbSample = { r: number; g: number; b: number; n: number }

function collectOpaqueSamples(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): RgbSample[] {
  const counts = new Map<number, RgbSample>()
  const limit = width * height
  for (let i = 0; i < limit; i += 1) {
    const p = i * 4
    const a = rgba[p + 3]!
    if (a < alphaThreshold) continue
    const r = rgba[p]!
    const g = rgba[p + 1]!
    const b = rgba[p + 2]!
    const key = rgb24Key(r, g, b)
    const existing = counts.get(key)
    if (existing) existing.n += 1
    else counts.set(key, { r, g, b, n: 1 })
  }
  return [...counts.values()]
}

function channelRange(samples: RgbSample[], channel: 0 | 1 | 2) {
  let min = 255
  let max = 0
  for (const sample of samples) {
    const v = channel === 0 ? sample.r : channel === 1 ? sample.g : sample.b
    if (v < min) min = v
    if (v > max) max = v
  }
  return max - min
}

function averageSample(samples: RgbSample[]): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (const sample of samples) {
    r += sample.r * sample.n
    g += sample.g * sample.n
    b += sample.b * sample.n
    n += sample.n
  }
  if (n <= 0) return [0, 0, 0]
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

/** Median-cut palette (excludes Paper). */
export function quantizeColorsMedianCut(samples: RgbSample[], maxColors: number): string[] {
  const target = Math.max(1, Math.min(PIXEL_IMPORT_COLOR_MAX, Math.floor(maxColors)))
  if (samples.length === 0) return []
  if (samples.length <= target) {
    return samples
      .slice()
      .sort((a, b) => b.n - a.n)
      .map((sample) => rgbToHex([sample.r, sample.g, sample.b]))
  }

  type Box = RgbSample[]
  const boxes: Box[] = [samples.slice()]
  while (boxes.length < target) {
    let splitAt = -1
    let splitRange = -1
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i]!
      if (box.length < 2) continue
      const range = Math.max(channelRange(box, 0), channelRange(box, 1), channelRange(box, 2))
      if (range > splitRange) {
        splitRange = range
        splitAt = i
      }
    }
    if (splitAt < 0) break
    const box = boxes[splitAt]!
    const ranges = [channelRange(box, 0), channelRange(box, 1), channelRange(box, 2)] as const
    const channel = (ranges[0] >= ranges[1] && ranges[0] >= ranges[2]
      ? 0
      : ranges[1] >= ranges[2]
        ? 1
        : 2) as 0 | 1 | 2
    box.sort((a, b) => {
      const av = channel === 0 ? a.r : channel === 1 ? a.g : a.b
      const bv = channel === 0 ? b.r : channel === 1 ? b.g : b.b
      return av - bv
    })
    let total = 0
    for (const sample of box) total += sample.n
    let acc = 0
    let mid = Math.max(1, box.length - 1)
    for (let i = 0; i < box.length; i += 1) {
      acc += box[i]!.n
      if (acc >= total / 2) {
        mid = Math.max(1, Math.min(box.length - 1, i + 1))
        break
      }
    }
    const left = box.slice(0, mid)
    const right = box.slice(mid)
    boxes.splice(splitAt, 1, left, right)
  }

  return boxes.map((box) => rgbToHex(averageSample(box)))
}

function buildPaletteRgbList(palette: readonly string[]) {
  return palette.map((hex) => hexToRgb(normalizePixelHex(hex) ?? PIXEL_PAPER))
}

function mapRgbaToIndices(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly string[],
  dither: PixelImportDither,
  alphaThreshold: number,
): Uint8Array {
  const paletteRgb = buildPaletteRgbList(palette)
  const out = new Uint8Array(width * height)
  const hasColors = paletteRgb.length > 1

  const work =
    dither === "none"
      ? null
      : {
          r: new Float32Array(width * height),
          g: new Float32Array(width * height),
          b: new Float32Array(width * height),
          a: new Uint8Array(width * height),
        }

  if (work) {
    for (let i = 0; i < width * height; i += 1) {
      const p = i * 4
      work.r[i] = rgba[p]!
      work.g[i] = rgba[p + 1]!
      work.b[i] = rgba[p + 2]!
      work.a[i] = rgba[p + 3]!
    }
  }

  const distribute = (x: number, y: number, er: number, eg: number, eb: number, factor: number) => {
    if (!work) return
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (work.a[i]! < alphaThreshold) return
    work.r[i] = work.r[i]! + er * factor
    work.g[i] = work.g[i]! + eg * factor
    work.b[i] = work.b[i]! + eb * factor
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      const p = i * 4
      const a = work ? work.a[i]! : rgba[p + 3]!
      if (a < alphaThreshold || !hasColors) {
        out[i] = 0
        continue
      }

      let r = work ? work.r[i]! : rgba[p]!
      let g = work ? work.g[i]! : rgba[p + 1]!
      let b = work ? work.b[i]! : rgba[p + 2]!

      if (dither === "ordered") {
        const threshold = ((BAYER_4X4[y & 3]![x & 3]! + 0.5) / 16 - 0.5) * 32
        r += threshold
        g += threshold
        b += threshold
      }

      r = Math.max(0, Math.min(255, Math.round(r)))
      g = Math.max(0, Math.min(255, Math.round(g)))
      b = Math.max(0, Math.min(255, Math.round(b)))

      const index = nearestPaletteIndex(r, g, b, paletteRgb, 1)
      out[i] = index

      if (dither === "floyd-steinberg" && work) {
        const [pr, pg, pb] = paletteRgb[index]!
        const er = r - pr
        const eg = g - pg
        const eb = b - pb
        distribute(x + 1, y, er, eg, eb, 7 / 16)
        distribute(x - 1, y + 1, er, eg, eb, 3 / 16)
        distribute(x, y + 1, er, eg, eb, 5 / 16)
        distribute(x + 1, y + 1, er, eg, eb, 1 / 16)
      }
    }
  }

  return out
}

/**
 * Convert decoded RGBA into indexed pixel art at the requested output size.
 * Local palette always starts with Paper at index 0.
 */
export function convertRgbaToPixelArt(
  source: DecodedImportImage,
  settings: PixelImportSettings,
  canvasW: number,
  canvasH: number,
  documentPalette: readonly string[] = [PIXEL_PAPER],
  alphaThreshold = PIXEL_IMPORT_ALPHA_THRESHOLD,
): PixelArtImportResult {
  const size = resolveImportOutputSize(settings, source.width, source.height, canvasW, canvasH)
  if (!isPixelCanvasSize(size.width, size.height) && size.width * size.height > PIXEL_CANVAS_AREA_MAX) {
    throw new Error("dimensions")
  }

  const resized = resizeRgbaNearest(source.data, source.width, source.height, size.width, size.height)
  const samples = collectOpaqueSamples(resized, size.width, size.height, alphaThreshold)

  let palette: string[] = [PIXEL_PAPER]
  if (settings.paletteMode === "document") {
    const doc = documentPalette.map((hex) => normalizePixelHex(hex) ?? PIXEL_PAPER)
    palette = doc[0] === PIXEL_PAPER ? [...doc] : [PIXEL_PAPER, ...doc.filter((c) => c !== PIXEL_PAPER)]
    if (palette.length === 1) {
      // Fall back to a small reduce if document only has paper.
      palette = [PIXEL_PAPER, ...quantizeColorsMedianCut(samples, Math.min(16, settings.colorCount))]
    }
  } else {
    const count = Math.max(
      PIXEL_IMPORT_COLOR_MIN,
      Math.min(PIXEL_IMPORT_COLOR_MAX, Math.floor(settings.colorCount)),
    )
    palette = [PIXEL_PAPER, ...quantizeColorsMedianCut(samples, count)]
  }

  // Cap to document max (paper + up to 63).
  if (palette.length > PIXEL_DOCUMENT_PALETTE_MAX) {
    palette = palette.slice(0, PIXEL_DOCUMENT_PALETTE_MAX)
  }

  const indices = mapRgbaToIndices(
    resized,
    size.width,
    size.height,
    palette,
    settings.dither,
    alphaThreshold,
  )

  return { indices, width: size.width, height: size.height, palette }
}

/** Merge import palette into document palette; remap indices. */
export function mergeImportIntoDocumentPalette(
  documentPalette: readonly string[],
  localPalette: readonly string[],
  localIndices: Uint8Array,
):
  | { ok: true; palette: string[]; indices: Uint8Array; colorsAdded: number }
  | { ok: false; error: "palette_full" } {
  let palette = [...documentPalette]
  if (palette.length === 0 || palette[0] !== PIXEL_PAPER) {
    palette = [PIXEL_PAPER, ...palette.filter((c) => normalizePixelHex(c) !== PIXEL_PAPER)]
  }

  const remap = new Uint8Array(Math.max(localPalette.length, 1))
  remap[0] = 0
  let colorsAdded = 0

  for (let i = 1; i < localPalette.length; i += 1) {
    const hex = localPalette[i]!
    const ensured = ensurePaletteColor(palette, hex)
    if ("error" in ensured) {
      if (ensured.error === "palette_full") {
        // Map remaining to nearest existing (skip paper for opaque colors).
        const rgb = hexToRgb(normalizePixelHex(hex) ?? PIXEL_PAPER)
        const list = buildPaletteRgbList(palette)
        remap[i] = nearestPaletteIndex(rgb[0], rgb[1], rgb[2], list, 1)
        continue
      }
      remap[i] = 0
      continue
    }
    if (ensured.palette.length > palette.length) colorsAdded += 1
    palette = ensured.palette
    remap[i] = ensured.index
  }

  const indices = new Uint8Array(localIndices.length)
  for (let i = 0; i < localIndices.length; i += 1) {
    const src = localIndices[i] ?? 0
    indices[i] = remap[src] ?? 0
  }

  return { ok: true, palette, indices, colorsAdded }
}

/**
 * Canonical RGBA for an import patch / non-base layer:
 * index 0 → transparent; other indices → opaque palette RGB.
 * Shared by preview and final layer commit so both read the same bytes.
 */
export function indexedImportToRgba(
  indices: Uint8Array,
  width: number,
  height: number,
  palette: readonly string[],
): Uint8ClampedArray {
  const count = Math.max(0, Math.floor(width) * Math.floor(height))
  const out = new Uint8ClampedArray(count * 4)
  for (let i = 0; i < count; i += 1) {
    const index = indices[i] ?? 0
    const p = i * 4
    if (index === 0) {
      out[p] = 0
      out[p + 1] = 0
      out[p + 2] = 0
      out[p + 3] = 0
      continue
    }
    const hex = normalizePixelHex(palette[index] ?? "") ?? PIXEL_PAPER
    const [r, g, b] = hexToRgb(hex)
    out[p] = r
    out[p + 1] = g
    out[p + 2] = b
    out[p + 3] = 255
  }
  return out
}

/**
 * Resolve the exact indices + palette that `importPixelArtLayer` will stamp
 * (after document merge). Preview and confirm must both use this result.
 */
export function resolveImportForDocument(
  converted: PixelArtImportResult,
  documentPalette: readonly string[],
): PixelArtImportResult {
  const merged = mergeImportIntoDocumentPalette(
    documentPalette,
    converted.palette,
    converted.indices,
  )
  if (!merged.ok) return converted
  return {
    indices: merged.indices,
    width: converted.width,
    height: converted.height,
    palette: merged.palette,
  }
}

/**
 * Preview data URL from the same RGBA used for the layer patch.
 * Native 1× putImageData only — no drawImage upscale (avoids color drift).
 * CSS `image-rendering: pixelated` scales the img for display.
 */
export function indicesToPreviewDataUrl(
  indices: Uint8Array,
  width: number,
  height: number,
  palette: readonly string[],
  _scale = 1,
): string | null {
  if (typeof document === "undefined") return null
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const rgba = indexedImportToRgba(indices, w, h, palette)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const image = ctx.createImageData(w, h)
  image.data.set(rgba)
  ctx.putImageData(image, 0, 0)
  try {
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}
