import {
  PIXEL_STROKE_MAX,
  PIXEL_STROKE_MIN,
  pointInSelection,
  symmetryPoints,
  walkLine,
  type PixelBrushShape,
  type PixelClipboard,
  type PixelSelection,
  type PixelSymmetry,
} from "./pixel"

/**
 * Brush engine for indexed-colour documents.
 *
 * Layers store palette indices, so a "50% opacity" stroke cannot blend colours without
 * flooding the palette. Opacity, flow, hardness and pressure therefore become a coverage
 * value 0..1 that is resolved with an 8x8 ordered (Bayer) dither: deterministic, no new
 * palette entries, and the same stroke always produces the same pixels.
 *
 * - opacity: ceiling of coverage for the whole stroke (overlaps never exceed it).
 * - flow: how fast coverage builds up per stamp (accumulates inside one stroke).
 * - hardness: coverage falloff from centre to edge (circle/square brushes).
 * - spacing: distance between stamps in % of brush size; 0 = every cell (exact Bresenham).
 * - pressure: scales size and/or coverage when the pointer reports it.
 * - custom: a 1-bit mask (from a selection or the clipboard) used as the brush tip.
 */
export type BrushMask = {
  width: number
  height: number
  /** width*height, 1 = painted. Anchored on its centre cell. */
  mask: Uint8Array
}

export type BrushOptions = {
  opacity: number
  flow: number
  hardness: number
  spacing: number
  pressureSize: boolean
  pressureOpacity: boolean
  custom: BrushMask | null
}

export const BRUSH_MASK_MAX = 64
export const BRUSH_SPACING_MAX = 200
export const BRUSH_PRESSURE_FLOOR = 0.15

export const DEFAULT_BRUSH_OPTIONS: BrushOptions = {
  opacity: 100,
  flow: 100,
  hardness: 100,
  spacing: 0,
  pressureSize: false,
  pressureOpacity: false,
  custom: null,
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function clampBrushOptions(input: Partial<BrushOptions> = {}): BrushOptions {
  const merged = { ...DEFAULT_BRUSH_OPTIONS, ...input }
  return {
    opacity: clampInt(merged.opacity, 1, 100),
    flow: clampInt(merged.flow, 1, 100),
    hardness: clampInt(merged.hardness, 0, 100),
    spacing: clampInt(merged.spacing, 0, BRUSH_SPACING_MAX),
    pressureSize: Boolean(merged.pressureSize),
    pressureOpacity: Boolean(merged.pressureOpacity),
    custom: merged.custom ?? null,
  }
}

/** True when the options reproduce the legacy hard brush exactly (fast, allocation-free path). */
export function isPlainBrush(options: BrushOptions) {
  return (
    options.opacity === 100 &&
    options.flow === 100 &&
    options.hardness === 100 &&
    options.spacing === 0 &&
    !options.pressureSize &&
    !options.pressureOpacity &&
    !options.custom
  )
}

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39,
  13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]

/** Ordered dither decision: coverage 1 always paints, 0 never paints. */
export function ditherPasses(coverage: number, x: number, y: number) {
  const threshold = (BAYER_8[((y & 7) << 3) | (x & 7)]! + 0.5) / 64
  return coverage > threshold
}

/** Footprint weight 0..1 for a stamp cell at offset (dx, dy) from the centre. */
export function brushCoverage(
  dx: number,
  dy: number,
  size: number,
  shape: PixelBrushShape,
  hardness: number,
) {
  const brush = clampInt(size, PIXEL_STROKE_MIN, PIXEL_STROKE_MAX)
  if (brush === 1) return dx === 0 && dy === 0 ? 1 : 0
  const r = (brush - 1) / 2
  let edge: number
  let dist: number
  if (shape === "square") {
    edge = r + 1e-6
    dist = Math.max(Math.abs(dx), Math.abs(dy))
    if (dist > edge) return 0
  } else {
    edge = Math.sqrt(r * r + 0.25)
    dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > edge + 1e-9) return 0
  }
  const inner = (clampInt(hardness, 0, 100) / 100) * edge
  if (dist <= inner || edge - inner < 1e-9) return 1
  return Math.max(0, Math.min(1, (edge - dist) / (edge - inner)))
}

export function normalizePointerPressure(pointerType: string | undefined, pressure: number | undefined) {
  if (pointerType !== "pen") return 1
  if (pressure === undefined || !Number.isFinite(pressure) || pressure <= 0) return 0.5
  return Math.max(BRUSH_PRESSURE_FLOOR, Math.min(1, pressure))
}

export type PointerSample = { clientX: number; clientY: number; pressure: number }

export function listPointerSamples(event: {
  clientX: number
  clientY: number
  pointerType?: string
  pressure?: number
  getCoalescedEvents?: () => Iterable<{
    clientX: number
    clientY: number
    pointerType?: string
    pressure?: number
  }>
}): PointerSample[] {
  const toSample = (e: { clientX: number; clientY: number; pointerType?: string; pressure?: number }) => ({
    clientX: e.clientX,
    clientY: e.clientY,
    pressure: normalizePointerPressure(e.pointerType ?? event.pointerType, e.pressure),
  })
  try {
    const coalesced = event.getCoalescedEvents?.()
    if (coalesced) {
      const samples = Array.from(coalesced, toSample)
      if (samples.length > 0) return samples
    }
  } catch {
    /* unsupported / restricted */
  }
  return [toSample(event)]
}

/** Brush tip from a selection silhouette (rect or masked). Null when empty or too large. */
export function brushMaskFromSelection(selection: PixelSelection | null | undefined): BrushMask | null {
  if (!selection) return null
  const { width, height } = selection
  if (width < 1 || height < 1 || width > BRUSH_MASK_MAX || height > BRUSH_MASK_MAX) return null
  const mask = new Uint8Array(width * height)
  let any = false
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pointInSelection(selection.x + x, selection.y + y, selection)) {
        mask[y * width + x] = 1
        any = true
      }
    }
  }
  return any ? { width, height, mask } : null
}

/** Brush tip from clipboard pixels: opaque, unmasked-out cells. */
export function brushMaskFromClipboard(clip: PixelClipboard | null | undefined): BrushMask | null {
  if (!clip) return null
  const { width, height } = clip
  if (width < 1 || height < 1 || width > BRUSH_MASK_MAX || height > BRUSH_MASK_MAX) return null
  const mask = new Uint8Array(width * height)
  let any = false
  for (let i = 0; i < width * height; i += 1) {
    if (clip.mask && clip.mask[i] !== 1) continue
    if (clip.data[i * 4 + 3]! === 0) continue
    mask[i] = 1
    any = true
  }
  return any ? { width, height, mask } : null
}

export type StrokePoint = { x: number; y: number; pressure?: number }

export type StrokeContext = {
  rgb: readonly [number, number, number]
  size: number
  shape: PixelBrushShape
  clip?: PixelSelection | null
  symmetry?: PixelSymmetry
}

/** Stamp half-extent for dirty-rect padding. */
export function brushOptionsExtent(size: number, options: BrushOptions) {
  if (options.custom) return Math.max(options.custom.width, options.custom.height)
  return size
}

/**
 * One brush stroke. Input sampling stays outside; this turns ordered points into stamps.
 * Allocates its accumulation buffer once per canvas size and clears only what it touched.
 */
export class BrushStroke {
  private acc: Float32Array
  private touched: { x0: number; y0: number; x1: number; y1: number } | null = null
  private options: BrushOptions = DEFAULT_BRUSH_OPTIONS
  private untilNext = 0
  private started = false

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    this.acc = new Float32Array(width * height)
  }

  matches(width: number, height: number) {
    return this.width === width && this.height === height
  }

  begin(options: BrushOptions) {
    this.options = options
    this.untilNext = 0
    this.started = false
    const t = this.touched
    if (t) {
      for (let y = t.y0; y <= t.y1; y += 1) {
        this.acc.fill(0, y * this.width + t.x0, y * this.width + t.x1 + 1)
      }
      this.touched = null
    }
  }

  /** Paint from the previous stroke point (null at stroke start) to `to`. */
  paint(pixels: Uint8ClampedArray, from: StrokePoint | null, to: StrokePoint, ctx: StrokeContext) {
    const toPressure = to.pressure ?? 1
    if (!this.started || !from) {
      this.started = true
      this.stampPoint(pixels, to.x, to.y, toPressure, ctx)
      this.untilNext = this.step(ctx)
      return
    }
    const fromPressure = from.pressure ?? toPressure
    if (this.options.spacing === 0) {
      const total = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))
      let i = 0
      walkLine(from.x, from.y, to.x, to.y, (x, y) => {
        const first = i === 0
        const t = total === 0 ? 1 : i / total
        i += 1
        if (first) return // already stamped as the previous segment's end
        this.stampPoint(pixels, x, y, fromPressure + (toPressure - fromPressure) * t, ctx)
      })
      return
    }
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (length === 0) return
    const step = this.step(ctx)
    let s = this.untilNext
    while (s <= length) {
      const t = s / length
      this.stampPoint(
        pixels,
        Math.round(from.x + (to.x - from.x) * t),
        Math.round(from.y + (to.y - from.y) * t),
        fromPressure + (toPressure - fromPressure) * t,
        ctx,
      )
      s += step
    }
    this.untilNext = s - length
  }

  private step(ctx: StrokeContext) {
    const diameter = this.options.custom
      ? Math.max(this.options.custom.width, this.options.custom.height)
      : ctx.size
    return Math.max(1, (this.options.spacing / 100) * diameter)
  }

  private stampPoint(
    pixels: Uint8ClampedArray,
    cx: number,
    cy: number,
    pressure: number,
    ctx: StrokeContext,
  ) {
    const mode = ctx.symmetry ?? "off"
    if (mode === "off") {
      this.stampOne(pixels, cx, cy, pressure, ctx)
      return
    }
    for (const p of symmetryPoints(cx, cy, this.width, this.height, mode)) {
      this.stampOne(pixels, p.x, p.y, pressure, ctx)
    }
  }

  private stampOne(
    pixels: Uint8ClampedArray,
    cx: number,
    cy: number,
    pressure: number,
    ctx: StrokeContext,
  ) {
    const o = this.options
    const p = Math.max(BRUSH_PRESSURE_FLOOR, Math.min(1, pressure))
    const cap = o.opacity / 100
    const flow = (o.flow / 100) * (o.pressureOpacity ? p : 1)
    const apply = (x: number, y: number, weight: number) => {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
      if (ctx.clip && !pointInSelection(x, y, ctx.clip)) return
      const idx = y * this.width + x
      const a = flow * weight
      const next = this.acc[idx]! + (1 - this.acc[idx]!) * a
      this.acc[idx] = next
      const t = this.touched
      if (!t) this.touched = { x0: x, y0: y, x1: x, y1: y }
      else {
        if (x < t.x0) t.x0 = x
        if (x > t.x1) t.x1 = x
        if (y < t.y0) t.y0 = y
        if (y > t.y1) t.y1 = y
      }
      if (!ditherPasses(Math.min(next, cap), x, y)) return
      const i = idx * 4
      pixels[i] = ctx.rgb[0]
      pixels[i + 1] = ctx.rgb[1]
      pixels[i + 2] = ctx.rgb[2]
      pixels[i + 3] = 255
    }

    if (o.custom) {
      const { width: mw, height: mh, mask } = o.custom
      const ox = cx - Math.floor(mw / 2)
      const oy = cy - Math.floor(mh / 2)
      for (let y = 0; y < mh; y += 1) {
        for (let x = 0; x < mw; x += 1) {
          if (mask[y * mw + x] === 1) apply(ox + x, oy + y, 1)
        }
      }
      return
    }

    const size = o.pressureSize
      ? clampInt(ctx.size * p, PIXEL_STROKE_MIN, PIXEL_STROKE_MAX)
      : clampInt(ctx.size, PIXEL_STROKE_MIN, PIXEL_STROKE_MAX)
    const r = (size - 1) / 2
    const minX = Math.floor(cx - r)
    const maxX = Math.ceil(cx + r)
    const minY = Math.floor(cy - r)
    const maxY = Math.ceil(cy + r)
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const w = brushCoverage(x - cx, y - cy, size, ctx.shape, o.hardness)
        if (w > 0) apply(x, y, w)
      }
    }
  }
}
