import { encodeGif, GIF_MAX_COLORS } from "@/lib/pixel-gif"
import { layerEffectivelyHidden, type PixelGroupRuntime } from "@/lib/pixel-groups"
import { scaleRgbaNearest } from "@/lib/pixel-png-scale"
import { createZip } from "@/lib/pixel-zip"
import {
  compositeLayersToRgba,
  hexToRgb,
  layerOpacity,
  normalizePixelHex,
  PIXEL_EXPORT_EDGE_MAX,
  PIXEL_PAPER,
  type PixelLayerRuntime,
} from "./pixel"

/**
 * Export engine: renders a document to files. Pure (no DOM); the one browser-only step, raster
 * encoding (PNG / JPEG / WebP), is injected as a `RasterEncoder`.
 *
 * What gets exported always matches the viewport composition: composites use the same compositor
 * as the editor. "Transparent background" removes Paper only where no layer painted anything; a
 * painted cell that happens to be Paper-coloured stays opaque, and blended or semi-transparent
 * cells are baked exactly as they look on screen.
 */
export type ExportDocument = {
  width: number
  height: number
  palette: readonly string[]
  layers: readonly PixelLayerRuntime[]
  groups: readonly PixelGroupRuntime[]
}

export type ExportBackground =
  | { kind: "transparent" }
  | { kind: "paper" }
  | { kind: "color"; hex: string }

export type RasterMime = "image/png" | "image/jpeg" | "image/webp"

export type RasterExportOptions = {
  format: "png" | "jpeg" | "webp"
  scale: number
  background: ExportBackground
  /** 0-1, JPEG and WebP only. */
  quality?: number
}

export type ExportOptions =
  | RasterExportOptions
  | {
      format: "gif"
      scale: number
      background: ExportBackground
      /** "flat" = one frame of the visible image; "layers" = every visible layer is a frame. */
      source: "flat" | "layers"
      delayMs: number
      /** 0 = forever. */
      loop: number
    }
  | {
      format: "sheet"
      scale: number
      background: ExportBackground
      /** 0 = automatic (roughly square). */
      columns: number
      /** Gap between frames in source pixels. */
      padding: number
      includeJson: boolean
    }
  | {
      format: "layers"
      scale: number
      background: ExportBackground
      /** Bake each layer's opacity into the PNG alpha channel. */
      applyOpacity: boolean
      includeHidden: boolean
    }

export type ExportFile = { name: string; mime: string; bytes: Uint8Array }

export type ExportResult = {
  file: ExportFile
  width: number
  height: number
  frames: number
  /** File names inside a ZIP result. */
  entries?: string[]
  /** A PNG to show as the preview when the file itself is a ZIP (the sheet, or the first layer). */
  preview?: Uint8Array
}

export type RasterEncoder = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mime: RasterMime,
  quality: number,
) => Promise<Uint8Array>

export type ExportErrorCode = "bounds" | "scale" | "no_layers" | "palette" | "encode" | "options"

export class ExportError extends Error {
  constructor(public readonly code: ExportErrorCode) {
    super(code)
    this.name = "ExportError"
  }
}

export const EXPORT_DEFAULT_QUALITY = 0.92
export const EXPORT_PADDING_MAX = 64

function bgRgb(background: ExportBackground): [number, number, number] | null {
  if (background.kind === "transparent") return null
  if (background.kind === "paper") return hexToRgb(PIXEL_PAPER)
  return hexToRgb(normalizePixelHex(background.hex) ?? PIXEL_PAPER)
}

export function maxExportScale(width: number, height: number) {
  return Math.max(1, Math.floor(PIXEL_EXPORT_EDGE_MAX / Math.max(1, width, height)))
}

function isRasterOptions(options: ExportOptions): options is RasterExportOptions {
  return options.format === "png" || options.format === "jpeg" || options.format === "webp"
}

function checkScale(scale: number) {
  if (!Number.isInteger(scale) || scale < 1) throw new ExportError("scale")
}

function checkSize(width: number, height: number) {
  if (width > PIXEL_EXPORT_EDGE_MAX || height > PIXEL_EXPORT_EDGE_MAX) throw new ExportError("bounds")
}

/** Layers that contribute to the picture: not hidden (by themselves or their group), opacity > 0. */
export function visibleLayerIndices(doc: ExportDocument) {
  const out: number[] = []
  doc.layers.forEach((layer, index) => {
    if (!layerEffectivelyHidden(layer, doc.groups) && layerOpacity(layer) > 0) out.push(index)
  })
  return out
}

/** 1 where some visible layer painted the cell (index 0 means empty on every layer). */
export function paintedMask(doc: ExportDocument) {
  const mask = new Uint8Array(doc.width * doc.height)
  for (const index of visibleLayerIndices(doc)) {
    const indices = doc.layers[index]!.indices
    for (let i = 0; i < mask.length; i += 1) if (indices[i] !== 0) mask[i] = 1
  }
  return mask
}

/** The picture as shown in the editor, with the chosen background for unpainted cells. */
export function renderComposite(doc: ExportDocument, background: ExportBackground) {
  const { width, height } = doc
  const rgba = new Uint8ClampedArray(width * height * 4)
  compositeLayersToRgba(doc.layers, rgba, doc.palette, width, height, null, doc.groups)
  if (background.kind === "paper") return rgba
  const mask = paintedMask(doc)
  const fill = bgRgb(background)
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) continue
    const p = i * 4
    if (fill) {
      rgba[p] = fill[0]
      rgba[p + 1] = fill[1]
      rgba[p + 2] = fill[2]
      rgba[p + 3] = 255
    } else {
      rgba[p] = 0
      rgba[p + 1] = 0
      rgba[p + 2] = 0
      rgba[p + 3] = 0
    }
  }
  return rgba
}

/** One layer on its own. Blend mode and group are ignored (they only mean something in a stack). */
export function renderLayer(
  layer: PixelLayerRuntime,
  doc: ExportDocument,
  background: ExportBackground,
  applyOpacity: boolean,
) {
  const { width, height, palette } = doc
  const rgba = new Uint8ClampedArray(width * height * 4)
  const fill = bgRgb(background)
  const alpha = applyOpacity ? Math.round((layerOpacity(layer) / 100) * 255) : 255
  const colors = palette.map((hex) => hexToRgb(hex))
  const paper = hexToRgb(PIXEL_PAPER)
  for (let i = 0; i < width * height; i += 1) {
    const p = i * 4
    const index = layer.indices[i] ?? 0
    if (index !== 0) {
      const c = colors[index] ?? paper
      rgba[p] = c[0]
      rgba[p + 1] = c[1]
      rgba[p + 2] = c[2]
      rgba[p + 3] = alpha
    } else if (fill) {
      rgba[p] = fill[0]
      rgba[p + 1] = fill[1]
      rgba[p + 2] = fill[2]
      rgba[p + 3] = 255
    }
  }
  return rgba
}

export type SheetLayout = {
  columns: number
  rows: number
  width: number
  height: number
  rects: Array<{ x: number; y: number; w: number; h: number }>
}

export function layoutSpriteSheet(
  count: number,
  frameW: number,
  frameH: number,
  columns: number,
  padding: number,
): SheetLayout {
  if (count < 1) throw new ExportError("no_layers")
  const pad = Math.max(0, Math.min(EXPORT_PADDING_MAX, Math.round(padding)))
  const cols = Math.max(1, Math.min(count, columns > 0 ? Math.round(columns) : Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / cols)
  const rects = Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * (frameW + pad),
    y: Math.floor(i / cols) * (frameH + pad),
    w: frameW,
    h: frameH,
  }))
  return {
    columns: cols,
    rows,
    width: cols * frameW + (cols - 1) * pad,
    height: rows * frameH + (rows - 1) * pad,
    rects,
  }
}

export function composeSpriteSheet(
  frames: readonly Uint8ClampedArray[],
  frameW: number,
  frameH: number,
  layout: SheetLayout,
  background: ExportBackground,
) {
  const out = new Uint8ClampedArray(layout.width * layout.height * 4)
  const fill = bgRgb(background)
  if (fill) {
    for (let i = 0; i < out.length; i += 4) {
      out[i] = fill[0]
      out[i + 1] = fill[1]
      out[i + 2] = fill[2]
      out[i + 3] = 255
    }
  }
  frames.forEach((frame, i) => {
    const r = layout.rects[i]!
    for (let y = 0; y < frameH; y += 1) {
      const from = y * frameW * 4
      out.set(frame.subarray(from, from + frameW * 4), ((r.y + y) * layout.width + r.x) * 4)
    }
  })
  return out
}

export function sanitizeFileStem(name: string, fallback = "layer") {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 48)
  return cleaned || fallback
}

type IndexedFrame = { palette: Array<[number, number, number]>; indices: Uint8Array; transparentIndex: number | null }

/**
 * Colour-reduce an RGBA picture to a GIF palette. Exact when it has few enough colours; otherwise
 * the most frequent colours are kept and every other colour maps to the nearest kept one.
 */
export function rgbaToIndexed(rgba: Uint8ClampedArray, width: number, height: number): IndexedFrame {
  const count = width * height
  const freq = new Map<number, number>()
  let hasTransparent = false
  for (let i = 0; i < count; i += 1) {
    const p = i * 4
    if (rgba[p + 3]! < 128) {
      hasTransparent = true
      continue
    }
    const key = (rgba[p]! << 16) | (rgba[p + 1]! << 8) | rgba[p + 2]!
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }
  const room = GIF_MAX_COLORS - (hasTransparent ? 1 : 0)
  const keys = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, Math.max(1, room)).map(([key]) => key)
  const palette: Array<[number, number, number]> = keys.map((key) => [(key >> 16) & 255, (key >> 8) & 255, key & 255])
  if (palette.length === 0) palette.push([0, 0, 0])
  const transparentIndex = hasTransparent ? palette.length : null
  if (hasTransparent) palette.push([0, 0, 0])
  const exact = new Map<number, number>()
  keys.forEach((key, i) => exact.set(key, i))
  const indices = new Uint8Array(count)
  for (let i = 0; i < count; i += 1) {
    const p = i * 4
    if (rgba[p + 3]! < 128) {
      indices[i] = transparentIndex as number
      continue
    }
    const key = (rgba[p]! << 16) | (rgba[p + 1]! << 8) | rgba[p + 2]!
    let hit = exact.get(key)
    if (hit === undefined) {
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < keys.length; c += 1) {
        const q = palette[c]!
        const d = (q[0] - rgba[p]!) ** 2 + (q[1] - rgba[p + 1]!) ** 2 + (q[2] - rgba[p + 2]!) ** 2
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }
      hit = best
      exact.set(key, hit)
    }
    indices[i] = hit
  }
  return { palette, indices, transparentIndex }
}

function layerFrameIndices(
  layer: PixelLayerRuntime,
  doc: ExportDocument,
  backgroundIndex: number,
  paperIndex: number,
) {
  const out = new Uint8Array(doc.width * doc.height)
  for (let i = 0; i < out.length; i += 1) {
    const index = layer.indices[i] ?? 0
    out[i] = index === 0 ? backgroundIndex : index < doc.palette.length ? index : paperIndex
  }
  return out
}

function buildLayerGif(doc: ExportDocument, options: Extract<ExportOptions, { format: "gif" }>, layers: PixelLayerRuntime[]) {
  const palette: Array<[number, number, number]> = doc.palette.map((hex) => hexToRgb(hex))
  const used = new Set<number>()
  for (const layer of layers) for (let i = 0; i < layer.indices.length; i += 1) used.add(layer.indices[i]!)
  const findOrAdd = (rgb: [number, number, number] | null): number => {
    if (rgb) {
      const at = palette.findIndex((c) => c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2])
      if (at >= 0) return at
    }
    if (palette.length < GIF_MAX_COLORS) {
      palette.push(rgb ?? [0, 0, 0])
      return palette.length - 1
    }
    // Palette is full: reuse a colour that no frame uses; otherwise there is no room.
    for (let i = GIF_MAX_COLORS - 1; i >= 0; i -= 1) {
      if (!used.has(i)) {
        palette[i] = rgb ?? [0, 0, 0]
        return i
      }
    }
    throw new ExportError("palette")
  }
  const fill = bgRgb(options.background)
  const paperIndex = findOrAdd(hexToRgb(PIXEL_PAPER))
  const backgroundIndex = fill ? findOrAdd(fill) : findOrAdd(null)
  const frames = layers.map((layer) => ({
    indices: layerFrameIndices(layer, doc, backgroundIndex, paperIndex),
    delayMs: options.delayMs,
  }))
  return encodeGif({
    width: doc.width,
    height: doc.height,
    palette,
    frames,
    transparentIndex: fill ? null : backgroundIndex,
    loop: options.loop,
    scale: options.scale,
  })
}

function scaled(rgba: Uint8ClampedArray, width: number, height: number, scale: number) {
  return scale === 1 ? { data: rgba, width, height } : scaleRgbaNearest(rgba, width, height, scale)
}

export function exportFileStem(title: string, fallback = "artwork") {
  return sanitizeFileStem(title, fallback)
}

/** Produce the export. `stem` names the file(s). */
export async function buildExport(
  doc: ExportDocument,
  options: ExportOptions,
  encode: RasterEncoder,
  stem = "artwork",
): Promise<ExportResult> {
  checkScale(options.scale)
  const base = exportFileStem(stem)
  const suffix = options.scale > 1 ? `@${options.scale}x` : ""
  const encodePng = (rgba: Uint8ClampedArray, w: number, h: number) => encode(rgba, w, h, "image/png", 1)

  if (isRasterOptions(options)) {
    checkSize(doc.width * options.scale, doc.height * options.scale)
    // JPEG has no alpha: transparent falls back to Paper.
    const background: ExportBackground =
      options.format === "jpeg" && options.background.kind === "transparent" ? { kind: "paper" } : options.background
    const img = scaled(renderComposite(doc, background), doc.width, doc.height, options.scale)
    const mime: RasterMime = options.format === "png" ? "image/png" : options.format === "jpeg" ? "image/jpeg" : "image/webp"
    const ext = options.format === "jpeg" ? "jpg" : options.format
    const bytes = await encode(img.data, img.width, img.height, mime, options.quality ?? EXPORT_DEFAULT_QUALITY)
    return { file: { name: `${base}${suffix}.${ext}`, mime, bytes }, width: img.width, height: img.height, frames: 1 }
  }

  if (options.format === "gif") {
    checkSize(doc.width * options.scale, doc.height * options.scale)
    if (options.source === "layers") {
      const layers = visibleLayerIndices(doc).map((i) => doc.layers[i]!)
      if (layers.length === 0) throw new ExportError("no_layers")
      const bytes = buildLayerGif(doc, options, layers)
      return {
        file: { name: `${base}${suffix}.gif`, mime: "image/gif", bytes },
        width: doc.width * options.scale,
        height: doc.height * options.scale,
        frames: layers.length,
      }
    }
    const idx = rgbaToIndexed(renderComposite(doc, options.background), doc.width, doc.height)
    const bytes = encodeGif({
      width: doc.width,
      height: doc.height,
      palette: idx.palette,
      frames: [{ indices: idx.indices, delayMs: options.delayMs }],
      transparentIndex: idx.transparentIndex,
      scale: options.scale,
    })
    return {
      file: { name: `${base}${suffix}.gif`, mime: "image/gif", bytes },
      width: doc.width * options.scale,
      height: doc.height * options.scale,
      frames: 1,
    }
  }

  if (options.format === "sheet") {
    const picked = visibleLayerIndices(doc).map((i) => doc.layers[i]!)
    if (picked.length === 0) throw new ExportError("no_layers")
    const layout = layoutSpriteSheet(picked.length, doc.width, doc.height, options.columns, options.padding)
    checkSize(layout.width * options.scale, layout.height * options.scale)
    const frames = picked.map((layer) => renderLayer(layer, doc, { kind: "transparent" }, false))
    const sheet = composeSpriteSheet(frames, doc.width, doc.height, layout, options.background)
    const img = scaled(sheet, layout.width, layout.height, options.scale)
    const png = await encodePng(img.data, img.width, img.height)
    if (!options.includeJson) {
      return { file: { name: `${base}-sheet${suffix}.png`, mime: "image/png", bytes: png }, width: img.width, height: img.height, frames: picked.length }
    }
    const names = picked.map((layer) => layer.name)
    const json = JSON.stringify(
      {
        meta: {
          app: "PXLB Studio",
          image: `${base}-sheet${suffix}.png`,
          size: { w: img.width, h: img.height },
          scale: options.scale,
          frameSize: { w: doc.width * options.scale, h: doc.height * options.scale },
          columns: layout.columns,
          rows: layout.rows,
          padding: Math.max(0, Math.min(EXPORT_PADDING_MAX, Math.round(options.padding))) * options.scale,
        },
        frames: layout.rects.map((r, i) => ({
          index: i,
          name: names[i],
          x: r.x * options.scale,
          y: r.y * options.scale,
          w: r.w * options.scale,
          h: r.h * options.scale,
        })),
      },
      null,
      2,
    )
    const entries = [
      { name: `${base}-sheet${suffix}.png`, data: png },
      { name: `${base}-sheet${suffix}.json`, data: new TextEncoder().encode(json) },
    ]
    return {
      file: { name: `${base}-sheet${suffix}.zip`, mime: "application/zip", bytes: createZip(entries) },
      width: img.width,
      height: img.height,
      frames: picked.length,
      entries: entries.map((e) => e.name),
      preview: png,
    }
  }

  // layers -> ZIP of PNGs
  if (options.format !== "layers") throw new ExportError("options")
  checkSize(doc.width * options.scale, doc.height * options.scale)
  const chosen = doc.layers.filter(
    (layer) => options.includeHidden || !layerEffectivelyHidden(layer, doc.groups),
  )
  if (chosen.length === 0) throw new ExportError("no_layers")
  const used = new Set<string>()
  const entries: Array<{ name: string; data: Uint8Array }> = []
  const pad = String(chosen.length).length
  for (let i = 0; i < chosen.length; i += 1) {
    const layer = chosen[i]!
    const img = scaled(renderLayer(layer, doc, options.background, options.applyOpacity), doc.width, doc.height, options.scale)
    let name = `${String(i + 1).padStart(Math.max(2, pad), "0")}-${sanitizeFileStem(layer.name, `layer-${i + 1}`)}.png`
    while (used.has(name)) name = name.replace(/\.png$/, "-copy.png")
    used.add(name)
    entries.push({ name, data: await encodePng(img.data, img.width, img.height) })
  }
  return {
    file: { name: `${base}-layers${suffix}.zip`, mime: "application/zip", bytes: createZip(entries) },
    width: doc.width * options.scale,
    height: doc.height * options.scale,
    frames: entries.length,
    entries: entries.map((e) => e.name),
    preview: entries[0]!.data,
  }
}
