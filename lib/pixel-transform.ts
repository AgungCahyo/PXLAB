import { createPaletteResolver, type PaletteResolver } from "@/lib/pixel-merge"
import { hexToRgb, PIXEL_PAPER, type PixelLayerRuntime } from "@/lib/pixel"

/**
 * Transform engine for indexed layers (pure, no DOM).
 *
 * Every transform is an inverse mapping: for each destination cell centre, find where it comes
 * from in the source and sample there.
 * - nearest: copies palette indices, so pixel boundaries stay exact and the palette never changes
 *   (integer scales, flips and 90-degree turns are exact permutations).
 * - bilinear / bicubic (Catmull-Rom): blend colours, so results are mapped back to the palette
 *   (existing colour, else a new one while there is room, else the nearest). Empty cells carry no
 *   colour: weights are alpha-premultiplied, so a sprite edge never bleeds toward Paper, and a
 *   cell is painted only when at least half of its neighbourhood is.
 */
export type Interpolation = "nearest" | "bilinear" | "bicubic"
export const INTERPOLATIONS: readonly Interpolation[] = ["nearest", "bilinear", "bicubic"]

export type AffineParams = {
  scaleX: number
  scaleY: number
  /** Degrees, positive = clockwise on screen. */
  rotation: number
  flipH: boolean
  flipV: boolean
  /** Translation in cells, applied after scale/rotation. */
  offsetX: number
  offsetY: number
}

export const IDENTITY_PARAMS: AffineParams = {
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  flipH: false,
  flipV: false,
  offsetX: 0,
  offsetY: 0,
}

export const TRANSFORM_SCALE_MIN = 0.05
export const TRANSFORM_SCALE_MAX = 16

export function isIdentityParams(p: AffineParams) {
  return (
    p.scaleX === 1 &&
    p.scaleY === 1 &&
    p.rotation % 360 === 0 &&
    !p.flipH &&
    !p.flipV &&
    p.offsetX === 0 &&
    p.offsetY === 0
  )
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

export function clampAffineParams(p: Partial<AffineParams>): AffineParams {
  const clampScale = (v: number | undefined) =>
    Math.max(TRANSFORM_SCALE_MIN, Math.min(TRANSFORM_SCALE_MAX, finiteOr(v ?? 1, 1)))
  return {
    scaleX: clampScale(p.scaleX),
    scaleY: clampScale(p.scaleY),
    rotation: finiteOr(p.rotation ?? 0, 0),
    flipH: Boolean(p.flipH),
    flipV: Boolean(p.flipV),
    offsetX: finiteOr(p.offsetX ?? 0, 0),
    offsetY: finiteOr(p.offsetY ?? 0, 0),
  }
}

export type SourceMap = (destX: number, destY: number) => readonly [number, number]

/**
 * Destination cell centre -> source continuous position (a cell i covers [i, i+1)).
 * Forward model: p' = P + T + R(S(F(p - P))), with P the canvas centre.
 */
export function affineSourceMap(p: AffineParams, width: number, height: number): SourceMap {
  const cx = width / 2
  const cy = height / 2
  const theta = (-p.rotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const fx = p.flipH ? -1 : 1
  const fy = p.flipV ? -1 : 1
  return (dx, dy) => {
    const vx = dx - cx - p.offsetX
    const vy = dy - cy - p.offsetY
    const rx = vx * cos - vy * sin
    const ry = vx * sin + vy * cos
    return [cx + (fx * rx) / p.scaleX, cy + (fy * ry) / p.scaleY]
  }
}

export type SampleContext = {
  palette: readonly string[]
  resolver: PaletteResolver
  /** Bottom layer: index 0 is opaque Paper, so there is no transparency to preserve. */
  isBase: boolean
}

/** Catmull-Rom weights for fractional position t, written into `w` (no allocation). */
function catmullRomInto(w: Float64Array, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  w[0] = -0.5 * t3 + t2 - 0.5 * t
  w[1] = 1.5 * t3 - 2.5 * t2 + 1
  w[2] = -1.5 * t3 + 2 * t2 + 0.5 * t
  w[3] = 0.5 * t3 - 0.5 * t2
}

/** Resample `src` (sw x sh) into a dw x dh index buffer using `map`. */
export function resampleIndices(
  src: Uint8Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  map: SourceMap,
  interpolation: Interpolation,
  ctx: SampleContext,
): Uint8Array {
  const out = new Uint8Array(dw * dh)
  if (interpolation === "nearest") {
    for (let y = 0; y < dh; y += 1) {
      for (let x = 0; x < dw; x += 1) {
        const [sx, sy] = map(x + 0.5, y + 0.5)
        const ix = Math.floor(sx + 1e-7)
        const iy = Math.floor(sy + 1e-7)
        out[y * dw + x] = ix < 0 || iy < 0 || ix >= sw || iy >= sh ? 0 : src[iy * sw + ix]!
      }
    }
    return out
  }

  // A layer with nothing painted has no colour to sample (the base layer is always opaque).
  if (!ctx.isBase && !src.some((v) => v !== 0)) return out

  const paper = hexToRgb(PIXEL_PAPER)
  const rgb = new Float32Array(256 * 3)
  for (let i = 0; i < 256; i += 1) {
    const c = i < ctx.palette.length ? hexToRgb(ctx.palette[i]!) : paper
    rgb[i * 3] = c[0]
    rgb[i * 3 + 1] = c[1]
    rgb[i * 3 + 2] = c[2]
  }
  const bicubic = interpolation === "bicubic"
  const span = bicubic ? 4 : 2
  const wx = new Float64Array(4)
  const wy = new Float64Array(4)

  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const [sx, sy] = map(x + 0.5, y + 0.5)
      const fx = sx - 0.5
      const fy = sy - 0.5
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      if (bicubic) {
        catmullRomInto(wx, tx)
        catmullRomInto(wy, ty)
      } else {
        wx[0] = 1 - tx
        wx[1] = tx
        wy[0] = 1 - ty
        wy[1] = ty
      }
      const startX = bicubic ? x0 - 1 : x0
      const startY = bicubic ? y0 - 1 : y0
      let A = 0
      let R = 0
      let G = 0
      let B = 0
      for (let j = 0; j < span; j += 1) {
        const yy = startY + j
        for (let i = 0; i < span; i += 1) {
          const xx = startX + i
          const w = wx[i]! * wy[j]!
          if (w === 0) continue
          let idx: number
          let alpha: number
          if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) {
            // Outside the layer: Paper under the base layer, nothing anywhere else.
            if (!ctx.isBase) continue
            idx = 0
            alpha = 1
          } else {
            idx = src[yy * sw + xx]!
            alpha = ctx.isBase || idx !== 0 ? 1 : 0
            if (alpha === 0) continue
          }
          A += w * alpha
          R += w * rgb[idx * 3]!
          G += w * rgb[idx * 3 + 1]!
          B += w * rgb[idx * 3 + 2]!
        }
      }
      if (A < 0.5) continue
      const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v / A)))
      out[y * dw + x] = ctx.resolver.resolve(clamp(R), clamp(G), clamp(B))
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Whole-document transform at a fixed canvas size
// ---------------------------------------------------------------------------------------------

export type CropRect = { x: number; y: number; width: number; height: number }

export type TransformRequest = {
  /** The active layer only, or every layer (the whole image). */
  scope: "layer" | "all"
  params: AffineParams
  interpolation: Interpolation
  /** Erase everything outside this rectangle first (used by "crop to selection"). */
  cropRect?: CropRect | null
}

export type TransformDocument = {
  width: number
  height: number
  palette: readonly string[]
  layers: readonly PixelLayerRuntime[]
  activeIndex: number
}

export type TransformResult = {
  changed: boolean
  /** New indices per layer, or null where the layer is untouched. */
  layerIndices: Array<Uint8Array | null>
  palette: string[]
  addedColors: number
  /** Distinct colours that did not fit the palette and were mapped to the nearest. */
  approximatedColors: number
  skipped: Array<{ id: string; reason: "locked" | "lockAlpha" }>
}

function eraseOutside(indices: Uint8Array, width: number, height: number, rect: CropRect) {
  const out = new Uint8Array(indices.length)
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(width, rect.x + rect.width)
  const y1 = Math.min(height, rect.y + rect.height)
  for (let y = y0; y < y1; y += 1) {
    const from = y * width + x0
    out.set(indices.subarray(from, y * width + x1), from)
  }
  return out
}

export function transformDocument(doc: TransformDocument, request: TransformRequest): TransformResult {
  const { width, height } = doc
  const resolver = createPaletteResolver(doc.palette)
  const map = affineSourceMap(request.params, width, height)
  const identity = isIdentityParams(request.params)
  const targets =
    request.scope === "all" ? doc.layers.map((_, index) => index) : [doc.activeIndex]
  const layerIndices: Array<Uint8Array | null> = doc.layers.map(() => null)
  const skipped: TransformResult["skipped"] = []
  let changed = false

  for (const index of targets) {
    const layer = doc.layers[index]
    if (!layer) continue
    if (layer.locked) {
      skipped.push({ id: layer.id, reason: "locked" })
      continue
    }
    if (layer.lockAlpha) {
      // A transform moves pixels, so it cannot keep the set of painted cells fixed.
      skipped.push({ id: layer.id, reason: "lockAlpha" })
      continue
    }
    let source = layer.indices
    if (request.cropRect) source = eraseOutside(source, width, height, request.cropRect)
    const next = identity
      ? source
      : resampleIndices(source, width, height, width, height, map, request.interpolation, {
          palette: doc.palette,
          resolver,
          isBase: index === 0,
        })
    let differs = next.length !== layer.indices.length
    if (!differs) {
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] !== layer.indices[i]) {
          differs = true
          break
        }
      }
    }
    if (differs) {
      layerIndices[index] = next
      changed = true
    }
  }
  return {
    changed,
    layerIndices,
    palette: resolver.palette,
    addedColors: resolver.added,
    approximatedColors: resolver.approximated,
    skipped,
  }
}

/**
 * Parameters that fit `rect` into the canvas, centred, without distortion ("crop to selection"
 * at a fixed canvas size). `integerOnly` keeps whole-number zoom so nearest stays exact.
 */
export function fitRectParams(
  rect: CropRect,
  width: number,
  height: number,
  integerOnly = false,
): AffineParams {
  let s = Math.min(width / rect.width, height / rect.height)
  if (integerOnly && s >= 1) s = Math.floor(s)
  s = Math.max(TRANSFORM_SCALE_MIN, Math.min(TRANSFORM_SCALE_MAX, s))
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return {
    ...IDENTITY_PARAMS,
    scaleX: s,
    scaleY: s,
    // `+ 0` turns -0 into 0 so identity checks and equality behave.
    offsetX: -s * (cx - width / 2) + 0,
    offsetY: -s * (cy - height / 2) + 0,
  }
}

// ---------------------------------------------------------------------------------------------
// Size-changing operations (engine only: the canvas size is locked in the product today)
// ---------------------------------------------------------------------------------------------

export type Anchor =
  | "top-left" | "top" | "top-right"
  | "left" | "center" | "right"
  | "bottom-left" | "bottom" | "bottom-right"

export function anchorOffset(anchor: Anchor, fromW: number, fromH: number, toW: number, toH: number) {
  const col = anchor.includes("left") ? 0 : anchor.includes("right") ? 2 : 1
  const row = anchor.startsWith("top") ? 0 : anchor.startsWith("bottom") ? 2 : 1
  return {
    x: Math.floor(((toW - fromW) * col) / 2),
    y: Math.floor(((toH - fromH) * row) / 2),
  }
}

/** New layer buffers cropped to `rect` (clipped to the canvas). */
export function cropLayers(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  rect: CropRect,
): { width: number; height: number; indices: Uint8Array[] } | null {
  const x0 = Math.max(0, rect.x)
  const y0 = Math.max(0, rect.y)
  const x1 = Math.min(width, rect.x + rect.width)
  const y1 = Math.min(height, rect.y + rect.height)
  const w = x1 - x0
  const h = y1 - y0
  if (w < 1 || h < 1) return null
  return {
    width: w,
    height: h,
    indices: layers.map((layer) => {
      const out = new Uint8Array(w * h)
      for (let y = 0; y < h; y += 1) {
        const from = (y0 + y) * width + x0
        out.set(layer.indices.subarray(from, from + w), y * w)
      }
      return out
    }),
  }
}

/** Resize the canvas without scaling the art: new area is empty (Paper on the base layer). */
export function resizeCanvasLayers(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
  anchor: Anchor,
): Uint8Array[] {
  const { x: ox, y: oy } = anchorOffset(anchor, width, height, newWidth, newHeight)
  return layers.map((layer) => {
    const out = new Uint8Array(newWidth * newHeight)
    for (let y = 0; y < height; y += 1) {
      const ny = y + oy
      if (ny < 0 || ny >= newHeight) continue
      for (let x = 0; x < width; x += 1) {
        const nx = x + ox
        if (nx < 0 || nx >= newWidth) continue
        out[ny * newWidth + nx] = layer.indices[y * width + x]!
      }
    }
    return out
  })
}

/** Scale the art to a new canvas size (every layer, same interpolation). */
export function resizeImageLayers(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
  interpolation: Interpolation,
  palette: readonly string[],
) {
  const resolver = createPaletteResolver(palette)
  const map: SourceMap = (x, y) => [(x * width) / newWidth, (y * height) / newHeight]
  const indices = layers.map((layer, index) =>
    resampleIndices(layer.indices, width, height, newWidth, newHeight, map, interpolation, {
      palette,
      resolver,
      isBase: index === 0,
    }),
  )
  return { indices, palette: resolver.palette, addedColors: resolver.added }
}
