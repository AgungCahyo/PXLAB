import {
  PIXEL_EXPORT_EDGE_MAX,
  PIXEL_PAPER,
  hexToRgb,
} from "@/lib/pixel"

export { PIXEL_EXPORT_EDGE_MAX }

export const DOWNLOAD_FIT_TARGETS = [
  { id: "1080p", width: 1920, height: 1080 },
  { id: "1440p", width: 2560, height: 1440 },
] as const

export type DownloadFitTargetId = (typeof DOWNLOAD_FIT_TARGETS)[number]["id"]

/** Download background: punch Paper to alpha, or keep opaque Paper. */
export type DownloadBackground = "transparent" | "solid"

export type DownloadExportMode =
  | { kind: "scale"; scale: number }
  | { kind: "fit"; id: DownloadFitTargetId; targetW: number; targetH: number }

export type DownloadExportOption =
  | {
      kind: "scale"
      key: string
      scale: number
      width: number
      height: number
    }
  | {
      kind: "fit"
      key: string
      id: DownloadFitTargetId
      targetW: number
      targetH: number
      scale: number
      contentW: number
      contentH: number
    }

/** Max integer scale so both edges stay ≤ PIXEL_EXPORT_EDGE_MAX. */
export function maxDownloadScale(width: number, height: number): number {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const edge = Math.max(w, h)
  return Math.max(1, Math.floor(PIXEL_EXPORT_EDGE_MAX / edge))
}

/**
 * Download scale choices: 1× and powers of two up to maxDownloadScale.
 * Never offers a size larger than PIXEL_EXPORT_EDGE_MAX on either edge.
 */
export function downloadScaleOptions(width: number, height: number): number[] {
  const max = maxDownloadScale(width, height)
  const options: number[] = [1]
  for (let s = 2; s <= max; s *= 2) options.push(s)
  return options
}

export function scaledDownloadSize(width: number, height: number, scale: number) {
  const s = Math.floor(scale)
  return {
    width: Math.max(1, Math.floor(width)) * s,
    height: Math.max(1, Math.floor(height)) * s,
  }
}

export function assertDownloadScaleAllowed(
  width: number,
  height: number,
  scale: number,
): { ok: true; outW: number; outH: number } | { ok: false; reason: "scale" | "bounds" } {
  if (!Number.isInteger(scale) || scale < 1) return { ok: false, reason: "scale" }
  const { width: outW, height: outH } = scaledDownloadSize(width, height, scale)
  if (outW > PIXEL_EXPORT_EDGE_MAX || outH > PIXEL_EXPORT_EDGE_MAX) return { ok: false, reason: "bounds" }
  if (scale > maxDownloadScale(width, height)) return { ok: false, reason: "bounds" }
  return { ok: true, outW, outH }
}

/** Largest integer scale that fits src inside target without cropping. */
export function fitIntegerScale(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
): number {
  const w = Math.max(1, Math.floor(srcW))
  const h = Math.max(1, Math.floor(srcH))
  const tw = Math.max(1, Math.floor(targetW))
  const th = Math.max(1, Math.floor(targetH))
  return Math.max(1, Math.min(Math.floor(tw / w), Math.floor(th / h)))
}

/** Curated UI scales: original, optional 4×, largest power-of-two (deduped). */
export function curatedDownloadScales(width: number, height: number): number[] {
  const powers = downloadScaleOptions(width, height)
  const scales = new Set<number>([1])
  if (powers.includes(4)) scales.add(4)
  const largest = powers[powers.length - 1]
  if (largest && largest > 1) scales.add(largest)
  return [...scales].sort((a, b) => a - b)
}

export function downloadExportOptions(width: number, height: number): DownloadExportOption[] {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const options: DownloadExportOption[] = curatedDownloadScales(w, h).map((scale) => {
    const size = scaledDownloadSize(w, h, scale)
    return {
      kind: "scale" as const,
      key: `scale-${scale}`,
      scale,
      width: size.width,
      height: size.height,
    }
  })

  for (const target of DOWNLOAD_FIT_TARGETS) {
    if (target.width > PIXEL_EXPORT_EDGE_MAX || target.height > PIXEL_EXPORT_EDGE_MAX) continue
    const scale = fitIntegerScale(w, h, target.width, target.height)
    if (scale < 1) continue
    const contentW = w * scale
    const contentH = h * scale
    if (contentW > target.width || contentH > target.height) continue
    options.push({
      kind: "fit",
      key: `fit-${target.id}`,
      id: target.id,
      targetW: target.width,
      targetH: target.height,
      scale,
      contentW,
      contentH,
    })
  }

  return options
}

export function resolveDownloadExportMode(
  options: readonly DownloadExportOption[],
  key: string,
): DownloadExportMode | null {
  const option = options.find((item) => item.key === key)
  if (!option) return null
  if (option.kind === "scale") return { kind: "scale", scale: option.scale }
  return {
    kind: "fit",
    id: option.id,
    targetW: option.targetW,
    targetH: option.targetH,
  }
}

export function downloadModeOutputSize(
  width: number,
  height: number,
  mode: DownloadExportMode,
): { width: number; height: number } {
  if (mode.kind === "scale") return scaledDownloadSize(width, height, mode.scale)
  return { width: mode.targetW, height: mode.targetH }
}

/**
 * True nearest-neighbor: each source pixel becomes a uniform scale×scale block.
 * Copies RGBA bytes verbatim — no browser drawImage interpolation.
 */
export function scaleRgbaNearest(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  if (!Number.isInteger(scale) || scale < 1) throw new Error("scale")
  if (source.length < width * height * 4) throw new Error("buffer")
  const outW = width * scale
  const outH = height * scale
  if (outW > PIXEL_EXPORT_EDGE_MAX || outH > PIXEL_EXPORT_EDGE_MAX) throw new Error("bounds")
  if (scale === 1) {
    return { data: new Uint8ClampedArray(source), width, height }
  }

  const out = new Uint8ClampedArray(outW * outH * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4
      const r = source[si]!
      const g = source[si + 1]!
      const b = source[si + 2]!
      const a = source[si + 3]!
      const baseY = y * scale
      const baseX = x * scale
      for (let dy = 0; dy < scale; dy++) {
        const row = (baseY + dy) * outW
        for (let dx = 0; dx < scale; dx++) {
          const oi = (row + baseX + dx) * 4
          out[oi] = r
          out[oi + 1] = g
          out[oi + 2] = b
          out[oi + 3] = a
        }
      }
    }
  }
  return { data: out, width: outW, height: outH }
}

/**
 * Nearest-neighbor upscale, then center on a letterbox canvas.
 * Margins: transparent (default) or opaque Paper when background is solid.
 */
export function letterboxRgbaNearest(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  targetW: number,
  targetH: number,
  background: DownloadBackground = "transparent",
): { data: Uint8ClampedArray; width: number; height: number; scale: number } {
  const tw = Math.floor(targetW)
  const th = Math.floor(targetH)
  if (!Number.isInteger(tw) || !Number.isInteger(th) || tw < 1 || th < 1) throw new Error("target")
  if (tw > PIXEL_EXPORT_EDGE_MAX || th > PIXEL_EXPORT_EDGE_MAX) throw new Error("bounds")

  const scale = fitIntegerScale(width, height, tw, th)
  const scaled = scaleRgbaNearest(source, width, height, scale)
  const out = new Uint8ClampedArray(tw * th * 4)
  if (background === "solid") {
    const [pr, pg, pb] = hexToRgb(PIXEL_PAPER)
    for (let i = 0; i < out.length; i += 4) {
      out[i] = pr
      out[i + 1] = pg
      out[i + 2] = pb
      out[i + 3] = 255
    }
  }

  const ox = Math.floor((tw - scaled.width) / 2)
  const oy = Math.floor((th - scaled.height) / 2)
  for (let y = 0; y < scaled.height; y++) {
    const srcRow = y * scaled.width
    const dstRow = (y + oy) * tw + ox
    for (let x = 0; x < scaled.width; x++) {
      const si = (srcRow + x) * 4
      const oi = (dstRow + x) * 4
      out[oi] = scaled.data[si]!
      out[oi + 1] = scaled.data[si + 1]!
      out[oi + 2] = scaled.data[si + 2]!
      out[oi + 3] = scaled.data[si + 3]!
    }
  }

  return { data: out, width: tw, height: th, scale }
}

/**
 * Download-only: turn canvas Paper into true PNG transparency.
 * Does not change editor/cover storage (those stay opaque Paper).
 */
export function punchPaperAlpha(
  data: Uint8ClampedArray,
  paperRgb: readonly [number, number, number] = hexToRgb(PIXEL_PAPER),
): Uint8ClampedArray {
  const [pr, pg, pb] = paperRgb
  const out = new Uint8ClampedArray(data)
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] === pr && out[i + 1] === pg && out[i + 2] === pb) {
      out[i] = 0
      out[i + 1] = 0
      out[i + 2] = 0
      out[i + 3] = 0
    }
  }
  return out
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

async function canvasToPngBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob> {
  if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: "image/png" })
  }
  const htmlCanvas = canvas as HTMLCanvasElement
  return new Promise((resolve, reject) => {
    htmlCanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png")
  })
}

async function rgbaToPngBlob(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Blob> {
  const outCanvas = makeCanvas(width, height)
  const outCtx = outCanvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null
  if (!outCtx) throw new Error("context")
  const imageData = new ImageData(width, height)
  imageData.data.set(data)
  outCtx.putImageData(imageData, 0, 0)
  return canvasToPngBlob(outCanvas)
}

async function readSourceRgba(source: Blob): Promise<{
  data: Uint8ClampedArray
  width: number
  height: number
}> {
  const bitmap = await createImageBitmap(source, { colorSpaceConversion: "none" })
  try {
    const srcW = bitmap.width
    const srcH = bitmap.height
    const srcCanvas = makeCanvas(srcW, srcH)
    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true }) as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!srcCtx) throw new Error("context")
    srcCtx.drawImage(bitmap, 0, 0)
    const srcImage = srcCtx.getImageData(0, 0, srcW, srcH)
    return { data: srcImage.data, width: srcW, height: srcH }
  } finally {
    bitmap.close()
  }
}

/**
 * Nearest-neighbor upscale for download only. Does not mutate stored cover/source.
 * Uses explicit pixel replication (not drawImage scaling) so RGB stays exact.
 */
export async function scalePngNearest(
  source: Blob,
  scale: number,
  background: DownloadBackground = "transparent",
): Promise<Blob> {
  return exportPngForDownload(source, { kind: "scale", scale }, background)
}

/** Client download path: integer scale or fit-to-target letterbox. */
export async function exportPngForDownload(
  source: Blob,
  mode: DownloadExportMode,
  background: DownloadBackground = "transparent",
): Promise<Blob> {
  if (mode.kind === "scale" && (!Number.isInteger(mode.scale) || mode.scale < 1)) {
    throw new Error("scale")
  }

  const src = await readSourceRgba(source)
  let rgba: { data: Uint8ClampedArray; width: number; height: number }

  if (mode.kind === "scale") {
    const allowed = assertDownloadScaleAllowed(src.width, src.height, mode.scale)
    if (!allowed.ok) throw new Error(allowed.reason)
    rgba = scaleRgbaNearest(src.data, src.width, src.height, mode.scale)
  } else {
    if (mode.targetW > PIXEL_EXPORT_EDGE_MAX || mode.targetH > PIXEL_EXPORT_EDGE_MAX) {
      throw new Error("bounds")
    }
    rgba = letterboxRgbaNearest(
      src.data,
      src.width,
      src.height,
      mode.targetW,
      mode.targetH,
      background,
    )
  }

  const pixels = background === "transparent" ? punchPaperAlpha(rgba.data) : rgba.data
  return rgbaToPngBlob(pixels, rgba.width, rgba.height)
}

export function formatDownloadEstimateBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 10) return `~${kb.toFixed(1)} KB`
  return `~${Math.round(kb)} KB`
}

export function triggerPngDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadFilenameSuffix(
  mode: DownloadExportMode,
  background: DownloadBackground = "transparent",
): string {
  const sizePart =
    mode.kind === "scale" ? (mode.scale > 1 ? `-${mode.scale}x` : "") : `-${mode.id}`
  const bgPart = background === "solid" ? "-solid" : ""
  return `${sizePart}${bgPart}`
}
