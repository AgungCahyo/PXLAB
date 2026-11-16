/** Shared pixel math for the Playground and the local Space prototype. */
import { PIXEL_SOURCE_MAX_BYTES } from "@/lib/site"

/** Prototype / max side. Playground documents use their own width × height. */
export const PIXEL_CANVAS_SIZE = 512
export const PIXEL_CANVAS_MIN = 8
export const PIXEL_CANVAS_MAX = 512
export const PIXEL_CANVAS_AREA_MAX = PIXEL_CANVAS_MAX * PIXEL_CANVAS_MAX
export const PIXEL_TILE_SIZE = 32
export const PIXEL_PAPER = "#FFFDF7"
export const PIXEL_INK = "#20202A"
export const PIXEL_GRID_MIN_ZOOM = 8
export const PIXEL_ZOOM_STEPS = [1, 2, 4, 8, 12, 16, 24, 32, 48] as const
export const PIXEL_ZOOM_PINCH_MIN = 0.25
export const PIXEL_ZOOM_PINCH_MAX = 48
export type PixelZoomStep = (typeof PIXEL_ZOOM_STEPS)[number]
export type PixelZoom = "fit" | number

export const PIXEL_SIZE_PRESETS = [
  { id: "icon", width: 16, height: 16 },
  { id: "small", width: 32, height: 32 },
  { id: "sprite", width: 64, height: 64 },
  { id: "medium", width: 128, height: 128 },
  { id: "large", width: 256, height: 256 },
  { id: "poster", width: 512, height: 512 },
] as const
export type PixelSizePresetId = (typeof PIXEL_SIZE_PRESETS)[number]["id"]
export const PIXEL_DEFAULT_PRESET: PixelSizePresetId = "sprite"

export function isPixelCanvasDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= PIXEL_CANVAS_MIN && value <= PIXEL_CANVAS_MAX
}

export function isPixelCanvasSize(width: number, height: number) {
  return isPixelCanvasDimension(width) && isPixelCanvasDimension(height) && width * height <= PIXEL_CANVAS_AREA_MAX
}

/** Map canvas size to Explore size category. */
export function pixelSizeCategory(
  width: number,
  height: number,
): (typeof PIXEL_SIZE_PRESETS)[number]["id"] | "custom" {
  const preset = PIXEL_SIZE_PRESETS.find((item) => item.width === width && item.height === height)
  return preset?.id ?? "custom"
}

export const PIXEL_SWATCHES = [
  PIXEL_INK,
  "#FF5C5C",
  "#FF9F1C",
  "#FFE45E",
  "#A8E05F",
  "#55D6BE",
  "#55B8FF",
  "#3867FF",
  "#9B6BFF",
  "#FF75B5",
] as const
export type PixelSwatch = (typeof PIXEL_SWATCHES)[number]

/** Index 0 is always Paper (empty / eraser). Seed for new works; not an allowlist. */
export const PIXEL_PALETTE = [PIXEL_PAPER, ...PIXEL_SWATCHES] as const
export type PixelPaletteColor = (typeof PIXEL_PALETTE)[number]
export const PIXEL_SOURCE_VERSION = 1
export const PIXEL_SOURCE_ENCODING = "rle-index" as const
export const PIXEL_DOCUMENT_PALETTE_MAX = 64
export const PIXEL_RECENT_MAX = 12
export const PIXEL_FAVORITE_MAX = 24
const PIXEL_HEX = /^#[0-9A-Fa-f]{6}$/

export function isPixelSwatch(value: string): value is PixelSwatch {
  return (PIXEL_SWATCHES as readonly string[]).includes(value)
}

export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "")
  const value = Number.parseInt(raw, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function fillPaper(pixels: Uint8ClampedArray) {
  const [r, g, b] = hexToRgb(PIXEL_PAPER)
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = 255
  }
}

export function inCanvas(x: number, y: number, width = PIXEL_CANVAS_SIZE, height = PIXEL_CANVAS_SIZE) {
  return x >= 0 && y >= 0 && x < width && y < height
}

export function setPixel(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
) {
  if (!inCanvas(x, y, width, height)) return
  const i = (y * width + x) * 4
  pixels[i] = rgb[0]
  pixels[i + 1] = rgb[1]
  pixels[i + 2] = rgb[2]
  pixels[i + 3] = 255
}

/** Inclusive Bresenham so fast pointer moves do not skip cells. */
export function walkLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (x: number, y: number) => void,
) {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    visit(x, y)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
}

export function clientToCell(args: {
  clientX: number
  clientY: number
  left: number
  top: number
  originX: number
  originY: number
  scale: number
}) {
  const x = Math.floor((args.clientX - args.left - args.originX) / args.scale)
  const y = Math.floor((args.clientY - args.top - args.originY) / args.scale)
  return { x, y }
}

export function fitScale(
  viewWidth: number,
  viewHeight: number,
  canvasWidth = PIXEL_CANVAS_SIZE,
  canvasHeight = PIXEL_CANVAS_SIZE,
  padding = 16,
) {
  const availW = Math.max(1, viewWidth - padding * 2)
  const availH = Math.max(1, viewHeight - padding * 2)
  return Math.min(availW / canvasWidth, availH / canvasHeight)
}

export function fitOrigin(
  viewWidth: number,
  viewHeight: number,
  scale: number,
  canvasWidth = PIXEL_CANVAS_SIZE,
  canvasHeight = PIXEL_CANVAS_SIZE,
) {
  return {
    originX: (viewWidth - canvasWidth * scale) / 2,
    originY: (viewHeight - canvasHeight * scale) / 2,
  }
}

export function resolveScale(
  zoom: PixelZoom,
  viewWidth: number,
  viewHeight: number,
  canvasWidth = PIXEL_CANVAS_SIZE,
  canvasHeight = PIXEL_CANVAS_SIZE,
) {
  return zoom === "fit" ? fitScale(viewWidth, viewHeight, canvasWidth, canvasHeight) : zoom
}

export function stepZoom(current: PixelZoom, direction: 1 | -1, fit: number): PixelZoom {
  const numeric = current === "fit" ? fit : current
  if (direction > 0) {
    const next = PIXEL_ZOOM_STEPS.find((step) => step > numeric + 0.001)
    return next ?? PIXEL_ZOOM_STEPS[PIXEL_ZOOM_STEPS.length - 1]
  }
  const smaller = [...PIXEL_ZOOM_STEPS].reverse().find((step) => step < numeric - 0.001)
  if (smaller == null || smaller <= fit + 0.001) return "fit"
  return smaller
}

export function zoomToward(args: {
  originX: number
  originY: number
  scale: number
  nextScale: number
  focusX: number
  focusY: number
}) {
  const logicalX = (args.focusX - args.originX) / args.scale
  const logicalY = (args.focusY - args.originY) / args.scale
  return {
    originX: args.focusX - logicalX * args.nextScale,
    originY: args.focusY - logicalY * args.nextScale,
    scale: args.nextScale,
  }
}

export function isPixelPaletteColor(value: string): value is PixelPaletteColor {
  return (PIXEL_PALETTE as readonly string[]).includes(value)
}

/** Canonical drawing color: `#RRGGBB`. Rejects shorthand and named colors. */
export function normalizePixelHex(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (!PIXEL_HEX.test(withHash)) return null
  return withHash.toUpperCase()
}

export function isPixelHexColor(value: string) {
  return normalizePixelHex(value) !== null
}

export function paletteIndexOf(palette: readonly string[], hex: string) {
  const normalized = normalizePixelHex(hex)
  if (!normalized) return -1
  return palette.findIndex((color) => normalizePixelHex(color) === normalized)
}

export function ensurePaletteColor(
  palette: readonly string[],
  hex: string,
): { palette: string[]; index: number } | { error: "invalid_hex" | "palette_full" } {
  const normalized = normalizePixelHex(hex)
  if (!normalized) return { error: "invalid_hex" }
  const existing = paletteIndexOf(palette, normalized)
  if (existing >= 0) return { palette: [...palette], index: existing }
  if (palette.length >= PIXEL_DOCUMENT_PALETTE_MAX) return { error: "palette_full" }
  return { palette: [...palette, normalized], index: palette.length }
}

export function rgbToPaletteIndex(
  r: number,
  g: number,
  b: number,
  palette: readonly string[] = PIXEL_PALETTE,
) {
  for (let i = 0; i < palette.length; i += 1) {
    const [pr, pg, pb] = hexToRgb(palette[i])
    if (pr === r && pg === g && pb === b) return i
  }
  return 0
}

export function rgbaToIndices(
  pixels: Uint8ClampedArray,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  palette: readonly string[] = PIXEL_PALETTE,
) {
  const count = width * height
  const out = new Uint8Array(count)
  const limit = Math.min(count, Math.floor(pixels.length / 4))
  for (let i = 0; i < limit; i += 1) {
    const p = i * 4
    out[i] = rgbToPaletteIndex(pixels[p], pixels[p + 1], pixels[p + 2], palette)
  }
  return out
}

export function indicesToRgba(
  indices: Uint8Array,
  pixels: Uint8ClampedArray,
  palette: readonly string[] = PIXEL_PALETTE,
) {
  const length = Math.min(indices.length, Math.floor(pixels.length / 4))
  for (let i = 0; i < length; i += 1) {
    const color = palette[indices[i]] ?? PIXEL_PAPER
    const [r, g, b] = hexToRgb(color)
    const p = i * 4
    pixels[p] = r
    pixels[p + 1] = g
    pixels[p + 2] = b
    pixels[p + 3] = 255
  }
}

export function encodeRle(indices: Uint8Array) {
  const runs: number[] = []
  if (indices.length === 0) return runs
  let index = indices[0]
  let count = 1
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] === index && count < 65535) {
      count += 1
    } else {
      runs.push(index, count)
      index = indices[i]
      count = 1
    }
  }
  runs.push(index, count)
  return runs
}

export function decodeRle(runs: number[], length: number, paletteSize = PIXEL_DOCUMENT_PALETTE_MAX) {
  if (!Array.isArray(runs) || runs.length % 2 !== 0) return null
  const out = new Uint8Array(length)
  let offset = 0
  for (let i = 0; i < runs.length; i += 2) {
    const index = runs[i]
    const count = runs[i + 1]
    if (
      !Number.isInteger(index) ||
      !Number.isInteger(count) ||
      index < 0 ||
      index >= paletteSize ||
      count < 1 ||
      offset + count > length
    ) {
      return null
    }
    out.fill(index, offset, offset + count)
    offset += count
  }
  if (offset !== length) return null
  return out
}

export type PixelSourceV1 = {
  version: typeof PIXEL_SOURCE_VERSION
  width: number
  height: number
  palette: string[]
  encoding: typeof PIXEL_SOURCE_ENCODING
  runs: number[]
}

export type PixelSourceError =
  | "unsupported_version"
  | "invalid_source"
  | "payload_too_large"
  | "integrity"

export function parsePixelSource(input: unknown): { ok: true; data: PixelSourceV1; indices: Uint8Array } | { ok: false; error: PixelSourceError } {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid_source" }
  const value = input as Record<string, unknown>
  if (value.version !== PIXEL_SOURCE_VERSION) return { ok: false, error: "unsupported_version" }
  if (typeof value.width !== "number" || typeof value.height !== "number") {
    return { ok: false, error: "invalid_source" }
  }
  if (!isPixelCanvasSize(value.width, value.height)) {
    return { ok: false, error: "invalid_source" }
  }
  if (value.encoding !== PIXEL_SOURCE_ENCODING) return { ok: false, error: "invalid_source" }
  if (!Array.isArray(value.palette) || value.palette.length < 1 || value.palette.length > PIXEL_DOCUMENT_PALETTE_MAX) {
    return { ok: false, error: "invalid_source" }
  }
  const palette: string[] = []
  for (const color of value.palette) {
    if (typeof color !== "string") return { ok: false, error: "invalid_source" }
    const hex = normalizePixelHex(color)
    if (!hex) return { ok: false, error: "invalid_source" }
    palette.push(hex)
  }
  if (palette[0] !== PIXEL_PAPER) return { ok: false, error: "invalid_source" }
  if (!Array.isArray(value.runs) || !value.runs.every((item) => Number.isInteger(item))) {
    return { ok: false, error: "invalid_source" }
  }

  const data: PixelSourceV1 = {
    version: PIXEL_SOURCE_VERSION,
    width: value.width,
    height: value.height,
    palette,
    encoding: PIXEL_SOURCE_ENCODING,
    runs: value.runs as number[],
  }

  const encoded = JSON.stringify(data)
  if (encoded.length > PIXEL_SOURCE_MAX_BYTES) return { ok: false, error: "payload_too_large" }

  const expected = data.width * data.height
  const indices = decodeRle(data.runs, expected, data.palette.length)
  if (!indices) return { ok: false, error: "integrity" }
  return { ok: true, data, indices }
}

export function buildPixelSource(
  indices: Uint8Array,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  palette: readonly string[] = PIXEL_PALETTE,
): PixelSourceV1 {
  return {
    version: PIXEL_SOURCE_VERSION,
    width,
    height,
    palette: palette.map((color) => normalizePixelHex(color) ?? PIXEL_PAPER),
    encoding: PIXEL_SOURCE_ENCODING,
    runs: encodeRle(indices),
  }
}

export function emptyPixelIndices(width = PIXEL_CANVAS_SIZE, height = PIXEL_CANVAS_SIZE) {
  return new Uint8Array(width * height)
}

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

export function isPngBuffer(bytes: Uint8Array) {
  if (bytes.length < PNG_SIGNATURE.length) return false
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value)
}
