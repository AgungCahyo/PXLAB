/** Shared pixel math for the Playground and the local Space prototype. */
import { glyphRows, PIXEL_FONT_H, PIXEL_FONT_LEADING, PIXEL_FONT_TRACK, PIXEL_FONT_W } from "@/lib/pixel-font"
import {
  blendChannel,
  blendOverPixel,
  clampLayerOpacity,
  isPixelBlendMode,
  isPlainBlend,
  PIXEL_OPACITY_MAX,
  type PixelBlendMode,
} from "@/lib/pixel-blend"
import {
  clampGroupName,
  createGroupId,
  layerEffectivelyHidden,
  layerSegments,
  normalizeGroups,
  type PixelGroupRuntime,
} from "@/lib/pixel-groups"
import { PIXEL_SOURCE_MAX_BYTES } from "@/lib/site"

/** Prototype / classic square reference. Playground documents use their own width × height. */
export const PIXEL_CANVAS_SIZE = 512
export const PIXEL_CANVAS_MIN = 8
/** Max length of one side (allows wide/tall custom; not a square 1024²). */
export const PIXEL_CANVAS_MAX = 1024
/**
 * Max pixel count (512²). Independent of PIXEL_CANVAS_MAX so landscape/portrait
 * can use a longer side without raising RAM/payload envelope.
 */
export const PIXEL_CANVAS_AREA_MAX = 512 * 512
/** Max edge for client PNG download only (not editor / stored cover). */
export const PIXEL_EXPORT_EDGE_MAX = 2560
export const PIXEL_TILE_SIZE = 32
export const PIXEL_PAPER = "#FFFDF7"
export const PIXEL_INK = "#20202A"
export const PIXEL_GRID_MIN_ZOOM = 8
export const PIXEL_ZOOM_STEPS = [1, 2, 4, 8, 12, 16, 24, 32, 48] as const
export const PIXEL_ZOOM_PINCH_MIN = 0.25
export const PIXEL_ZOOM_PINCH_MAX = 48
/** Common brush diameters for `[` / `]` shortcuts (odd sizes stay centered). */
export const PIXEL_BRUSH_SIZES = [1, 2, 3, 4, 6, 8] as const
/** Stroke / brush width range for SizeSlider and shape tools. */
export const PIXEL_STROKE_MIN = 1
export const PIXEL_STROKE_MAX = 32
/** Brush / stroke width (integer 1–32). */
export type PixelBrushSize = number
export type PixelStrokeWidth = number

export function clampStrokeWidth(size: number): number {
  return Math.max(PIXEL_STROKE_MIN, Math.min(PIXEL_STROKE_MAX, Math.round(size)))
}

/** Step through PIXEL_BRUSH_SIZES; intermediate sizes snap to nearest common step. */
export function stepBrushSize(current: number, direction: -1 | 1): number {
  const sizes = PIXEL_BRUSH_SIZES as readonly number[]
  const exact = sizes.indexOf(clampStrokeWidth(current))
  if (exact >= 0) {
    return sizes[Math.max(0, Math.min(sizes.length - 1, exact + direction))] ?? sizes[0]
  }
  if (direction < 0) {
    const prev = [...sizes].reverse().find((size) => size < current)
    return prev ?? sizes[0]
  }
  const next = sizes.find((size) => size > current)
  return next ?? sizes[sizes.length - 1]
}

/** Cubic Bezier anchor with absolute handle positions. */
export type BezierAnchor = {
  x: number
  y: number
  /** Incoming control (toward previous segment). */
  hiX: number
  hiY: number
  /** Outgoing control (toward next segment). */
  hoX: number
  hoY: number
}
export type PixelZoomStep = (typeof PIXEL_ZOOM_STEPS)[number]
export type PixelZoom = "fit" | number

/** Studio drawing tools (pan is navigation). */
export type PixelDrawTool =
  | "pencil"
  | "circle"
  | "eraser"
  | "pan"
  | "eyedropper"
  | "fill"
  | "polygon"
  | "line"
  | "rect"
  | "ellipse"
  | "bezier"
  | "text"
  | "gradient"
  | "select"
  | "selectContiguous"
  | "selectColor"
  | "lasso"
  | "selectPolygon"

export type PixelBrushShape = "square" | "circle"

export type PixelRect = { x: number; y: number; width: number; height: number }
/** Box selection, optionally with a 1-bit mask the size of the box. */
export type PixelSelection = PixelRect & { mask?: Uint8Array }

export type PixelClipboard = {
  width: number
  height: number
  /** RGBA length width*height*4 */
  data: Uint8ClampedArray
  mask?: Uint8Array
}

export type PixelPoint = { x: number; y: number }

/** Mirror axes while drawing (X = left-right, Y = top-bottom). */
export type PixelSymmetry = "off" | "x" | "y" | "xy"

/** Stage desk behind Paper pixels. `ink` also seeds index 1 (PIXEL_INK) on new drafts. */
export const PIXEL_STAGE_GROUNDS = ["checker", "paper", "ink"] as const
export type PixelStageGround = (typeof PIXEL_STAGE_GROUNDS)[number]

/** Square sizes that map 1:1 to Explore `CREATION_CATEGORIES` (DB check constraint). */
export const PIXEL_SQUARE_PRESETS = [
  { id: "icon", width: 16, height: 16 },
  { id: "small", width: 32, height: 32 },
  { id: "sprite", width: 64, height: 64 },
  { id: "medium", width: 128, height: 128 },
  { id: "large", width: 256, height: 256 },
  { id: "poster", width: 512, height: 512 },
] as const

/**
 * 16:9 / portrait wallpaper bases (area ≤ PIXEL_CANVAS_AREA_MAX).
 * Stored category is `custom` — no DB migration in stage 5.
 */
export const PIXEL_ASPECT_PRESETS = [
  { id: "wide", width: 480, height: 270 },
  { id: "wideHd", width: 640, height: 360 },
  { id: "tall", width: 270, height: 480 },
  { id: "tallHd", width: 360, height: 640 },
] as const

export const PIXEL_SIZE_PRESETS = [...PIXEL_SQUARE_PRESETS, ...PIXEL_ASPECT_PRESETS] as const
export type PixelSizePresetId = (typeof PIXEL_SIZE_PRESETS)[number]["id"]
export type PixelSquarePresetId = (typeof PIXEL_SQUARE_PRESETS)[number]["id"]
export const PIXEL_DEFAULT_PRESET: PixelSizePresetId = "sprite"

/** User-facing canvas size label, e.g. `16×16`. */
export function formatPixelSize(width: number, height: number) {
  return `${width}×${height}`
}

export function isPixelCanvasDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= PIXEL_CANVAS_MIN && value <= PIXEL_CANVAS_MAX
}

export function isPixelCanvasSize(width: number, height: number) {
  return isPixelCanvasDimension(width) && isPixelCanvasDimension(height) && width * height <= PIXEL_CANVAS_AREA_MAX
}

/** Map canvas size to Explore size category (square presets only; aspect → custom). */
export function pixelSizeCategory(
  width: number,
  height: number,
): PixelSquarePresetId | "custom" {
  const preset = PIXEL_SQUARE_PRESETS.find((item) => item.width === width && item.height === height)
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
/** Legacy single-layer source documents. */
export const PIXEL_SOURCE_VERSION = 1
/** Multi-layer source documents. */
export const PIXEL_SOURCE_VERSION_V2 = 2
/**
 * Multi-layer source with per-layer opacity, blend mode and transparency lock.
 * Pixel storage is unchanged (palette indices). A document is written as V3 only when some
 * layer actually uses one of these; otherwise it stays V2 so older readers keep opening it.
 */
export const PIXEL_SOURCE_VERSION_V3 = 3
/** V3 plus layer groups (`groups` list and `layer.group`). Written only when a group exists. */
export const PIXEL_SOURCE_VERSION_V4 = 4
export const PIXEL_SOURCE_ENCODING = "rle-index" as const
export const PIXEL_LAYER_MAX = 8
/**
 * Max palette entries including Paper at index 0.
 * Indices are Uint8 (0–255); 256 is the hard architectural ceiling without a format change.
 * Older documents with ≤64 colors remain valid.
 */
export const PIXEL_DOCUMENT_PALETTE_MAX = 256
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

export function rgbToHex(rgb: readonly [number, number, number]) {
  const to = (n: number) => n.toString(16).padStart(2, "0").toUpperCase()
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`
}

/** Light alternating canvas ground (view-only; not stored / exported). */
export const PIXEL_CANVAS_CHECKER_A = "#FFFDF7"
export const PIXEL_CANVAS_CHECKER_B = "#F0EBE0"

/**
 * View-only: paint Paper cells as an opaque light checker by cell position.
 * Does not mutate `source`. Export/compositor keep solid Paper.
 */
export function copyRgbaWithCanvasChecker(
  source: Uint8ClampedArray,
  dest: Uint8ClampedArray,
  width: number,
  height: number,
  paperRgb: readonly [number, number, number] = hexToRgb(PIXEL_PAPER),
  lightRgb: readonly [number, number, number] = hexToRgb(PIXEL_CANVAS_CHECKER_A),
  darkRgb: readonly [number, number, number] = hexToRgb(PIXEL_CANVAS_CHECKER_B),
  rect?: PixelRect | null,
) {
  const [pr, pg, pb] = paperRgb
  const paint = (x: number, y: number) => {
    const p = (y * width + x) * 4
    const isPaper = source[p] === pr && source[p + 1] === pg && source[p + 2] === pb
    if (isPaper) {
      const [r, g, b] = (x + y) % 2 === 0 ? lightRgb : darkRgb
      dest[p] = r
      dest[p + 1] = g
      dest[p + 2] = b
      dest[p + 3] = 255
    } else {
      dest[p] = source[p]!
      dest[p + 1] = source[p + 1]!
      dest[p + 2] = source[p + 2]!
      dest[p + 3] = source[p + 3]!
    }
  }
  if (!rect) {
    const cellCount = width * height
    for (let i = 0; i < cellCount; i += 1) paint(i % width, (i / width) | 0)
    return
  }
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(width, rect.x + rect.width)
  const y1 = Math.min(height, rect.y + rect.height)
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) paint(x, y)
  }
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
  clip?: PixelSelection | null,
) {
  if (!inCanvas(x, y, width, height)) return
  if (clip && !pointInSelection(x, y, clip)) return
  const i = (y * width + x) * 4
  pixels[i] = rgb[0]
  pixels[i + 1] = rgb[1]
  pixels[i + 2] = rgb[2]
  pixels[i + 3] = 255
}

export function getPixelRgb(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
): [number, number, number] | null {
  if (!inCanvas(x, y, width, height)) return null
  const i = (y * width + x) * 4
  return [pixels[i], pixels[i + 1], pixels[i + 2]]
}

export function rgbEqual(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

/** Brush stamp (size 1 = single pixel). Square uses Chebyshev; circle uses Euclidean. */
export function stampBrush(
  pixels: Uint8ClampedArray,
  cx: number,
  cy: number,
  rgb: readonly [number, number, number],
  size: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  shape: PixelBrushShape = "circle",
  clip?: PixelSelection | null,
) {
  const brush = Math.max(PIXEL_STROKE_MIN, Math.min(PIXEL_STROKE_MAX, Math.round(size)))
  if (brush === 1) {
    setPixel(pixels, cx, cy, rgb, width, height, clip)
    return
  }
  const r = (brush - 1) / 2
  const r2 = r * r
  const minX = Math.floor(cx - r)
  const maxX = Math.ceil(cx + r)
  const minY = Math.floor(cy - r)
  const maxY = Math.ceil(cy + r)
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx
      const dy = y - cy
      const hit =
        shape === "square"
          ? Math.max(Math.abs(dx), Math.abs(dy)) <= r + 1e-6
          : dx * dx + dy * dy <= r2 + 0.25
      if (hit) setPixel(pixels, x, y, rgb, width, height, clip)
    }
  }
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

export type PointerClientSample = { clientX: number; clientY: number }

/**
 * Prefer browser coalesced pointer samples (in time order). Falls back to the
 * event itself when getCoalescedEvents is missing or empty.
 */
export function listPointerClientSamples(event: {
  clientX: number
  clientY: number
  getCoalescedEvents?: () => Iterable<{ clientX: number; clientY: number }>
}): PointerClientSample[] {
  try {
    const coalesced = event.getCoalescedEvents?.()
    if (coalesced) {
      const samples = Array.from(coalesced, (sample) => ({
        clientX: sample.clientX,
        clientY: sample.clientY,
      }))
      if (samples.length > 0) return samples
    }
  } catch {
    /* ignore unsupported / restricted environments */
  }
  return [{ clientX: event.clientX, clientY: event.clientY }]
}

/** Chord length (cells) above which Catmull-Rom densifies between sparse samples. */
export const STROKE_CURVE_GAP = 3

export function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

/**
 * Waypoints from the end of `trail` toward `to` (does not include the trail tip).
 * Short gaps stay as a single chord (Bresenham later). Large gaps densify with
 * Catmull-Rom using incoming direction — not aggressive smoothing.
 */
export function densifyStrokeSegment(
  trail: readonly PixelPoint[],
  to: PixelPoint,
  gap = STROKE_CURVE_GAP,
): PixelPoint[] {
  const from = trail[trail.length - 1]
  if (!from) return [{ x: to.x, y: to.y }]
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  if (dist <= gap || trail.length < 2) return [{ x: to.x, y: to.y }]
  const p0 = trail[trail.length - 2]!
  const p1 = from
  const p2 = to
  const p3 = to
  const steps = Math.min(32, Math.max(2, Math.ceil(dist)))
  const out: PixelPoint[] = []
  let lastX = from.x
  let lastY = from.y
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const x = Math.round(catmullRom1D(p0.x, p1.x, p2.x, p3.x, t))
    const y = Math.round(catmullRom1D(p0.y, p1.y, p2.y, p3.y, t))
    if (x === lastX && y === lastY) continue
    out.push({ x, y })
    lastX = x
    lastY = y
  }
  const tip = out[out.length - 1]
  if (!tip || tip.x !== to.x || tip.y !== to.y) out.push({ x: to.x, y: to.y })
  return out
}

export function strokeBrushLine(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  size: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  shape: PixelBrushShape = "circle",
  clip?: PixelSelection | null,
) {
  walkLine(x0, y0, x1, y1, (x, y) => stampBrush(pixels, x, y, rgb, size, width, height, shape, clip))
}

function normalizeRect(x0: number, y0: number, x1: number, y1: number) {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  return { left, right, top, bottom }
}

/** Axis-aligned rectangle outline (1 px). */
export function strokeRect(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
) {
  strokeRectBrush(pixels, x0, y0, x1, y1, rgb, 1, width, height, "square")
}

/** Axis-aligned rectangle outline with brush width. */
export function strokeRectBrush(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  size: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  shape: PixelBrushShape = "square",
  clip?: PixelSelection | null,
) {
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  strokeBrushLine(pixels, left, top, right, top, rgb, size, width, height, shape, clip)
  strokeBrushLine(pixels, right, top, right, bottom, rgb, size, width, height, shape, clip)
  strokeBrushLine(pixels, right, bottom, left, bottom, rgb, size, width, height, shape, clip)
  strokeBrushLine(pixels, left, bottom, left, top, rgb, size, width, height, shape, clip)
}

export function fillRect(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  clip?: PixelSelection | null,
) {
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      setPixel(pixels, x, y, rgb, width, height, clip)
    }
  }
}

/** Ellipse via bounding-box test (filled or stroked ring). */
export function paintEllipse(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  filled: boolean,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  strokeWidth = 1,
  clip?: PixelSelection | null,
) {
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  const rw = right - left
  const rh = bottom - top
  if (rw === 0 && rh === 0) {
    stampBrush(pixels, left, top, rgb, filled ? 1 : strokeWidth, width, height, "circle", clip)
    return
  }
  if (rw === 0 || rh === 0) {
    strokeBrushLine(pixels, left, top, right, bottom, rgb, filled ? 1 : strokeWidth, width, height, "circle", clip)
    return
  }
  const rx = rw / 2
  const ry = rh / 2
  const cx = left + rx
  const cy = top + ry
  const rx2 = rx * rx
  const ry2 = ry * ry
  const outer = 1.02
  const stroke = Math.max(PIXEL_STROKE_MIN, Math.round(strokeWidth))
  const shrink = filled ? -1 : Math.max(0.15, 1 - (stroke * 0.85) / Math.max(rx, ry, 1))
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const v = ((x - cx) * (x - cx)) / rx2 + ((y - cy) * (y - cy)) / ry2
      if (filled) {
        if (v <= outer) setPixel(pixels, x, y, rgb, width, height, clip)
      } else if (v <= outer && v >= shrink) {
        setPixel(pixels, x, y, rgb, width, height, clip)
      }
    }
  }
}

/** Inclusive bounds of pixels a fill actually wrote. Seed with maxX/maxY = -1. */
export type FillBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function clampFillTolerance(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(255, Math.round(value)))
}

function withinFillTolerance(
  pixels: Uint8ClampedArray,
  offset: number,
  tr: number,
  tg: number,
  tb: number,
  tolerance: number,
) {
  const dr = pixels[offset] - tr
  const dg = pixels[offset + 1] - tg
  const db = pixels[offset + 2] - tb
  const ar = dr < 0 ? -dr : dr
  const ag = dg < 0 ? -dg : dg
  const ab = db < 0 ? -db : db
  const max = ar > ag ? (ar > ab ? ar : ab) : ag > ab ? ag : ab
  return max <= tolerance
}

function noteFillBounds(bounds: FillBounds | null | undefined, x: number, y: number) {
  if (!bounds) return
  if (bounds.maxX < bounds.minX) {
    bounds.minX = x
    bounds.maxX = x
    bounds.minY = y
    bounds.maxY = y
    return
  }
  if (x < bounds.minX) bounds.minX = x
  else if (x > bounds.maxX) bounds.maxX = x
  if (y < bounds.minY) bounds.minY = y
  else if (y > bounds.maxY) bounds.maxY = y
}

export function fillBoundsRect(bounds: FillBounds): PixelRect | null {
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return null
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1,
  }
}

/**
 * Contiguous 4-connected flood fill.
 * Tolerance 0 matches the target RGB exactly and treats the new color as the visited set.
 * Tolerance > 0 matches the max channel delta and uses an explicit visited bitmap, so a fill
 * color that is still inside the tolerance cannot be re-entered.
 * `bounds`, when passed, receives the inclusive rectangle of painted cells (seed maxX = -1).
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  startX: number,
  startY: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  clip?: PixelSelection | null,
  tolerance = 0,
  bounds?: FillBounds | null,
) {
  if (!inCanvas(startX, startY, width, height)) return 0
  if (clip && !pointInSelection(startX, startY, clip)) return 0
  const s = (startY * width + startX) * 4
  const tr = pixels[s]
  const tg = pixels[s + 1]
  const tb = pixels[s + 2]
  const [r, g, b] = rgb
  const tol = clampFillTolerance(tolerance)
  if (tol === 0 && tr === r && tg === g && tb === b) return 0

  const visited = tol > 0 ? new Uint8Array(width * height) : null
  const matches = (x: number, y: number) => {
    const index = y * width + x
    if (visited && visited[index]) return false
    if (clip && !pointInSelection(x, y, clip)) return false
    const i = index * 4
    if (tol === 0) return pixels[i] === tr && pixels[i + 1] === tg && pixels[i + 2] === tb
    return withinFillTolerance(pixels, i, tr, tg, tb, tol)
  }
  let stack = new Int32Array(1024)
  let top = 0
  const push = (x: number, y: number) => {
    if (top + 2 > stack.length) {
      const grown = new Int32Array(stack.length * 2)
      grown.set(stack)
      stack = grown
    }
    stack[top++] = x
    stack[top++] = y
  }
  let painted = 0
  push(startX, startY)
  while (top > 0) {
    const y = stack[--top]
    let x = stack[--top]
    if (!matches(x, y)) continue
    while (x > 0 && matches(x - 1, y)) x -= 1
    let spanUp = false
    let spanDown = false
    while (x < width && matches(x, y)) {
      const index = y * width + x
      if (visited) visited[index] = 1
      const i = index * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
      noteFillBounds(bounds, x, y)
      painted += 1
      if (y > 0) {
        const up = matches(x, y - 1)
        if (up && !spanUp) push(x, y - 1)
        spanUp = up
      }
      if (y < height - 1) {
        const down = matches(x, y + 1)
        if (down && !spanDown) push(x, y + 1)
        spanDown = down
      }
      x += 1
    }
  }
  return painted
}

/**
 * Replace every pixel within tolerance of the start color. Not contiguous.
 * Still clipped by `clip`. Tolerance is the max channel delta (0 = exact).
 */
export function replaceMatchingColor(
  pixels: Uint8ClampedArray,
  startX: number,
  startY: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  clip?: PixelSelection | null,
  tolerance = 0,
  bounds?: FillBounds | null,
) {
  if (!inCanvas(startX, startY, width, height)) return 0
  if (clip && !pointInSelection(startX, startY, clip)) return 0
  const s = (startY * width + startX) * 4
  const tr = pixels[s]
  const tg = pixels[s + 1]
  const tb = pixels[s + 2]
  const [r, g, b] = rgb
  const tol = clampFillTolerance(tolerance)
  if (tol === 0 && tr === r && tg === g && tb === b) return 0
  const x0 = clip ? Math.max(0, clip.x) : 0
  const y0 = clip ? Math.max(0, clip.y) : 0
  const x1 = clip ? Math.min(width, clip.x + clip.width) : width
  const y1 = clip ? Math.min(height, clip.y + clip.height) : height
  let painted = 0
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (clip && !pointInSelection(x, y, clip)) continue
      const i = (y * width + x) * 4
      const hit =
        tol === 0
          ? pixels[i] === tr && pixels[i + 1] === tg && pixels[i + 2] === tb
          : withinFillTolerance(pixels, i, tr, tg, tb, tol)
      if (!hit) continue
      if (pixels[i] === r && pixels[i + 1] === g && pixels[i + 2] === b) continue
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
      noteFillBounds(bounds, x, y)
      painted += 1
    }
  }
  return painted
}

export function fillPolygon(
  pixels: Uint8ClampedArray,
  points: PixelPoint[],
  rgb: readonly [number, number, number],
  width: number,
  height: number,
  clip?: PixelSelection | null,
) {
  if (points.length < 3) return 0
  let minY = height
  let maxY = -1
  for (const point of points) {
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  minY = Math.max(0, minY)
  maxY = Math.min(height - 1, maxY)
  let painted = 0
  const count = points.length
  for (let y = minY; y <= maxY; y += 1) {
    const xs: number[] = []
    for (let i = 0; i < count; i += 1) {
      const a = points[i]
      const b = points[(i + 1) % count]
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
      }
    }
    xs.sort((left, right) => left - right)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const left = Math.max(0, Math.ceil(xs[i]))
      const right = Math.min(width - 1, Math.floor(xs[i + 1]))
      for (let x = left; x <= right; x += 1) {
        if (clip && !pointInSelection(x, y, clip)) continue
        setPixel(pixels, x, y, rgb, width, height, clip)
        painted += 1
      }
    }
  }
  return painted
}

/** Stroke or fill a polyline / closed polygon with brush width. */
export function rasterizePolygon(
  pixels: Uint8ClampedArray,
  points: PixelPoint[],
  rgb: readonly [number, number, number],
  width: number,
  height: number,
  opts: {
    mode: "stroke" | "fill"
    size?: number
    closed?: boolean
    shape?: PixelBrushShape
    clip?: PixelSelection | null
  },
) {
  if (points.length === 0) return
  const closed = Boolean(opts.closed || opts.mode === "fill")
  const size = opts.size ?? 1
  const shape = opts.shape ?? "circle"
  const clip = opts.clip
  if (opts.mode === "fill") {
    if (points.length >= 3) fillPolygon(pixels, points, rgb, width, height, clip)
    return
  }
  if (points.length === 1) {
    stampBrush(pixels, points[0].x, points[0].y, rgb, size, width, height, shape, clip)
    return
  }
  const count = closed ? points.length : points.length - 1
  for (let i = 0; i < count; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    strokeBrushLine(pixels, a.x, a.y, b.x, b.y, rgb, size, width, height, shape, clip)
  }
}

export function strokeQuadraticBezier(
  pixels: Uint8ClampedArray,
  p0: PixelPoint,
  control: PixelPoint,
  p1: PixelPoint,
  rgb: readonly [number, number, number],
  size: number,
  width: number,
  height: number,
  shape: PixelBrushShape = "circle",
) {
  const span =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(control.x - p0.x, control.y - p0.y)
  const steps = Math.max(8, Math.ceil(span * 2))
  let prev = p0
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const rest = 1 - t
    const x = Math.round(rest * rest * p0.x + 2 * rest * t * control.x + t * t * p1.x)
    const y = Math.round(rest * rest * p0.y + 2 * rest * t * control.y + t * t * p1.y)
    strokeBrushLine(pixels, prev.x, prev.y, x, y, rgb, size, width, height, shape)
    prev = { x, y }
  }
}

export function sampleCubicBezier(
  p0: PixelPoint,
  c1: PixelPoint,
  c2: PixelPoint,
  p1: PixelPoint,
): PixelPoint[] {
  const span =
    Math.hypot(c1.x - p0.x, c1.y - p0.y) +
    Math.hypot(c2.x - c1.x, c2.y - c1.y) +
    Math.hypot(p1.x - c2.x, p1.y - c2.y)
  const steps = Math.max(8, Math.ceil(span * 2))
  const points: PixelPoint[] = [{ x: p0.x, y: p0.y }]
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    const x = Math.round(
      u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    )
    const y = Math.round(
      u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    )
    const last = points[points.length - 1]
    if (!last || last.x !== x || last.y !== y) points.push({ x, y })
  }
  return points
}

export function strokeCubicBezier(
  pixels: Uint8ClampedArray,
  p0: PixelPoint,
  c1: PixelPoint,
  c2: PixelPoint,
  p1: PixelPoint,
  rgb: readonly [number, number, number],
  size: number,
  width: number,
  height: number,
  shape: PixelBrushShape = "circle",
  clip?: PixelSelection | null,
) {
  const samples = sampleCubicBezier(p0, c1, c2, p1)
  for (let i = 1; i < samples.length; i += 1) {
    strokeBrushLine(
      pixels,
      samples[i - 1].x,
      samples[i - 1].y,
      samples[i].x,
      samples[i].y,
      rgb,
      size,
      width,
      height,
      shape,
      clip,
    )
  }
}

export function sampleCubicPath(anchors: BezierAnchor[], closed: boolean): PixelPoint[] {
  if (anchors.length === 0) return []
  if (anchors.length === 1) return [{ x: anchors[0].x, y: anchors[0].y }]
  const out: PixelPoint[] = []
  const count = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < count; i += 1) {
    const a = anchors[i]
    const b = anchors[(i + 1) % anchors.length]
    const samples = sampleCubicBezier(
      { x: a.x, y: a.y },
      { x: a.hoX, y: a.hoY },
      { x: b.hiX, y: b.hiY },
      { x: b.x, y: b.y },
    )
    for (let s = out.length === 0 ? 0 : 1; s < samples.length; s += 1) {
      const point = samples[s]
      const last = out[out.length - 1]
      if (!last || last.x !== point.x || last.y !== point.y) out.push(point)
    }
  }
  return out
}

export function rasterizeCubicPath(
  pixels: Uint8ClampedArray,
  anchors: BezierAnchor[],
  rgb: readonly [number, number, number],
  width: number,
  height: number,
  opts: {
    mode: "stroke" | "fill"
    size?: number
    closed?: boolean
    shape?: PixelBrushShape
    clip?: PixelSelection | null
  },
) {
  if (anchors.length === 0) return
  const closed = Boolean(opts.closed || opts.mode === "fill")
  const size = opts.size ?? 1
  const shape = opts.shape ?? "circle"
  const clip = opts.clip
  if (opts.mode === "fill") {
    const samples = sampleCubicPath(anchors, true)
    if (samples.length >= 3) fillPolygon(pixels, samples, rgb, width, height, clip)
    return
  }
  if (anchors.length === 1) {
    stampBrush(pixels, anchors[0].x, anchors[0].y, rgb, size, width, height, shape, clip)
    return
  }
  const count = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < count; i += 1) {
    const a = anchors[i]
    const b = anchors[(i + 1) % anchors.length]
    strokeCubicBezier(
      pixels,
      { x: a.x, y: a.y },
      { x: a.hoX, y: a.hoY },
      { x: b.hiX, y: b.hiY },
      { x: b.x, y: b.y },
      rgb,
      size,
      width,
      height,
      shape,
      clip,
    )
  }
}

export function createBezierAnchor(x: number, y: number): BezierAnchor {
  return { x, y, hiX: x, hiY: y, hoX: x, hoY: y }
}

export function fillLinearGradient(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: Array<readonly [number, number, number]>,
  width: number,
  height: number,
  rect?: PixelSelection,
) {
  if (stops.length < 1) return
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  const last = stops.length - 1
  const left = rect?.x ?? 0
  const top = rect?.y ?? 0
  const right = rect ? rect.x + rect.width - 1 : width - 1
  const bottom = rect ? rect.y + rect.height - 1 : height - 1
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inCanvas(x, y, width, height)) continue
      if (rect?.mask) {
        const mx = x - left
        const my = y - top
        if (rect.mask[my * rect.width + mx] !== 1) continue
      }
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / len2))
      const rgb = stops[Math.round(t * last)] ?? stops[0]
      setPixel(pixels, x, y, rgb, width, height)
    }
  }
}

export function wrapPixelText(text: string, maxWidth: number): string[] {
  const limit = Math.max(PIXEL_FONT_W, maxWidth)
  const lines: string[] = []
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    if (paragraph.length === 0) {
      lines.push("")
      continue
    }
    let line = ""
    let width = 0
    for (const char of paragraph) {
      const advance = PIXEL_FONT_W + (line ? PIXEL_FONT_TRACK : 0)
      if (line && width + advance > limit) {
        lines.push(line)
        line = char
        width = PIXEL_FONT_W
      } else {
        line += char
        width += advance
      }
    }
    lines.push(line)
  }
  return lines.length > 0 ? lines : [""]
}

export function pixelTextNaturalSize(lines: readonly string[]) {
  let width = 0
  for (const line of lines) {
    if (line.length === 0) continue
    width = Math.max(width, line.length * PIXEL_FONT_W + (line.length - 1) * PIXEL_FONT_TRACK)
  }
  const height =
    lines.length === 0 ? PIXEL_FONT_H : lines.length * PIXEL_FONT_H + (lines.length - 1) * PIXEL_FONT_LEADING
  return { width: Math.max(1, width), height: Math.max(PIXEL_FONT_H, height) }
}

/**
 * Measure a text box that hugs the glyph grid.
 * - Point Text: omit `wrapWidthPx` — no automatic wrapping.
 * - Paragraph Text: pass width in pixels — wrap at that width; height follows content.
 * - `trim` only for commit/paste; keep mid-edit trailing spaces when false.
 */
export function measurePixelTextBox(
  text: string,
  scale = 1,
  wrapWidthPx?: number,
  opts?: { trim?: boolean },
) {
  const raw = text.replace(/\r/g, "")
  const cleaned = opts?.trim === false ? raw : raw.trim()
  const step = Math.max(1, Math.round(scale))
  const wrapAt =
    wrapWidthPx === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(PIXEL_FONT_W, Math.floor(wrapWidthPx / step))
  const lines = wrapPixelText(cleaned.length > 0 ? cleaned : " ", wrapAt)
  const natural = pixelTextNaturalSize(lines)
  return {
    text: cleaned,
    width: Math.max(PIXEL_FONT_W * step, natural.width * step),
    height: Math.max(PIXEL_FONT_H * step, natural.height * step),
  }
}

function paintGlyph(
  plot: (x: number, y: number) => void,
  originX: number,
  originY: number,
  char: string,
) {
  const rows = glyphRows(char)
  for (let row = 0; row < PIXEL_FONT_H; row += 1) {
    const bits = rows[row] ?? 0
    for (let col = 0; col < PIXEL_FONT_W; col += 1) {
      if (bits & (1 << (PIXEL_FONT_W - 1 - col))) plot(originX + col, originY + row)
    }
  }
}

export function stampText(
  pixels: Uint8ClampedArray,
  originX: number,
  originY: number,
  text: string,
  rgb: readonly [number, number, number],
  width: number,
  height: number,
  box?: { width: number; height?: number; scale?: number; wrap?: boolean },
) {
  const source = text.replace(/\r/g, "").trim()
  if (!source) return
  const scale = Math.max(1, Math.round(box?.scale ?? 1))
  const shouldWrap = Boolean(box?.wrap)
  const wrapAt = shouldWrap
    ? Math.max(PIXEL_FONT_W, Math.floor((box?.width ?? width) / scale))
    : Number.POSITIVE_INFINITY
  const lines = wrapPixelText(source, wrapAt)
  // Never clip by box height — Paragraph Text grows with content; Point hugs content.
  const plot = (x: number, y: number) => {
    for (let sy = 0; sy < scale; sy += 1) {
      for (let sx = 0; sx < scale; sx += 1) {
        setPixel(pixels, originX + x * scale + sx, originY + y * scale + sy, rgb, width, height)
      }
    }
  }
  let y = 0
  for (const line of lines) {
    let x = 0
    for (const char of line) {
      paintGlyph(plot, x, y, char)
      x += PIXEL_FONT_W + PIXEL_FONT_TRACK
    }
    y += PIXEL_FONT_H + PIXEL_FONT_LEADING
  }
}

export type SelectionCombineMode = "replace" | "union" | "subtract" | "intersect"

/** Expand a selection into a full-canvas 0/1 mask. */
export function selectionToFullMask(
  selection: PixelSelection,
  width: number,
  height: number,
): Uint8Array {
  const full = new Uint8Array(width * height)
  for (let row = 0; row < selection.height; row += 1) {
    for (let col = 0; col < selection.width; col += 1) {
      const x = selection.x + col
      const y = selection.y + row
      if (!inCanvas(x, y, width, height)) continue
      if (selection.mask && selection.mask[row * selection.width + col] !== 1) continue
      full[y * width + x] = 1
    }
  }
  return full
}

export function combineSelections(
  current: PixelSelection | null,
  next: PixelSelection,
  mode: SelectionCombineMode,
  width: number,
  height: number,
): PixelSelection | null {
  if (!current || mode === "replace") return next
  const a = selectionToFullMask(current, width, height)
  const b = selectionToFullMask(next, width, height)
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i += 1) {
    const left = a[i] === 1
    const right = b[i] === 1
    if (mode === "union") out[i] = left || right ? 1 : 0
    else if (mode === "subtract") out[i] = left && !right ? 1 : 0
    else out[i] = left && right ? 1 : 0
  }
  return compactSelection(out, width, height)
}

export function selectionCombineModeFromModifiers(
  shiftKey: boolean,
  altKey: boolean,
): SelectionCombineMode {
  if (shiftKey && altKey) return "intersect"
  if (altKey) return "subtract"
  if (shiftKey) return "union"
  return "replace"
}

export function compactSelection(full: Uint8Array, width: number, height: number): PixelSelection | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!full[y * width + x]) continue
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX < 0) return null
  const boxW = maxX - minX + 1
  const boxH = maxY - minY + 1
  const mask = new Uint8Array(boxW * boxH)
  let holes = false
  for (let row = 0; row < boxH; row += 1) {
    for (let col = 0; col < boxW; col += 1) {
      const bit = full[(minY + row) * width + (minX + col)]
      mask[row * boxW + col] = bit
      if (!bit) holes = true
    }
  }
  return { x: minX, y: minY, width: boxW, height: boxH, mask: holes ? mask : undefined }
}

function withinTolerance(
  pixels: Uint8ClampedArray,
  i: number,
  tr: number,
  tg: number,
  tb: number,
  tolerance: number,
) {
  return (
    Math.abs(pixels[i]! - tr) <= tolerance &&
    Math.abs(pixels[i + 1]! - tg) <= tolerance &&
    Math.abs(pixels[i + 2]! - tb) <= tolerance
  )
}

/** Contiguous (4-connected) magic wand. Tolerance is the max channel delta, 0-255. */
export function selectionFromFlood(
  pixels: Uint8ClampedArray,
  startX: number,
  startY: number,
  width: number,
  height: number,
  tolerance = 0,
): PixelSelection | null {
  if (!inCanvas(startX, startY, width, height)) return null
  const tol = clampFillTolerance(tolerance)
  const s = (startY * width + startX) * 4
  const tr = pixels[s]!
  const tg = pixels[s + 1]!
  const tb = pixels[s + 2]!
  const full = new Uint8Array(width * height)
  let stack = new Int32Array(1024)
  let top = 0
  const push = (x: number, y: number) => {
    if (top + 2 > stack.length) {
      const grown = new Int32Array(stack.length * 2)
      grown.set(stack)
      stack = grown
    }
    stack[top++] = x
    stack[top++] = y
  }
  push(startX, startY)
  while (top > 0) {
    const y = stack[--top]!
    const x = stack[--top]!
    const index = y * width + x
    if (full[index] || !withinTolerance(pixels, index * 4, tr, tg, tb, tol)) continue
    full[index] = 1
    if (x + 1 < width) push(x + 1, y)
    if (x > 0) push(x - 1, y)
    if (y + 1 < height) push(x, y + 1)
    if (y > 0) push(x, y - 1)
  }
  return compactSelection(full, width, height)
}

/** Every pixel whose colour is within tolerance of the clicked pixel. */
export function selectionFromColor(
  pixels: Uint8ClampedArray,
  startX: number,
  startY: number,
  width: number,
  height: number,
  tolerance = 0,
): PixelSelection | null {
  if (!inCanvas(startX, startY, width, height)) return null
  const tol = clampFillTolerance(tolerance)
  const s = (startY * width + startX) * 4
  const tr = pixels[s]!
  const tg = pixels[s + 1]!
  const tb = pixels[s + 2]!
  const full = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i += 1) {
    if (withinTolerance(pixels, i * 4, tr, tg, tb, tol)) full[i] = 1
  }
  return compactSelection(full, width, height)
}

/**
 * Selection from clicked polygon vertices (cell coordinates).
 *
 * Vertices are cell centres. A cell is selected when its centre lies inside the polygon
 * (even-odd rule, so a self-crossing outline leaves its overlap unselected) or when it
 * lies on an outline edge (Bresenham). That keeps every clicked vertex and every thin
 * sliver selected with no gaps, and the result never depends on zoom. Vertices may lie
 * outside the canvas; the selection is clipped to it. Needs 3 distinct vertices.
 */
export function selectionFromPolygonVertices(
  vertices: readonly PixelPoint[],
  width: number,
  height: number,
): PixelSelection | null {
  const points: PixelPoint[] = []
  for (const v of vertices) {
    const last = points[points.length - 1]
    if (!last || last.x !== v.x || last.y !== v.y) points.push({ x: v.x, y: v.y })
  }
  while (points.length > 1 && points[0]!.x === points[points.length - 1]!.x && points[0]!.y === points[points.length - 1]!.y) {
    points.pop()
  }
  if (points.length < 3) return null
  const full = new Uint8Array(width * height)
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const count = points.length
  for (let y = Math.max(0, minY); y <= Math.min(height - 1, maxY); y += 1) {
    const sy = y + 0.5
    const xs: number[] = []
    for (let i = 0; i < count; i += 1) {
      const a = points[i]!
      const b = points[(i + 1) % count]!
      const ay = a.y + 0.5
      const by = b.y + 0.5
      if (ay <= sy === by <= sy) continue
      xs.push(a.x + 0.5 + ((sy - ay) * (b.x - a.x)) / (by - ay))
    }
    xs.sort((l, r) => l - r)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.ceil(xs[i]! - 0.5))
      const to = Math.min(width - 1, Math.ceil(xs[i + 1]! - 0.5) - 1)
      for (let x = from; x <= to; x += 1) full[y * width + x] = 1
    }
  }
  for (let i = 0; i < count; i += 1) {
    const a = points[i]!
    const b = points[(i + 1) % count]!
    walkLine(a.x, a.y, b.x, b.y, (x, y) => {
      if (inCanvas(x, y, width, height)) full[y * width + x] = 1
    })
  }
  return compactSelection(full, width, height)
}

/** Distance (cells) within which a click on the first vertex closes a polygon. */
export const POLYGON_SELECT_CLOSE_DIST = 1.5

export function selectionFromPolygon(
  points: PixelPoint[],
  width: number,
  height: number,
): PixelSelection | null {
  if (points.length < 3) return null
  const dummy = new Uint8ClampedArray(width * height * 4)
  fillPolygon(dummy, points, [1, 0, 0], width, height)
  const full = new Uint8Array(width * height)
  for (let i = 0; i < full.length; i += 1) {
    if (dummy[i * 4] === 1) full[i] = 1
  }
  return compactSelection(full, width, height)
}

function selectionMask(selection: PixelSelection, width: number, height: number) {
  const full = new Uint8Array(width * height)
  const x0 = Math.max(0, selection.x)
  const y0 = Math.max(0, selection.y)
  const x1 = Math.min(width, selection.x + selection.width)
  const y1 = Math.min(height, selection.y + selection.height)
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (pointInSelection(x, y, selection)) full[y * width + x] = 1
    }
  }
  return full
}

/** Invert the selection. No selection becomes the whole canvas; a full canvas becomes none. */
export function invertSelection(
  selection: PixelSelection | null,
  width: number,
  height: number,
): PixelSelection | null {
  if (width < 1 || height < 1) return null
  if (!selection) return { x: 0, y: 0, width, height }
  const full = selectionMask(selection, width, height)
  for (let i = 0; i < full.length; i += 1) full[i] = full[i] ? 0 : 1
  return compactSelection(full, width, height)
}

/**
 * Grow the selection by `radius` pixels (Chebyshev, so corners grow too).
 * Stops at the canvas edge.
 */
export function expandSelection(
  selection: PixelSelection | null,
  width: number,
  height: number,
  radius = 1,
): PixelSelection | null {
  if (!selection) return null
  const r = Math.max(0, Math.round(radius))
  if (r === 0) return selection
  const full = selectionMask(selection, width, height)
  const next = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!full[y * width + x]) continue
      const y0 = Math.max(0, y - r)
      const y1 = Math.min(height - 1, y + r)
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(width - 1, x + r)
      for (let yy = y0; yy <= y1; yy += 1) {
        next.fill(1, yy * width + x0, yy * width + x1 + 1)
      }
    }
  }
  return compactSelection(next, width, height)
}

/** Shrink the selection by `radius` pixels. A pixel stays only when its whole neighborhood is selected. */
export function contractSelection(
  selection: PixelSelection | null,
  width: number,
  height: number,
  radius = 1,
): PixelSelection | null {
  if (!selection) return null
  const r = Math.max(0, Math.round(radius))
  if (r === 0) return selection
  const full = selectionMask(selection, width, height)
  const next = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!full[y * width + x]) continue
      let keep = true
      for (let yy = y - r; yy <= y + r && keep; yy += 1) {
        if (yy < 0 || yy >= height) {
          keep = false
          break
        }
        for (let xx = x - r; xx <= x + r; xx += 1) {
          if (xx < 0 || xx >= width || !full[yy * width + xx]) {
            keep = false
            break
          }
        }
      }
      if (keep) next[y * width + x] = 1
    }
  }
  return compactSelection(next, width, height)
}

/**
 * Elliptical marquee inside the drag box. Matches the filled-ellipse cover test (v <= 1.02)
 * so the selection and the ellipse tool agree. A flat box is a plain rectangle.
 */
export function selectionFromEllipse(x0: number, y0: number, x1: number, y1: number): PixelSelection {
  const rect = normalizePixelRect(x0, y0, x1, y1)
  if (rect.width <= 1 || rect.height <= 1) return rect
  const rx = (rect.width - 1) / 2
  const ry = (rect.height - 1) / 2
  const cx = rect.x + rx
  const cy = rect.y + ry
  const rx2 = rx * rx
  const ry2 = ry * ry
  const mask = new Uint8Array(rect.width * rect.height)
  let holes = false
  let any = false
  for (let row = 0; row < rect.height; row += 1) {
    for (let col = 0; col < rect.width; col += 1) {
      const px = rect.x + col
      const py = rect.y + row
      const v = ((px - cx) * (px - cx)) / rx2 + ((py - cy) * (py - cy)) / ry2
      if (v <= 1.02) {
        mask[row * rect.width + col] = 1
        any = true
      } else holes = true
    }
  }
  if (!any || !holes) return rect
  return { ...rect, mask }
}

/** Constrain shape end so width === height (square / circle bounds). */
export function constrainSquareEnd(x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0
  const dy = y1 - y0
  const side = Math.max(Math.abs(dx), Math.abs(dy))
  return {
    x: x0 + (dx < 0 ? -side : side),
    y: y0 + (dy < 0 ? -side : side),
  }
}

export function normalizePixelRect(x0: number, y0: number, x1: number, y1: number): PixelRect {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

export function pointInPixelRect(x: number, y: number, rect: PixelRect) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height
}

export function pointInSelection(x: number, y: number, selection: PixelSelection) {
  if (!pointInPixelRect(x, y, selection)) return false
  if (!selection.mask) return true
  const col = x - selection.x
  const row = y - selection.y
  return selection.mask[row * selection.width + col] === 1
}

/** Nearest-neighbor scale of clipboard pixels (+ mask). */
export function scaleClipboard(
  clip: PixelClipboard,
  nextWidth: number,
  nextHeight: number,
): PixelClipboard {
  const width = Math.max(1, Math.round(nextWidth))
  const height = Math.max(1, Math.round(nextHeight))
  if (width === clip.width && height === clip.height) {
    return {
      width,
      height,
      data: new Uint8ClampedArray(clip.data),
      mask: clip.mask ? new Uint8Array(clip.mask) : undefined,
    }
  }
  const data = new Uint8ClampedArray(width * height * 4)
  const mask = clip.mask ? new Uint8Array(width * height) : undefined
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(clip.height - 1, Math.floor(((y + 0.5) * clip.height) / height))
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(clip.width - 1, Math.floor(((x + 0.5) * clip.width) / width))
      const src = (sy * clip.width + sx) * 4
      const dst = (y * width + x) * 4
      data[dst] = clip.data[src]
      data[dst + 1] = clip.data[src + 1]
      data[dst + 2] = clip.data[src + 2]
      data[dst + 3] = clip.data[src + 3]
      if (mask && clip.mask) mask[y * width + x] = clip.mask[sy * clip.width + sx]
    }
  }
  return { width, height, data, mask }
}

export function extractRect(
  pixels: Uint8ClampedArray,
  rect: PixelSelection,
  canvasWidth: number,
  canvasHeight: number,
): PixelClipboard {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4)
  for (let row = 0; row < rect.height; row += 1) {
    for (let col = 0; col < rect.width; col += 1) {
      const sx = rect.x + col
      const sy = rect.y + row
      const dst = (row * rect.width + col) * 4
      if (!inCanvas(sx, sy, canvasWidth, canvasHeight)) {
        const [r, g, b] = hexToRgb(PIXEL_PAPER)
        data[dst] = r
        data[dst + 1] = g
        data[dst + 2] = b
        data[dst + 3] = 255
        continue
      }
      const src = (sy * canvasWidth + sx) * 4
      data[dst] = pixels[src]
      data[dst + 1] = pixels[src + 1]
      data[dst + 2] = pixels[src + 2]
      data[dst + 3] = 255
    }
  }
  return {
    width: rect.width,
    height: rect.height,
    data,
    mask: rect.mask ? new Uint8Array(rect.mask) : undefined,
  }
}

export function blitRect(
  pixels: Uint8ClampedArray,
  clip: PixelClipboard,
  destX: number,
  destY: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  for (let row = 0; row < clip.height; row += 1) {
    for (let col = 0; col < clip.width; col += 1) {
      if (clip.mask && clip.mask[row * clip.width + col] !== 1) continue
      const x = destX + col
      const y = destY + row
      if (!inCanvas(x, y, canvasWidth, canvasHeight)) continue
      const src = (row * clip.width + col) * 4
      const dst = (y * canvasWidth + x) * 4
      pixels[dst] = clip.data[src]
      pixels[dst + 1] = clip.data[src + 1]
      pixels[dst + 2] = clip.data[src + 2]
      pixels[dst + 3] = 255
    }
  }
}

/** Copy indexed pixels into a layer (0 stays 0 / transparent on upper layers). */
export function blitIndicesIntoLayer(
  dest: Uint8Array,
  src: Uint8Array,
  srcW: number,
  srcH: number,
  destX: number,
  destY: number,
  canvasW: number,
  canvasH: number,
) {
  for (let row = 0; row < srcH; row += 1) {
    for (let col = 0; col < srcW; col += 1) {
      const x = destX + col
      const y = destY + row
      if (!inCanvas(x, y, canvasW, canvasH)) continue
      const index = src[row * srcW + col] ?? 0
      if (index === 0) continue
      dest[y * canvasW + x] = index
    }
  }
}

export function clearRectToPaper(
  pixels: Uint8ClampedArray,
  rect: PixelSelection,
  canvasWidth: number,
  canvasHeight: number,
) {
  const rgb = hexToRgb(PIXEL_PAPER)
  if (!rect.mask) {
    fillRect(
      pixels,
      rect.x,
      rect.y,
      rect.x + rect.width - 1,
      rect.y + rect.height - 1,
      rgb,
      canvasWidth,
      canvasHeight,
    )
    return
  }
  for (let row = 0; row < rect.height; row += 1) {
    for (let col = 0; col < rect.width; col += 1) {
      if (rect.mask[row * rect.width + col] !== 1) continue
      setPixel(pixels, rect.x + col, rect.y + row, rgb, canvasWidth, canvasHeight)
    }
  }
}

export function clearCanvasToPaper(pixels: Uint8ClampedArray) {
  fillPaper(pixels)
}

function swapClipCells(clip: PixelClipboard, aIndex: number, bIndex: number) {
  const a = aIndex * 4
  const b = bIndex * 4
  for (let k = 0; k < 4; k += 1) {
    const tmp = clip.data[a + k]
    clip.data[a + k] = clip.data[b + k]
    clip.data[b + k] = tmp
  }
  if (clip.mask) {
    const bit = clip.mask[aIndex]
    clip.mask[aIndex] = clip.mask[bIndex]
    clip.mask[bIndex] = bit
  }
}

export function flipRectHorizontal(
  pixels: Uint8ClampedArray,
  rect: PixelSelection,
  canvasWidth: number,
  canvasHeight: number,
) {
  const clip = extractRect(pixels, rect, canvasWidth, canvasHeight)
  clearRectToPaper(pixels, rect, canvasWidth, canvasHeight)
  for (let row = 0; row < clip.height; row += 1) {
    for (let col = 0; col < Math.floor(clip.width / 2); col += 1) {
      swapClipCells(clip, row * clip.width + col, row * clip.width + (clip.width - 1 - col))
    }
  }
  blitRect(pixels, clip, rect.x, rect.y, canvasWidth, canvasHeight)
}

export function flipRectVertical(
  pixels: Uint8ClampedArray,
  rect: PixelSelection,
  canvasWidth: number,
  canvasHeight: number,
) {
  const clip = extractRect(pixels, rect, canvasWidth, canvasHeight)
  clearRectToPaper(pixels, rect, canvasWidth, canvasHeight)
  for (let row = 0; row < Math.floor(clip.height / 2); row += 1) {
    for (let col = 0; col < clip.width; col += 1) {
      swapClipCells(clip, row * clip.width + col, (clip.height - 1 - row) * clip.width + col)
    }
  }
  blitRect(pixels, clip, rect.x, rect.y, canvasWidth, canvasHeight)
}

/**
 * Nearest-neighbor rotate of a clipboard around its bbox center.
 * Destination expands to fit; pixels outside the source sample are paper (mask 0).
 */
export function rotateClipboardNearest(clip: PixelClipboard, degrees: number): PixelClipboard {
  let angle = degrees % 360
  if (angle < 0) angle += 360
  if (Math.abs(angle) < 1e-9 || Math.abs(angle - 360) < 1e-9) {
    return {
      width: clip.width,
      height: clip.height,
      data: new Uint8ClampedArray(clip.data),
      mask: clip.mask ? new Uint8Array(clip.mask) : undefined,
    }
  }

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const srcCx = (clip.width - 1) / 2
  const srcCy = (clip.height - 1) / 2

  const corners = [
    { x: 0, y: 0 },
    { x: clip.width - 1, y: 0 },
    { x: 0, y: clip.height - 1 },
    { x: clip.width - 1, y: clip.height - 1 },
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const corner of corners) {
    const dx = corner.x - srcCx
    const dy = corner.y - srcCy
    const rx = dx * cos - dy * sin
    const ry = dx * sin + dy * cos
    minX = Math.min(minX, rx)
    minY = Math.min(minY, ry)
    maxX = Math.max(maxX, rx)
    maxY = Math.max(maxY, ry)
  }
  const outW = Math.max(1, Math.ceil(maxX - minX + 1))
  const outH = Math.max(1, Math.ceil(maxY - minY + 1))
  const dstCx = (outW - 1) / 2
  const dstCy = (outH - 1) / 2
  const [pr, pg, pb] = hexToRgb(PIXEL_PAPER)
  const out: PixelClipboard = {
    width: outW,
    height: outH,
    data: new Uint8ClampedArray(outW * outH * 4),
    mask: clip.mask ? new Uint8Array(outW * outH) : undefined,
  }
  for (let i = 0; i < outW * outH; i += 1) {
    const p = i * 4
    out.data[p] = pr
    out.data[p + 1] = pg
    out.data[p + 2] = pb
    out.data[p + 3] = 255
  }

  const invCos = cos
  const invSin = -sin
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const dx = x - dstCx
      const dy = y - dstCy
      const sx = Math.round(dx * invCos - dy * invSin + srcCx)
      const sy = Math.round(dx * invSin + dy * invCos + srcCy)
      const di = y * outW + x
      const dp = di * 4
      if (sx < 0 || sy < 0 || sx >= clip.width || sy >= clip.height) {
        if (out.mask) out.mask[di] = 0
        continue
      }
      const si = sy * clip.width + sx
      if (clip.mask && clip.mask[si] !== 1) {
        if (out.mask) out.mask[di] = 0
        continue
      }
      const sp = si * 4
      out.data[dp] = clip.data[sp]!
      out.data[dp + 1] = clip.data[sp + 1]!
      out.data[dp + 2] = clip.data[sp + 2]!
      out.data[dp + 3] = 255
      if (out.mask) out.mask[di] = 1
    }
  }
  return out
}

/** Clockwise 90°. Returns new rect origin/size (width/height swapped). Clipped when blitting. */
export function rotateRect90Cw(
  pixels: Uint8ClampedArray,
  rect: PixelSelection,
  canvasWidth: number,
  canvasHeight: number,
): PixelSelection {
  const src = extractRect(pixels, rect, canvasWidth, canvasHeight)
  clearRectToPaper(pixels, rect, canvasWidth, canvasHeight)
  const rotated: PixelClipboard = {
    width: src.height,
    height: src.width,
    data: new Uint8ClampedArray(src.width * src.height * 4),
    mask: src.mask ? new Uint8Array(src.width * src.height) : undefined,
  }
  for (let row = 0; row < src.height; row += 1) {
    for (let col = 0; col < src.width; col += 1) {
      const s = (row * src.width + col) * 4
      const dx = src.height - 1 - row
      const dy = col
      const d = (dy * rotated.width + dx) * 4
      rotated.data[d] = src.data[s]
      rotated.data[d + 1] = src.data[s + 1]
      rotated.data[d + 2] = src.data[s + 2]
      rotated.data[d + 3] = 255
      if (src.mask && rotated.mask) {
        rotated.mask[dy * rotated.width + dx] = src.mask[row * src.width + col]
      }
    }
  }
  blitRect(pixels, rotated, rect.x, rect.y, canvasWidth, canvasHeight)
  return {
    x: rect.x,
    y: rect.y,
    width: rotated.width,
    height: rotated.height,
    mask: rotated.mask,
  }
}

export function flipCanvasHorizontal(pixels: Uint8ClampedArray, canvasWidth: number, canvasHeight: number) {
  flipRectHorizontal(pixels, { x: 0, y: 0, width: canvasWidth, height: canvasHeight }, canvasWidth, canvasHeight)
}

export function flipCanvasVertical(pixels: Uint8ClampedArray, canvasWidth: number, canvasHeight: number) {
  flipRectVertical(pixels, { x: 0, y: 0, width: canvasWidth, height: canvasHeight }, canvasWidth, canvasHeight)
}

/** Full-canvas 90° CW — only valid when width === height (document size is fixed). */
export function rotateCanvas90Cw(pixels: Uint8ClampedArray, size: number) {
  rotateRect90Cw(pixels, { x: 0, y: 0, width: size, height: size }, size, size)
}

export function symmetryPoints(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: PixelSymmetry,
): Array<{ x: number; y: number }> {
  if (mode === "off") return [{ x, y }]
  const mx = canvasWidth - 1 - x
  const my = canvasHeight - 1 - y
  const key = (px: number, py: number) => `${px},${py}`
  const seen = new Set<string>()
  const out: Array<{ x: number; y: number }> = []
  const add = (px: number, py: number) => {
    if (!inCanvas(px, py, canvasWidth, canvasHeight)) return
    const id = key(px, py)
    if (seen.has(id)) return
    seen.add(id)
    out.push({ x: px, y: py })
  }
  add(x, y)
  if (mode === "x" || mode === "xy") add(mx, y)
  if (mode === "y" || mode === "xy") add(x, my)
  if (mode === "xy") add(mx, my)
  return out
}

export function strokeBrushLineSymmetric(
  pixels: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  size: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: PixelSymmetry,
  shape: PixelBrushShape = "circle",
  clip?: PixelSelection | null,
) {
  walkLine(x0, y0, x1, y1, (x, y) => {
    for (const point of symmetryPoints(x, y, canvasWidth, canvasHeight, mode)) {
      stampBrush(pixels, point.x, point.y, rgb, size, canvasWidth, canvasHeight, shape, clip)
    }
  })
}

export function replaceRgbInPixels(
  pixels: Uint8ClampedArray,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  rect?: PixelSelection | PixelRect | null,
  canvasWidth = PIXEL_CANVAS_SIZE,
  canvasHeight = PIXEL_CANVAS_SIZE,
) {
  const left = rect?.x ?? 0
  const top = rect?.y ?? 0
  const right = rect ? rect.x + rect.width - 1 : canvasWidth - 1
  const bottom = rect ? rect.y + rect.height - 1 : canvasHeight - 1
  const mask = rect && "mask" in rect ? rect.mask : undefined
  let count = 0
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inCanvas(x, y, canvasWidth, canvasHeight)) continue
      if (mask) {
        const mx = x - left
        const my = y - top
        if (mask[my * rect!.width + mx] !== 1) continue
      }
      const i = (y * canvasWidth + x) * 4
      if (pixels[i] === from[0] && pixels[i + 1] === from[1] && pixels[i + 2] === from[2]) {
        pixels[i] = to[0]
        pixels[i + 1] = to[1]
        pixels[i + 2] = to[2]
        pixels[i + 3] = 255
        count += 1
      }
    }
  }
  return count
}

/**
 * Remove a document color (not Paper): paint matching pixels to Paper and drop swatch from palette.
 * Caller should clear undo history because index snapshots may be stale.
 */
export function removeDocumentColor(
  pixels: Uint8ClampedArray,
  palette: readonly string[],
  hexToRemove: string,
  canvasWidth: number,
  canvasHeight: number,
): { palette: string[]; replaced: number } | { error: "paper" | "missing" } {
  const normalized = normalizePixelHex(hexToRemove)
  if (!normalized) return { error: "missing" }
  if (normalized === PIXEL_PAPER) return { error: "paper" }
  const index = paletteIndexOf(palette, normalized)
  if (index < 1) return { error: "missing" }
  const from = hexToRgb(normalized)
  const replaced = replaceRgbInPixels(
    pixels,
    from,
    hexToRgb(PIXEL_PAPER),
    undefined,
    canvasWidth,
    canvasHeight,
  )
  const next = palette.filter((_, i) => i !== index).map((color) => normalizePixelHex(color) ?? PIXEL_PAPER)
  if (next[0] !== PIXEL_PAPER) next[0] = PIXEL_PAPER
  return { palette: next, replaced }
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

/**
 * Device-pixel transform used by the view canvas draw path.
 * Must stay identical to PixelBoard `draw()` setTransform inputs.
 */
export function viewDeviceTransform(originX: number, originY: number, scale: number, dpr = 1) {
  const ratio = Math.max(1e-6, dpr)
  // Match snapCssScaleToDevicePixels (floor) so draw + hit-test share one integer cell size.
  return {
    deviceScale: Math.max(1, Math.floor(scale * ratio + 1e-9)),
    translateX: Math.round(originX * ratio),
    translateY: Math.round(originY * ratio),
  }
}

/**
 * Map a pointer into artwork cells using the same space as the view buffer.
 *
 * Important on mobile: CSS size from getBoundingClientRect and the canvas
 * backing store can disagree with `devicePixelRatio` (fractional DPR, browser
 * zoom, subpixel layout). Mapping through buffer pixels avoids that drift.
 */
export function pointerToCell(args: {
  clientX: number
  clientY: number
  rectLeft: number
  rectTop: number
  rectWidth: number
  rectHeight: number
  bufferWidth: number
  bufferHeight: number
  originX: number
  originY: number
  scale: number
  dpr?: number
}) {
  if (args.rectWidth <= 0 || args.rectHeight <= 0 || args.bufferWidth <= 0 || args.bufferHeight <= 0) {
    return { x: -1, y: -1 }
  }
  const dpr = args.dpr ?? 1
  const bufferX = ((args.clientX - args.rectLeft) / args.rectWidth) * args.bufferWidth
  const bufferY = ((args.clientY - args.rectTop) / args.rectHeight) * args.bufferHeight
  const { deviceScale, translateX, translateY } = viewDeviceTransform(
    args.originX,
    args.originY,
    args.scale,
    dpr,
  )
  return {
    x: Math.floor((bufferX - translateX) / deviceScale),
    y: Math.floor((bufferY - translateY) / deviceScale),
  }
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

/**
 * Snap CSS scale so device pixels per artwork cell are an integer ≥ 1.
 * Keeps hit-testing in CSS space: returned value is deviceScale / dpr.
 */
export function snapCssScaleToDevicePixels(cssScale: number, dpr = 1): number {
  const ratio = Math.max(1e-6, dpr)
  const device = Math.max(1, Math.floor(cssScale * ratio))
  return device / ratio
}

export function snapOriginToDevicePixels(originX: number, originY: number, dpr = 1) {
  const ratio = Math.max(1e-6, dpr)
  return {
    originX: Math.round(originX * ratio) / ratio,
    originY: Math.round(originY * ratio) / ratio,
  }
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
  dpr = 1,
) {
  const raw =
    zoom === "fit" ? fitScale(viewWidth, viewHeight, canvasWidth, canvasHeight) : zoom
  return snapCssScaleToDevicePixels(raw, dpr)
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

/** Pack RGB into a single key for O(1) palette lookup. */
export function rgb24Key(r: number, g: number, b: number) {
  return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)
}

/** First-wins map from packed RGB → palette index. Rebuild when palette changes. */
export function buildPaletteRgbIndex(palette: readonly string[]): Map<number, number> {
  const map = new Map<number, number>()
  for (let i = 0; i < palette.length; i += 1) {
    const [r, g, b] = hexToRgb(palette[i] ?? PIXEL_PAPER)
    const key = rgb24Key(r, g, b)
    if (!map.has(key)) map.set(key, i)
  }
  return map
}

export function rgbToPaletteIndex(
  r: number,
  g: number,
  b: number,
  palette: readonly string[] = PIXEL_PALETTE,
  indexMap?: Map<number, number>,
) {
  const map = indexMap ?? buildPaletteRgbIndex(palette)
  return map.get(rgb24Key(r, g, b)) ?? 0
}

export function rgbaToIndices(
  pixels: Uint8ClampedArray,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
  palette: readonly string[] = PIXEL_PALETTE,
  indexMap?: Map<number, number>,
) {
  const count = width * height
  const out = new Uint8Array(count)
  const limit = Math.min(count, Math.floor(pixels.length / 4))
  const map = indexMap ?? buildPaletteRgbIndex(palette)
  for (let i = 0; i < limit; i += 1) {
    const p = i * 4
    out[i] = map.get(rgb24Key(pixels[p]!, pixels[p + 1]!, pixels[p + 2]!)) ?? 0
  }
  return out
}

/** Write one rectangle of RGBA back into an existing index buffer. */
export function writeRgbaRectToIndices(
  pixels: Uint8ClampedArray,
  indices: Uint8Array,
  width: number,
  height: number,
  rect: PixelRect,
  palette: readonly string[] = PIXEL_PALETTE,
  indexMap?: Map<number, number>,
) {
  const map = indexMap ?? buildPaletteRgbIndex(palette)
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(width, rect.x + rect.width)
  const y1 = Math.min(height, rect.y + rect.height)
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = y * width + x
      const p = i * 4
      indices[i] = map.get(rgb24Key(pixels[p]!, pixels[p + 1]!, pixels[p + 2]!)) ?? 0
    }
  }
}

export type IndexRectSnapshot = {
  x0: number
  y0: number
  x1: number
  y1: number
  data: Uint8Array
}

/** Copy of one rectangle of a layer, taken before an edit so the transparency lock can compare. */
export function snapshotIndicesRect(
  indices: Uint8Array,
  width: number,
  height: number,
  rect?: PixelRect | null,
): IndexRectSnapshot {
  const x0 = rect ? Math.max(0, rect.x) : 0
  const y0 = rect ? Math.max(0, rect.y) : 0
  const x1 = rect ? Math.min(width, rect.x + rect.width) : width
  const y1 = rect ? Math.min(height, rect.y + rect.height) : height
  const w = Math.max(0, x1 - x0)
  const h = Math.max(0, y1 - y0)
  const data = new Uint8Array(w * h)
  for (let y = 0; y < h; y += 1) {
    const from = (y0 + y) * width + x0
    data.set(indices.subarray(from, from + w), y * w)
  }
  return { x0, y0, x1, y1, data }
}

/**
 * Transparency lock: after an edit, put back whatever changed *which cells are painted*.
 * A cell that was empty stays empty (nothing can be painted there); a painted cell cannot be
 * erased. Recolouring painted cells is allowed. Returns true if anything was reverted.
 */
export function applyAlphaLock(
  indices: Uint8Array,
  before: IndexRectSnapshot,
  width: number,
): boolean {
  const w = before.x1 - before.x0
  let reverted = false
  for (let y = before.y0; y < before.y1; y += 1) {
    for (let x = before.x0; x < before.x1; x += 1) {
      const old = before.data[(y - before.y0) * w + (x - before.x0)]!
      const i = y * width + x
      const now = indices[i]!
      if (old === 0 ? now !== 0 : now === 0) {
        indices[i] = old
        reverted = true
      }
    }
  }
  return reverted
}

/** Refresh one rectangle of an RGBA buffer from layer indices. */
export function writeIndicesRectToRgba(
  indices: Uint8Array,
  pixels: Uint8ClampedArray,
  width: number,
  rect: IndexRectSnapshot,
  palette: readonly string[],
) {
  for (let y = rect.y0; y < rect.y1; y += 1) {
    for (let x = rect.x0; x < rect.x1; x += 1) {
      const i = y * width + x
      const [r, g, b] = hexToRgb(palette[indices[i]!] ?? PIXEL_PAPER)
      const p = i * 4
      pixels[p] = r
      pixels[p + 1] = g
      pixels[p + 2] = b
      pixels[p + 3] = 255
    }
  }
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

export type PixelLayerV2 = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  runs: number[]
}

export type PixelSourceV2 = {
  version: typeof PIXEL_SOURCE_VERSION_V2
  width: number
  height: number
  palette: string[]
  encoding: typeof PIXEL_SOURCE_ENCODING
  layers: PixelLayerV2[]
}

export type PixelLayerV3 = PixelLayerV2 & {
  /** 0-100, default 100. */
  opacity: number
  /** Default "normal". */
  blend: PixelBlendMode
  /** Painting cannot change which cells are transparent. Default false. */
  lockAlpha: boolean
}

export type PixelSourceV3 = {
  version: typeof PIXEL_SOURCE_VERSION_V3
  width: number
  height: number
  palette: string[]
  encoding: typeof PIXEL_SOURCE_ENCODING
  layers: PixelLayerV3[]
}

export type PixelGroupV4 = {
  id: string
  name: string
  visible: boolean
  opacity: number
  blend: PixelBlendMode
  collapsed: boolean
}

export type PixelLayerV4 = PixelLayerV3 & { group: string | null }

export type PixelSourceV4 = {
  version: typeof PIXEL_SOURCE_VERSION_V4
  width: number
  height: number
  palette: string[]
  encoding: typeof PIXEL_SOURCE_ENCODING
  layers: PixelLayerV4[]
  groups: PixelGroupV4[]
}

export type PixelSource = PixelSourceV1 | PixelSourceV2 | PixelSourceV3 | PixelSourceV4

export type PixelLayerRuntime = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  indices: Uint8Array
  /** 0-100. Missing means 100. */
  opacity?: number
  /** Missing means "normal". */
  blend?: PixelBlendMode
  /** Missing means false. */
  lockAlpha?: boolean
  /** Id of the group this layer belongs to; missing or null means ungrouped. */
  group?: string | null
}

export function layerOpacity(layer: Pick<PixelLayerRuntime, "opacity">) {
  return clampLayerOpacity(layer.opacity ?? PIXEL_OPACITY_MAX)
}

export function layerBlend(layer: Pick<PixelLayerRuntime, "blend">): PixelBlendMode {
  return layer.blend ?? "normal"
}

/** True when the layer uses any V3 feature. */
export function layerUsesV3(layer: PixelLayerRuntime) {
  return !isPlainBlend(layerOpacity(layer), layerBlend(layer)) || Boolean(layer.lockAlpha)
}

export function layersNeedV3(layers: readonly PixelLayerRuntime[]) {
  return layers.some(layerUsesV3)
}

export type PixelSourceError =
  | "unsupported_version"
  | "invalid_source"
  | "payload_too_large"
  | "integrity"

export type ParsedPixelSource = {
  ok: true
  data: PixelSource
  /** Flattened composite indices (paper where empty). */
  indices: Uint8Array
  layers: PixelLayerRuntime[]
  /** Layer groups (empty before V4). */
  groups: PixelGroupRuntime[]
}

function parseSharedPalette(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > PIXEL_DOCUMENT_PALETTE_MAX) return null
  const palette: string[] = []
  for (const color of value) {
    if (typeof color !== "string") return null
    const hex = normalizePixelHex(color)
    if (!hex) return null
    palette.push(hex)
  }
  if (palette[0] !== PIXEL_PAPER) return null
  return palette
}

export function createLayerId() {
  return `layer_${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyLayer(
  width: number,
  height: number,
  name = "Layer 1",
): PixelLayerRuntime {
  return {
    id: createLayerId(),
    name,
    visible: true,
    locked: false,
    indices: emptyPixelIndices(width, height),
  }
}

function paletteLut(palette: readonly string[]) {
  const [paperR, paperG, paperB] = hexToRgb(PIXEL_PAPER)
  const lut = new Uint8Array(palette.length * 3)
  for (let c = 0; c < palette.length; c += 1) {
    const [r, g, b] = hexToRgb(palette[c] ?? PIXEL_PAPER)
    lut[c * 3] = r
    lut[c * 3 + 1] = g
    lut[c * 3 + 2] = b
  }
  return { lut, paperR, paperG, paperB }
}

function writeCompositeCell(
  pixels: Uint8ClampedArray,
  p: number,
  index: number,
  paletteLength: number,
  lut: Uint8Array,
  paperR: number,
  paperG: number,
  paperB: number,
) {
  if (index < paletteLength) {
    const l = index * 3
    pixels[p] = lut[l]
    pixels[p + 1] = lut[l + 1]
    pixels[p + 2] = lut[l + 2]
  } else {
    pixels[p] = paperR
    pixels[p + 1] = paperG
    pixels[p + 2] = paperB
  }
  pixels[p + 3] = 255
}

/**
 * Composite layers bottom→top into RGBA.
 * Bottom layer: index 0 = paper. Upper layers: index 0 = transparent.
 * `rect` recomposites only that region and leaves every other cell untouched.
 */
let groupScratch = new Float32Array(0)

export function compositeLayersToRgba(
  layers: readonly PixelLayerRuntime[],
  pixels: Uint8ClampedArray,
  palette: readonly string[],
  width: number,
  height: number,
  rect?: PixelRect | null,
  groups: readonly PixelGroupRuntime[] = [],
) {
  const { lut, paperR, paperG, paperB } = paletteLut(palette)
  let x0 = 0
  let y0 = 0
  let x1 = width
  let y1 = height
  if (rect) {
    x0 = Math.max(0, rect.x)
    y0 = Math.max(0, rect.y)
    x1 = Math.min(width, rect.x + rect.width)
    y1 = Math.min(height, rect.y + rect.height)
    if (x1 <= x0 || y1 <= y0) return
  }
  const full = x0 === 0 && y0 === 0 && x1 === width && y1 === height
  if (full) {
    fillPaper(pixels)
  } else {
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const p = (y * width + x) * 4
        pixels[p] = paperR
        pixels[p + 1] = paperG
        pixels[p + 2] = paperB
        pixels[p + 3] = 255
      }
    }
  }

  const drawLayer = (layerIndex: number) => {
    const layer = layers[layerIndex]!
    if (!layer.visible) return
    const opacity = layerOpacity(layer)
    if (opacity === 0) return
    const mode = layerBlend(layer)
    const plain = isPlainBlend(opacity, mode)
    const transparentZero = layerIndex > 0
    const indices = layer.indices
    for (let y = y0; y < y1; y += 1) {
      const row = y * width
      for (let x = x0; x < x1; x += 1) {
        const i = row + x
        const index = indices[i] ?? 0
        if (transparentZero && index === 0) continue
        const p = i * 4
        if (plain) {
          writeCompositeCell(pixels, p, index, palette.length, lut, paperR, paperG, paperB)
        } else if (index < palette.length) {
          const l = index * 3
          blendOverPixel(pixels, p, lut[l]!, lut[l + 1]!, lut[l + 2]!, opacity, mode)
        } else {
          blendOverPixel(pixels, p, paperR, paperG, paperB, opacity, mode)
        }
      }
    }
  }

  /**
   * A group composites in isolation into an RGB + alpha buffer (alpha 0 = nothing painted),
   * then lands on the backdrop with the group's opacity and blend mode. Alpha is not binary here
   * because a member at 50% over an empty area is half transparent.
   */
  const drawGroup = (group: PixelGroupRuntime, start: number, end: number) => {
    if (!group.visible || group.opacity <= 0) return
    const groupPlain = isPlainBlend(group.opacity, group.blend)
    let allPlain = groupPlain
    for (let i = start; i <= end && allPlain; i += 1) {
      const layer = layers[i]!
      if (layer.visible && !isPlainBlend(layerOpacity(layer), layerBlend(layer))) allPlain = false
    }
    if (allPlain) {
      // Normal 100% group of plain layers is indistinguishable from the flat stack.
      for (let i = start; i <= end; i += 1) drawLayer(i)
      return
    }
    const rw = x1 - x0
    const rh = y1 - y0
    const cells = rw * rh
    if (groupScratch.length < cells * 4) groupScratch = new Float32Array(cells * 4)
    const buf = groupScratch
    buf.fill(0, 0, cells * 4)
    for (let li = start; li <= end; li += 1) {
      const layer = layers[li]!
      if (!layer.visible) continue
      const opacity = layerOpacity(layer)
      if (opacity === 0) continue
      const mode = layerBlend(layer)
      const as = opacity / PIXEL_OPACITY_MAX
      const transparentZero = li > 0
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const index = layer.indices[y * width + x] ?? 0
          if (transparentZero && index === 0) continue
          let sr = paperR
          let sg = paperG
          let sb = paperB
          if (index < palette.length) {
            const l = index * 3
            sr = lut[l]!
            sg = lut[l + 1]!
            sb = lut[l + 2]!
          }
          const j = ((y - y0) * rw + (x - x0)) * 4
          const ab = buf[j + 3]!
          const ar = as + ab * (1 - as)
          if (ar <= 0) continue
          const br = buf[j]!
          const bg = buf[j + 1]!
          const bb = buf[j + 2]!
          const mr = mode === "normal" ? sr : (1 - ab) * sr + ab * blendChannel(mode, br / 255, sr / 255) * 255
          const mg = mode === "normal" ? sg : (1 - ab) * sg + ab * blendChannel(mode, bg / 255, sg / 255) * 255
          const mb = mode === "normal" ? sb : (1 - ab) * sb + ab * blendChannel(mode, bb / 255, sb / 255) * 255
          const k = as / ar
          buf[j] = (1 - k) * br + k * mr
          buf[j + 1] = (1 - k) * bg + k * mg
          buf[j + 2] = (1 - k) * bb + k * mb
          buf[j + 3] = ar
        }
      }
    }
    const go = group.opacity / PIXEL_OPACITY_MAX
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const j = ((y - y0) * rw + (x - x0)) * 4
        const a = buf[j + 3]! * go
        if (a <= 0) continue
        const p = (y * width + x) * 4
        const cr = buf[j]!
        const cg = buf[j + 1]!
        const cb = buf[j + 2]!
        const br = pixels[p]!
        const bg = pixels[p + 1]!
        const bb = pixels[p + 2]!
        const tr = group.blend === "normal" ? cr : blendChannel(group.blend, br / 255, cr / 255) * 255
        const tg = group.blend === "normal" ? cg : blendChannel(group.blend, bg / 255, cg / 255) * 255
        const tb = group.blend === "normal" ? cb : blendChannel(group.blend, bb / 255, cb / 255) * 255
        pixels[p] = Math.round(br + (tr - br) * a)
        pixels[p + 1] = Math.round(bg + (tg - bg) * a)
        pixels[p + 2] = Math.round(bb + (tb - bb) * a)
      }
    }
  }

  if (groups.length === 0) {
    for (let i = 0; i < layers.length; i += 1) drawLayer(i)
    return
  }
  for (const segment of layerSegments(layers, groups)) {
    if (segment.kind === "layer") drawLayer(segment.index)
    else drawGroup(segment.group, segment.start, segment.end)
  }
}

/** Flatten visible layers to palette indices (paper where empty). */
export function flattenLayersToIndices(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  groups: readonly PixelGroupRuntime[] = [],
): Uint8Array {
  const out = emptyPixelIndices(width, height)
  const cellCount = width * height
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex]
    if (layerEffectivelyHidden(layer, groups) || layerOpacity(layer) === 0) continue
    const transparentZero = layerIndex > 0
    for (let i = 0; i < cellCount; i += 1) {
      const index = layer.indices[i] ?? 0
      if (transparentZero && index === 0) continue
      out[i] = index
    }
  }
  return out
}

/** Merge `upper` onto `lower` (upper 0 = transparent). Returns new indices. */
export function mergeLayerIndices(
  lower: Uint8Array,
  upper: Uint8Array,
  upperIsTransparentZero = true,
): Uint8Array {
  const length = Math.min(lower.length, upper.length)
  const out = new Uint8Array(lower)
  for (let i = 0; i < length; i += 1) {
    const index = upper[i] ?? 0
    if (upperIsTransparentZero && index === 0) continue
    out[i] = index
  }
  return out
}

/**
 * Nearest-neighbor layer thumbnail as PNG data URL.
 * Upper layers treat index 0 as transparent over a checker; bottom uses paper.
 */
export function layerThumbnailDataUrl(
  indices: Uint8Array,
  width: number,
  height: number,
  palette: readonly string[],
  opts?: { size?: number; transparentZero?: boolean },
): string | null {
  if (typeof document === "undefined") return null
  const size = Math.max(8, Math.min(64, opts?.size ?? 32))
  const transparentZero = opts?.transparentZero === true
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false
  const light = "#E8E4D8"
  const dark = "#D4CFC0"
  const cell = 4
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      ctx.fillStyle = ((x / cell) + (y / cell)) % 2 === 0 ? light : dark
      ctx.fillRect(x, y, cell, cell)
    }
  }
  if (!transparentZero) {
    ctx.fillStyle = PIXEL_PAPER
    ctx.fillRect(0, 0, size, size)
  }
  for (let dy = 0; dy < size; dy += 1) {
    const sy = Math.min(height - 1, Math.floor((dy * height) / size))
    for (let dx = 0; dx < size; dx += 1) {
      const sx = Math.min(width - 1, Math.floor((dx * width) / size))
      const index = indices[sy * width + sx] ?? 0
      if (transparentZero && index === 0) continue
      ctx.fillStyle = palette[index] ?? PIXEL_PAPER
      ctx.fillRect(dx, dy, 1, 1)
    }
  }
  try {
    return canvas.toDataURL("image/png")
  } catch {
    return null
  }
}

export function layersFromSourceV1(indices: Uint8Array, name = "Layer 1"): PixelLayerRuntime[] {
  return [
    {
      id: createLayerId(),
      name,
      visible: true,
      locked: false,
      indices: new Uint8Array(indices),
    },
  ]
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

/**
 * Serialises a layered document. Writes V3 only when a layer uses opacity, a blend mode or the
 * transparency lock; otherwise V2, so documents that do not use the new features stay readable
 * by older clients. (Name kept for compatibility.)
 */
export function buildPixelSourceV2(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  palette: readonly string[] = PIXEL_PALETTE,
  groups: readonly PixelGroupRuntime[] = [],
): PixelSourceV2 | PixelSourceV3 | PixelSourceV4 {
  const safe = layers.slice(0, PIXEL_LAYER_MAX)
  const list =
    safe.length > 0
      ? safe
      : [createEmptyLayer(width, height, "Layer 1")]
  const base = (layer: PixelLayerRuntime, index: number): PixelLayerV2 => ({
    id: layer.id || createLayerId(),
    name: layer.name || `Layer ${index + 1}`,
    visible: layer.visible !== false,
    locked: Boolean(layer.locked),
    runs: encodeRle(layer.indices),
  })
  const normalizedPalette = palette.map((color) => normalizePixelHex(color) ?? PIXEL_PAPER)
  const cleanGroups = normalizeGroups(
    list.map((layer) => ({ ...layer })),
    groups,
  )
  if (cleanGroups.length > 0) {
    const ids = new Set(cleanGroups.map((group) => group.id))
    return {
      version: PIXEL_SOURCE_VERSION_V4,
      width,
      height,
      palette: normalizedPalette,
      encoding: PIXEL_SOURCE_ENCODING,
      layers: list.map((layer, index) => ({
        ...base(layer, index),
        opacity: layerOpacity(layer),
        blend: layerBlend(layer),
        lockAlpha: Boolean(layer.lockAlpha),
        group: layer.group && ids.has(layer.group) ? layer.group : null,
      })),
      groups: cleanGroups.map((group) => ({
        id: group.id,
        name: clampGroupName(group.name) || "Group",
        visible: group.visible !== false,
        opacity: clampLayerOpacity(group.opacity),
        blend: isPixelBlendMode(group.blend) ? group.blend : "normal",
        collapsed: Boolean(group.collapsed),
      })),
    }
  }
  if (layersNeedV3(list)) {
    return {
      version: PIXEL_SOURCE_VERSION_V3,
      width,
      height,
      palette: normalizedPalette,
      encoding: PIXEL_SOURCE_ENCODING,
      layers: list.map((layer, index) => ({
        ...base(layer, index),
        opacity: layerOpacity(layer),
        blend: layerBlend(layer),
        lockAlpha: Boolean(layer.lockAlpha),
      })),
    }
  }
  return {
    version: PIXEL_SOURCE_VERSION_V2,
    width,
    height,
    palette: normalizedPalette,
    encoding: PIXEL_SOURCE_ENCODING,
    layers: list.map(base),
  }
}

export function parsePixelSource(
  input: unknown,
): ParsedPixelSource | { ok: false; error: PixelSourceError } {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid_source" }
  const value = input as Record<string, unknown>
  const version = value.version
  if (
    version !== PIXEL_SOURCE_VERSION &&
    version !== PIXEL_SOURCE_VERSION_V2 &&
    version !== PIXEL_SOURCE_VERSION_V3 &&
    version !== PIXEL_SOURCE_VERSION_V4
  ) {
    return { ok: false, error: "unsupported_version" }
  }
  if (typeof value.width !== "number" || typeof value.height !== "number") {
    return { ok: false, error: "invalid_source" }
  }
  if (!isPixelCanvasSize(value.width, value.height)) {
    return { ok: false, error: "invalid_source" }
  }
  if (value.encoding !== PIXEL_SOURCE_ENCODING) return { ok: false, error: "invalid_source" }
  const palette = parseSharedPalette(value.palette)
  if (!palette) return { ok: false, error: "invalid_source" }
  const expected = value.width * value.height

  if (version === PIXEL_SOURCE_VERSION) {
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
    const indices = decodeRle(data.runs, expected, data.palette.length)
    if (!indices) return { ok: false, error: "integrity" }
    const layers = layersFromSourceV1(indices)
    return { ok: true, data, indices, layers, groups: [] }
  }

  if (!Array.isArray(value.layers) || value.layers.length < 1 || value.layers.length > PIXEL_LAYER_MAX) {
    return { ok: false, error: "invalid_source" }
  }
  const isV4 = version === PIXEL_SOURCE_VERSION_V4
  const isV3 = version === PIXEL_SOURCE_VERSION_V3 || isV4
  const layers: PixelLayerRuntime[] = []
  const stored: Array<PixelLayerV2 | PixelLayerV3 | PixelLayerV4> = []
  for (let i = 0; i < value.layers.length; i += 1) {
    const raw = value.layers[i]
    if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_source" }
    const row = raw as Record<string, unknown>
    if (typeof row.id !== "string" || typeof row.name !== "string") return { ok: false, error: "invalid_source" }
    if (typeof row.visible !== "boolean" || typeof row.locked !== "boolean") {
      return { ok: false, error: "invalid_source" }
    }
    if (!Array.isArray(row.runs) || !row.runs.every((item) => Number.isInteger(item))) {
      return { ok: false, error: "invalid_source" }
    }
    const indices = decodeRle(row.runs as number[], expected, palette.length)
    if (!indices) return { ok: false, error: "integrity" }
    const layer: PixelLayerV2 = {
      id: row.id,
      name: row.name,
      visible: row.visible,
      locked: row.locked,
      runs: row.runs as number[],
    }
    const runtime: PixelLayerRuntime = {
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      indices,
    }
    if (isV3) {
      // Lenient on purpose: a missing or unknown value degrades to the default instead of
      // rejecting the whole document (a newer client may add blend modes).
      const opacity = clampLayerOpacity(row.opacity)
      const blend = isPixelBlendMode(row.blend) ? row.blend : "normal"
      const lockAlpha = row.lockAlpha === true
      if (isV4) {
        const group = typeof row.group === "string" && row.group ? row.group : null
        stored.push({ ...layer, opacity, blend, lockAlpha, group })
        runtime.group = group
      } else {
        stored.push({ ...layer, opacity, blend, lockAlpha })
      }
      runtime.opacity = opacity
      runtime.blend = blend
      runtime.lockAlpha = lockAlpha
    } else {
      stored.push(layer)
    }
    layers.push(runtime)
  }

  let groups: PixelGroupRuntime[] = []
  if (isV4) {
    // Lenient: skip malformed group records, then repair the layout (unknown references,
    // split runs, empty groups) so the document always opens.
    const rawGroups = Array.isArray(value.groups) ? value.groups.slice(0, PIXEL_LAYER_MAX) : []
    const parsedGroups: PixelGroupRuntime[] = []
    for (const raw of rawGroups) {
      if (!raw || typeof raw !== "object") continue
      const g = raw as Record<string, unknown>
      if (typeof g.id !== "string" || !g.id) continue
      parsedGroups.push({
        id: g.id,
        name: typeof g.name === "string" ? clampGroupName(g.name) || "Group" : "Group",
        visible: g.visible !== false,
        opacity: clampLayerOpacity(g.opacity),
        blend: isPixelBlendMode(g.blend) ? g.blend : "normal",
        collapsed: g.collapsed === true,
      })
    }
    groups = normalizeGroups(layers, parsedGroups)
    stored.forEach((row, index) => {
      ;(row as PixelLayerV4).group = layers[index]!.group ?? null
    })
  }

  const header = {
    width: value.width,
    height: value.height,
    palette,
    encoding: PIXEL_SOURCE_ENCODING,
  }
  const data: PixelSourceV2 | PixelSourceV3 | PixelSourceV4 = isV4
    ? {
        version: PIXEL_SOURCE_VERSION_V4,
        ...header,
        layers: stored as PixelLayerV4[],
        groups: groups.map((group) => ({ ...group })),
      }
    : isV3
      ? { version: PIXEL_SOURCE_VERSION_V3, ...header, layers: stored as PixelLayerV3[] }
      : { version: PIXEL_SOURCE_VERSION_V2, ...header, layers: stored as PixelLayerV2[] }
  const encoded = JSON.stringify(data)
  if (encoded.length > PIXEL_SOURCE_MAX_BYTES) return { ok: false, error: "payload_too_large" }
  return {
    ok: true,
    data,
    indices: flattenLayersToIndices(layers, value.width, value.height, groups),
    layers,
    groups,
  }
}

export function emptyPixelIndices(width = PIXEL_CANVAS_SIZE, height = PIXEL_CANVAS_SIZE) {
  return new Uint8Array(width * height)
}

export function filledPixelIndices(
  index: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
) {
  const cells = new Uint8Array(width * height)
  if (index !== 0) cells.fill(index)
  return cells
}

/** Ink usage entry derived from RLE (Paper/index 0 never included). */
export type ColorUsageEntry = {
  hex: string
  count: number
}

function accumulateRunsUsage(
  runs: number[],
  paletteLength: number,
  counts: Map<number, number>,
) {
  for (let i = 0; i + 1 < runs.length; i += 2) {
    const index = runs[i]
    const count = runs[i + 1]
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) continue
    if (index === 0) continue
    if (index < 0 || index >= paletteLength) continue
    counts.set(index, (counts.get(index) ?? 0) + count)
  }
}

/**
 * Histogram from RLE runs without expanding to a full bitmap.
 * Excludes palette index 0 (Paper / empty). Sorted by count descending.
 * For v2, uses flattened visible composite indices.
 */
export function colorUsageFromSource(
  source: Pick<PixelSourceV1, "palette" | "runs"> | PixelSource,
): ColorUsageEntry[] {
  const counts = new Map<number, number>()
  if ("layers" in source && Array.isArray(source.layers)) {
    const parsed = parsePixelSource(source)
    if (parsed.ok) {
      for (let i = 0; i < parsed.indices.length; i += 1) {
        const index = parsed.indices[i]!
        if (index === 0) continue
        counts.set(index, (counts.get(index) ?? 0) + 1)
      }
    }
  } else if ("runs" in source && Array.isArray(source.runs)) {
    accumulateRunsUsage(source.runs, source.palette.length, counts)
  }

  const entries: ColorUsageEntry[] = []
  for (const [index, count] of counts) {
    const hex = normalizePixelHex(source.palette[index] ?? "")
    if (!hex) continue
    entries.push({ hex, count })
  }
  entries.sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex))
  return entries
}

export function parseColorUsage(input: unknown): ColorUsageEntry[] | null {
  if (input == null) return null
  if (!Array.isArray(input)) return null
  const entries: ColorUsageEntry[] = []
  for (const item of input) {
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    if (typeof row.hex !== "string" || typeof row.count !== "number") return null
    if (!Number.isInteger(row.count) || row.count < 1) return null
    const hex = normalizePixelHex(row.hex)
    if (!hex) return null
    entries.push({ hex, count: row.count })
  }
  return entries
}

/** Integer percents that sum to 100 when total > 0 (largest-remainder). */
export function colorUsagePercents(entries: ColorUsageEntry[]) {
  const total = entries.reduce((sum, item) => sum + item.count, 0)
  if (total <= 0 || entries.length === 0) {
    return entries.map(() => 0)
  }
  const exact = entries.map((item) => (item.count / total) * 100)
  const floors = exact.map((value) => Math.floor(value))
  let remain = 100 - floors.reduce((sum, value) => sum + value, 0)
  const order = exact
    .map((value, index) => ({ index, frac: value - floors[index] }))
    .sort((a, b) => b.frac - a.frac)
  const out = [...floors]
  for (let i = 0; i < order.length && remain > 0; i += 1) {
    out[order[i].index] += 1
    remain -= 1
  }
  return out
}

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

export function isPngBuffer(bytes: Uint8Array) {
  if (bytes.length < PNG_SIGNATURE.length) return false
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value)
}
