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
/** Discrete brush diameters for pencil / eraser (odd sizes stay centered). */
export const PIXEL_BRUSH_SIZES = [1, 2, 3, 4, 6, 8] as const
export type PixelBrushSize = (typeof PIXEL_BRUSH_SIZES)[number]
export type PixelZoomStep = (typeof PIXEL_ZOOM_STEPS)[number]
export type PixelZoom = "fit" | number

/** Studio drawing tools (pan is navigation). */
export type PixelDrawTool =
  | "pencil"
  | "eraser"
  | "pan"
  | "eyedropper"
  | "fill"
  | "line"
  | "rect"
  | "ellipse"
  | "select"

export type PixelRect = { x: number; y: number; width: number; height: number }

export type PixelClipboard = {
  width: number
  height: number
  /** RGBA length width*height*4 */
  data: Uint8ClampedArray
}

/** Mirror axes while drawing (X = left-right, Y = top-bottom). */
export type PixelSymmetry = "off" | "x" | "y" | "xy"

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

export function rgbToHex(rgb: readonly [number, number, number]) {
  const to = (n: number) => n.toString(16).padStart(2, "0").toUpperCase()
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`
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

/** Disk brush (size 1 = single pixel). Radius uses floor((size-1)/2) Chebyshev for odd; Euclidean for even. */
export function stampBrush(
  pixels: Uint8ClampedArray,
  cx: number,
  cy: number,
  rgb: readonly [number, number, number],
  size: number,
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
) {
  const brush = Math.max(1, Math.min(8, Math.round(size)))
  if (brush === 1) {
    setPixel(pixels, cx, cy, rgb, width, height)
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
      if (dx * dx + dy * dy <= r2 + 0.25) setPixel(pixels, x, y, rgb, width, height)
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
) {
  walkLine(x0, y0, x1, y1, (x, y) => stampBrush(pixels, x, y, rgb, size, width, height))
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
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  for (let x = left; x <= right; x += 1) {
    setPixel(pixels, x, top, rgb, width, height)
    setPixel(pixels, x, bottom, rgb, width, height)
  }
  for (let y = top; y <= bottom; y += 1) {
    setPixel(pixels, left, y, rgb, width, height)
    setPixel(pixels, right, y, rgb, width, height)
  }
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
) {
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      setPixel(pixels, x, y, rgb, width, height)
    }
  }
}

/** Ellipse via bounding-box test (filled or 1 px ring). */
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
) {
  const { left, right, top, bottom } = normalizeRect(x0, y0, x1, y1)
  const rw = right - left
  const rh = bottom - top
  if (rw === 0 && rh === 0) {
    setPixel(pixels, left, top, rgb, width, height)
    return
  }
  if (rw === 0 || rh === 0) {
    strokeBrushLine(pixels, left, top, right, bottom, rgb, 1, width, height)
    return
  }
  const rx = rw / 2
  const ry = rh / 2
  const cx = left + rx
  const cy = top + ry
  const rx2 = rx * rx
  const ry2 = ry * ry
  const outer = 1.02
  const inner = filled ? -1 : Math.max(0, 1 - 1.35 / Math.max(rx, ry))
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const v = ((x - cx) * (x - cx)) / rx2 + ((y - cy) * (y - cy)) / ry2
      if (filled) {
        if (v <= outer) setPixel(pixels, x, y, rgb, width, height)
      } else if (v <= outer && v >= inner) {
        setPixel(pixels, x, y, rgb, width, height)
      }
    }
  }
}

/**
 * Contiguous 4-connected flood fill. No-op if target equals fill color.
 * Caps visits at width*height.
 */
export function floodFill(
  pixels: Uint8ClampedArray,
  startX: number,
  startY: number,
  rgb: readonly [number, number, number],
  width = PIXEL_CANVAS_SIZE,
  height = PIXEL_CANVAS_SIZE,
) {
  const target = getPixelRgb(pixels, startX, startY, width, height)
  if (!target || rgbEqual(target, rgb)) return 0
  const stack: number[] = [startX, startY]
  let painted = 0
  const max = width * height
  while (stack.length > 0 && painted < max) {
    const y = stack.pop()
    const x = stack.pop()
    if (x === undefined || y === undefined) break
    if (!inCanvas(x, y, width, height)) continue
    const current = getPixelRgb(pixels, x, y, width, height)
    if (!current || !rgbEqual(current, target)) continue
    setPixel(pixels, x, y, rgb, width, height)
    painted += 1
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
  return painted
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

export function extractRect(
  pixels: Uint8ClampedArray,
  rect: PixelRect,
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
  return { width: rect.width, height: rect.height, data }
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

export function clearRectToPaper(
  pixels: Uint8ClampedArray,
  rect: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
) {
  const rgb = hexToRgb(PIXEL_PAPER)
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
}

export function clearCanvasToPaper(pixels: Uint8ClampedArray) {
  fillPaper(pixels)
}

export function flipRectHorizontal(
  pixels: Uint8ClampedArray,
  rect: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
) {
  const clip = extractRect(pixels, rect, canvasWidth, canvasHeight)
  for (let row = 0; row < clip.height; row += 1) {
    for (let col = 0; col < Math.floor(clip.width / 2); col += 1) {
      const a = (row * clip.width + col) * 4
      const b = (row * clip.width + (clip.width - 1 - col)) * 4
      for (let k = 0; k < 4; k += 1) {
        const tmp = clip.data[a + k]
        clip.data[a + k] = clip.data[b + k]
        clip.data[b + k] = tmp
      }
    }
  }
  blitRect(pixels, clip, rect.x, rect.y, canvasWidth, canvasHeight)
}

export function flipRectVertical(
  pixels: Uint8ClampedArray,
  rect: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
) {
  const clip = extractRect(pixels, rect, canvasWidth, canvasHeight)
  for (let row = 0; row < Math.floor(clip.height / 2); row += 1) {
    for (let col = 0; col < clip.width; col += 1) {
      const a = (row * clip.width + col) * 4
      const b = ((clip.height - 1 - row) * clip.width + col) * 4
      for (let k = 0; k < 4; k += 1) {
        const tmp = clip.data[a + k]
        clip.data[a + k] = clip.data[b + k]
        clip.data[b + k] = tmp
      }
    }
  }
  blitRect(pixels, clip, rect.x, rect.y, canvasWidth, canvasHeight)
}

/** Clockwise 90°. Returns new rect origin/size (width/height swapped). Clipped when blitting. */
export function rotateRect90Cw(
  pixels: Uint8ClampedArray,
  rect: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
): PixelRect {
  const src = extractRect(pixels, rect, canvasWidth, canvasHeight)
  clearRectToPaper(pixels, rect, canvasWidth, canvasHeight)
  const rotated: PixelClipboard = {
    width: src.height,
    height: src.width,
    data: new Uint8ClampedArray(src.width * src.height * 4),
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
    }
  }
  blitRect(pixels, rotated, rect.x, rect.y, canvasWidth, canvasHeight)
  return { x: rect.x, y: rect.y, width: rotated.width, height: rotated.height }
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
) {
  walkLine(x0, y0, x1, y1, (x, y) => {
    for (const point of symmetryPoints(x, y, canvasWidth, canvasHeight, mode)) {
      stampBrush(pixels, point.x, point.y, rgb, size, canvasWidth, canvasHeight)
    }
  })
}

export function replaceRgbInPixels(
  pixels: Uint8ClampedArray,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  rect?: PixelRect,
  canvasWidth = PIXEL_CANVAS_SIZE,
  canvasHeight = PIXEL_CANVAS_SIZE,
) {
  const left = rect?.x ?? 0
  const top = rect?.y ?? 0
  const right = rect ? rect.x + rect.width - 1 : canvasWidth - 1
  const bottom = rect ? rect.y + rect.height - 1 : canvasHeight - 1
  let count = 0
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inCanvas(x, y, canvasWidth, canvasHeight)) continue
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

/** Ink usage entry derived from RLE (Paper/index 0 never included). */
export type ColorUsageEntry = {
  hex: string
  count: number
}

/**
 * Histogram from RLE runs without expanding to a full bitmap.
 * Excludes palette index 0 (Paper / empty). Sorted by count descending.
 */
export function colorUsageFromSource(source: Pick<PixelSourceV1, "palette" | "runs">): ColorUsageEntry[] {
  const counts = new Map<number, number>()
  const runs = source.runs
  for (let i = 0; i + 1 < runs.length; i += 2) {
    const index = runs[i]
    const count = runs[i + 1]
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) continue
    if (index === 0) continue
    if (index < 0 || index >= source.palette.length) continue
    counts.set(index, (counts.get(index) ?? 0) + count)
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
