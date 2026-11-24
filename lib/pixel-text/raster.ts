import { resolvePixelFont } from "./fonts"
import { layoutText, type TextLayout } from "./layout"
import type { PixelTextObject } from "./model"

/**
 * Canvas Renderer for text objects: turns a `PixelTextObject` into palette indices.
 *
 * Everything is drawn on whole document pixels with nearest-neighbour sampling: no anti-aliasing,
 * no fractional glyph positions, and the result is identical at every zoom level because zoom is
 * a view concern. The layer compositor then handles stacking, opacity, blending, groups and
 * export exactly as it does for painted layers.
 */

export type TextRect = { x: number; y: number; width: number; height: number }

type LocalMask = {
  data: Uint8Array
  /** Local origin relative to the box top-left (negative when text overhangs the left/top). */
  ox: number
  oy: number
  width: number
  height: number
}

function renderLocalMask(obj: PixelTextObject, layout: TextLayout): LocalMask {
  const face = resolvePixelFont(obj.fontFamily)
  const { scale } = layout
  const bold = obj.fontWeight === "bold"
  const italic = obj.fontStyle === "italic"
  const clip = obj.overflow === "clip"

  let minX = 0
  let minY = 0
  let maxX = obj.width
  let maxY = obj.height
  if (!clip) {
    for (const line of layout.lines) {
      minY = Math.min(minY, line.y)
      maxY = Math.max(maxY, line.y + layout.glyphHeight)
      for (const g of line.glyphs) {
        minX = Math.min(minX, g.x)
        maxX = Math.max(maxX, g.x + (face.glyphWidth + (bold ? 1 : 0) + (italic ? 1 : 0)) * scale)
      }
    }
  }
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const data = new Uint8Array(width * height)
  const n = face.nativeSize
  const shearStep = Math.ceil(n / 2)

  const plot = (x: number, y: number) => {
    const lx = x - minX
    const ly = y - minY
    if (lx < 0 || ly < 0 || lx >= width || ly >= height) return
    if (clip && (x < 0 || y < 0 || x >= obj.width || y >= obj.height)) return
    data[ly * width + lx] = 1
  }

  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      if (glyph.char === " ") continue
      const rows = face.rows(glyph.char)
      for (let row = 0; row < n; row += 1) {
        const bits = rows[row] ?? 0
        if (!bits) continue
        const shear = italic ? Math.floor((n - 1 - row) / shearStep) : 0
        for (let col = 0; col < face.glyphWidth; col += 1) {
          if (!(bits & (1 << (face.glyphWidth - 1 - col)))) continue
          const px = glyph.x + (col + shear) * scale
          const py = line.y + row * scale
          for (let dy = 0; dy < scale; dy += 1) {
            for (let dx = 0; dx < scale; dx += 1) {
              plot(px + dx, py + dy)
              if (bold) plot(px + dx + scale, py + dy)
            }
          }
        }
      }
    }
  }
  return { data, ox: minX, oy: minY, width, height }
}

function rotatedExtent(w: number, h: number, cx: number, cy: number, radians: number) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of [[0, 0], [w, 0], [0, h], [w, h]] as const) {
    const dx = px - cx
    const dy = py - cy
    const x = cx + dx * cos - dy * sin
    const y = cy + dx * sin + dy * cos
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Document-space rectangle that can hold ink for `obj` (clipped to the canvas). Used as the
 * dirty region: clear it, re-draw, then recomposite only that rect.
 */
export function textDirtyRect(obj: PixelTextObject, canvasWidth: number, canvasHeight: number): TextRect | null {
  let left = 0
  let top = 0
  let right = obj.width
  let bottom = obj.height
  if (obj.overflow === "visible") {
    const layout = layoutText(obj)
    const face = resolvePixelFont(obj.fontFamily)
    const slack = (face.glyphWidth + 2) * layout.scale
    for (const line of layout.lines) {
      top = Math.min(top, line.y)
      bottom = Math.max(bottom, line.y + layout.glyphHeight)
      for (const g of line.glyphs) {
        left = Math.min(left, g.x)
        right = Math.max(right, g.x + slack)
      }
    }
  }
  const w = right - left
  const h = bottom - top
  const cx = obj.width / 2 - left
  const cy = obj.height / 2 - top
  const ext = rotatedExtent(w, h, cx, cy, (obj.rotation * Math.PI) / 180)
  const ox = obj.x + left
  const oy = obj.y + top
  const x0 = Math.max(0, Math.floor(ox + ext.minX) - 1)
  const y0 = Math.max(0, Math.floor(oy + ext.minY) - 1)
  const x1 = Math.min(canvasWidth, Math.ceil(ox + ext.maxX) + 1)
  const y1 = Math.min(canvasHeight, Math.ceil(oy + ext.maxY) + 1)
  if (x1 <= x0 || y1 <= y0) return null
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

export function unionTextRect(a: TextRect | null, b: TextRect | null): TextRect | null {
  if (!a) return b
  if (!b) return a
  const x0 = Math.min(a.x, b.x)
  const y0 = Math.min(a.y, b.y)
  const x1 = Math.max(a.x + a.width, b.x + b.width)
  const y1 = Math.max(a.y + a.height, b.y + b.height)
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

/**
 * Draw `obj` into `target` (document-sized palette indices) using `colorIndex`. Only writes ink
 * cells, so the caller clears `textDirtyRect` of the previous state first. Hidden objects draw
 * nothing; `visible` is also honoured by the layer, this keeps the cache honest on its own.
 */
export function drawTextObject(
  obj: PixelTextObject,
  colorIndex: number,
  target: Uint8Array,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (!obj.text.trim()) return
  const layout = layoutText(obj)
  const mask = renderLocalMask(obj, layout)
  const rotation = obj.rotation % 360
  if (rotation === 0) {
    for (let y = 0; y < mask.height; y += 1) {
      const dy = obj.y + mask.oy + y
      if (dy < 0 || dy >= canvasHeight) continue
      for (let x = 0; x < mask.width; x += 1) {
        if (!mask.data[y * mask.width + x]) continue
        const dx = obj.x + mask.ox + x
        if (dx < 0 || dx >= canvasWidth) continue
        target[dy * canvasWidth + dx] = colorIndex
      }
    }
    return
  }
  // Rotate about the box centre by inverse-mapping each destination pixel centre.
  const radians = (rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const centerX = obj.x + obj.width / 2
  const centerY = obj.y + obj.height / 2
  const rect = textDirtyRect(obj, canvasWidth, canvasHeight)
  if (!rect) return
  const localOriginX = obj.x + mask.ox
  const localOriginY = obj.y + mask.oy
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const dx = x + 0.5 - centerX
      const dy = y + 0.5 - centerY
      // Inverse rotation back into the unrotated box frame.
      const sx = centerX + dx * cos + dy * sin
      const sy = centerY - dx * sin + dy * cos
      const lx = Math.floor(sx - localOriginX)
      const ly = Math.floor(sy - localOriginY)
      if (lx < 0 || ly < 0 || lx >= mask.width || ly >= mask.height) continue
      if (mask.data[ly * mask.width + lx]) target[y * canvasWidth + x] = colorIndex
    }
  }
}

/** Fresh document-sized index buffer containing only `obj`. */
export function rasterizeTextObject(
  obj: PixelTextObject,
  colorIndex: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  const out = new Uint8Array(canvasWidth * canvasHeight)
  drawTextObject(obj, colorIndex, out, canvasWidth, canvasHeight)
  return out
}
