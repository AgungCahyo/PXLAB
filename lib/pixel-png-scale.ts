import { PIXEL_CANVAS_MAX } from "@/lib/pixel"

/** Max integer scale so both edges stay ≤ PIXEL_CANVAS_MAX (512). */
export function maxDownloadScale(width: number, height: number): number {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const edge = Math.max(w, h)
  return Math.max(1, Math.floor(PIXEL_CANVAS_MAX / edge))
}

/**
 * Download scale choices: 1× and powers of two up to maxDownloadScale.
 * Never offers a size larger than 512 on either edge.
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
  if (outW > PIXEL_CANVAS_MAX || outH > PIXEL_CANVAS_MAX) return { ok: false, reason: "bounds" }
  if (scale > maxDownloadScale(width, height)) return { ok: false, reason: "bounds" }
  return { ok: true, outW, outH }
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
  if (outW > PIXEL_CANVAS_MAX || outH > PIXEL_CANVAS_MAX) throw new Error("bounds")
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

/**
 * Nearest-neighbor upscale for download only. Does not mutate stored cover/source.
 * Uses explicit pixel replication (not drawImage scaling) so RGB stays exact.
 */
export async function scalePngNearest(source: Blob, scale: number): Promise<Blob> {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error("scale")
  }
  if (scale === 1) return source

  const bitmap = await createImageBitmap(source)
  try {
    const srcW = bitmap.width
    const srcH = bitmap.height
    const allowed = assertDownloadScaleAllowed(srcW, srcH, scale)
    if (!allowed.ok) throw new Error(allowed.reason)

    const srcCanvas = makeCanvas(srcW, srcH)
    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true }) as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!srcCtx) throw new Error("context")
    srcCtx.drawImage(bitmap, 0, 0)
    const srcImage = srcCtx.getImageData(0, 0, srcW, srcH)

    const scaled = scaleRgbaNearest(srcImage.data, srcW, srcH, scale)
    const outCanvas = makeCanvas(scaled.width, scaled.height)
    const outCtx = outCanvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!outCtx) throw new Error("context")
    const imageData = new ImageData(scaled.width, scaled.height)
    imageData.data.set(scaled.data)
    outCtx.putImageData(imageData, 0, 0)
    return canvasToPngBlob(outCanvas)
  } finally {
    bitmap.close()
  }
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
