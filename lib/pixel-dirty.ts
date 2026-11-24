import { clampStrokeWidth, type PixelRect, type PixelSymmetry } from "./pixel"

/** Inclusive brush reach around a cell center. Matches `stampBrush`. */
export function brushDirtyPad(size: number) {
  const brush = clampStrokeWidth(size)
  if (brush <= 1) return 0
  return Math.ceil((brush - 1) / 2)
}

/** Clip a cell rectangle to the canvas. Returns null when nothing remains. */
export function clampDirtyRect(rect: PixelRect, width: number, height: number): PixelRect | null {
  const x0 = Math.max(0, Math.min(width, Math.floor(rect.x)))
  const y0 = Math.max(0, Math.min(height, Math.floor(rect.y)))
  const x1 = Math.max(0, Math.min(width, Math.ceil(rect.x + rect.width)))
  const y1 = Math.max(0, Math.min(height, Math.ceil(rect.y + rect.height)))
  if (x1 <= x0 || y1 <= y0) return null
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

export function unionDirtyRect(a: PixelRect, b: PixelRect): PixelRect {
  const x0 = Math.min(a.x, b.x)
  const y0 = Math.min(a.y, b.y)
  const x1 = Math.max(a.x + a.width, b.x + b.width)
  const y1 = Math.max(a.y + a.height, b.y + b.height)
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

function coveragePoints(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: PixelSymmetry,
) {
  const points = [{ x, y }]
  const mx = canvasWidth - 1 - x
  const my = canvasHeight - 1 - y
  if (mode === "x" || mode === "xy") points.push({ x: mx, y })
  if (mode === "y" || mode === "xy") points.push({ x, y: my })
  if (mode === "xy") points.push({ x: mx, y: my })
  return points
}

/**
 * Cells a brush segment can touch, including symmetry mirrors.
 * Off-canvas endpoints stay in the box so a brush that overlaps the edge is kept.
 */
export function dirtyRectForSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  width: number,
  height: number,
  symmetry: PixelSymmetry = "off",
): PixelRect | null {
  const pad = brushDirtyPad(size)
  const cells = [
    ...coveragePoints(x0, y0, width, height, symmetry),
    ...coveragePoints(x1, y1, width, height, symmetry),
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of cells) {
    minX = Math.min(minX, cell.x - pad)
    minY = Math.min(minY, cell.y - pad)
    maxX = Math.max(maxX, cell.x + pad + 1)
    maxY = Math.max(maxY, cell.y + pad + 1)
  }
  return clampDirtyRect({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, width, height)
}
