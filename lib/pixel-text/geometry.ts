import type { PixelTextObject } from "./model"

/** Box geometry shared by hit-testing, resizing and the selection frame. */

export type TextHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
export const TEXT_HANDLES: readonly TextHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

export type Pt = { x: number; y: number }
type Box = Pick<PixelTextObject, "x" | "y" | "width" | "height" | "rotation">

const rad = (deg: number) => (deg * Math.PI) / 180

export function boxCenter(box: Box): Pt {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Rotate `p` about `c` by `deg` degrees (clockwise in screen space). */
export function rotatePoint(p: Pt, c: Pt, deg: number): Pt {
  const cos = Math.cos(rad(deg))
  const sin = Math.sin(rad(deg))
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/** Document point -> the box's own (unrotated) frame, origin at the box top-left. */
export function toLocal(box: Box, p: Pt): Pt {
  const r = rotatePoint(p, boxCenter(box), -box.rotation)
  return { x: r.x - box.x, y: r.y - box.y }
}

export function pointInTextBox(box: Box, p: Pt) {
  const l = toLocal(box, p)
  return l.x >= 0 && l.y >= 0 && l.x < box.width && l.y < box.height
}

/** Position of a handle in document space (box edge midpoints and corners). */
export function handlePosition(box: Box, handle: TextHandle): Pt {
  const fx = handle.includes("w") ? 0 : handle.includes("e") ? 1 : 0.5
  const fy = handle.includes("n") ? 0 : handle.includes("s") ? 1 : 0.5
  return rotatePoint({ x: box.x + box.width * fx, y: box.y + box.height * fy }, boxCenter(box), box.rotation)
}

/** Four corners of the rotated box, clockwise from top-left. */
export function boxCorners(box: Box): Pt[] {
  const c = boxCenter(box)
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ].map((p) => rotatePoint(p, c, box.rotation))
}

/**
 * Handle under `p`. `radius` is in document pixels (callers convert from screen pixels so handles
 * keep a constant on-screen size at any zoom). Corners win over edges when they overlap.
 */
export function hitTextHandle(box: Box, p: Pt, radius: number): TextHandle | null {
  const order: TextHandle[] = ["nw", "ne", "se", "sw", "n", "s", "e", "w"]
  for (const handle of order) {
    const pos = handlePosition(box, handle)
    if (Math.abs(p.x - pos.x) <= radius && Math.abs(p.y - pos.y) <= radius) return handle
  }
  return null
}

/** True when `p` is within `band` document pixels of the box outline (the move grip). */
export function hitTextBorder(box: Box, p: Pt, band: number) {
  const l = toLocal(box, p)
  const inside = l.x >= -band && l.y >= -band && l.x < box.width + band && l.y < box.height + band
  if (!inside) return false
  return l.x < band || l.y < band || l.x >= box.width - band || l.y >= box.height - band
}

export type ResizeLimits = { minWidth: number; minHeight: number; canvasWidth: number; canvasHeight: number }

/**
 * Resize `start` by dragging `handle` to document point `to`. Works in the box's local frame so a
 * rotated box resizes along its own axes, and keeps the opposite edge fixed in document space.
 * Never touches `fontSize`: horizontal changes reflow the text, vertical changes move the bounds.
 */
export function resizeTextBox(
  start: Box,
  handle: TextHandle,
  to: Pt,
  limits: ResizeLimits,
  opts: { square?: boolean } = {},
): Pick<PixelTextObject, "x" | "y" | "width" | "height"> {
  let l = toLocal(start, to)
  if (start.rotation % 360 === 0) {
    // Axis-aligned boxes stay on the canvas; the dragged edge stops at the canvas edge while the
    // opposite edge stays put.
    l = {
      x: Math.max(-start.x, Math.min(l.x, limits.canvasWidth - start.x)),
      y: Math.max(-start.y, Math.min(l.y, limits.canvasHeight - start.y)),
    }
  }
  let left = 0
  let top = 0
  let right = start.width
  let bottom = start.height
  if (handle.includes("w")) left = Math.min(l.x, right - limits.minWidth)
  if (handle.includes("e")) right = Math.max(l.x, left + limits.minWidth)
  if (handle.includes("n")) top = Math.min(l.y, bottom - limits.minHeight)
  if (handle.includes("s")) bottom = Math.max(l.y, top + limits.minHeight)
  if (opts.square && handle.length === 2) {
    const ratio = start.width / start.height
    const w = right - left
    const h = bottom - top
    if (w / h > ratio) {
      const nh = w / ratio
      if (handle.includes("n")) top = bottom - nh
      else bottom = top + nh
    } else {
      const nw = h * ratio
      if (handle.includes("w")) left = right - nw
      else right = left + nw
    }
  }
  left = Math.round(left)
  top = Math.round(top)
  right = Math.round(right)
  bottom = Math.round(bottom)
  const width = Math.max(limits.minWidth, right - left)
  const height = Math.max(limits.minHeight, bottom - top)
  // Local top-left of the new box, mapped back to document space through the *old* rotation, then
  // re-anchored so the box centre moves exactly as far as the dragged edges imply.
  const c = boxCenter(start)
  const newCenterLocal: Pt = { x: start.x + left + width / 2, y: start.y + top + height / 2 }
  const center = rotatePoint(newCenterLocal, c, start.rotation)
  return { x: Math.round(center.x - width / 2), y: Math.round(center.y - height / 2), width, height }
}

/** Clamp a moved box so at least part of it stays reachable on the canvas. */
export function clampTextPosition(
  x: number,
  y: number,
  box: Pick<PixelTextObject, "width" | "height">,
  canvasWidth: number,
  canvasHeight: number,
) {
  const keep = 2
  return {
    x: Math.round(Math.max(keep - box.width, Math.min(x, canvasWidth - keep))),
    y: Math.round(Math.max(keep - box.height, Math.min(y, canvasHeight - keep))),
  }
}
