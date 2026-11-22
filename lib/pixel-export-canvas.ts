"use client"

import { ExportError, type RasterEncoder } from "@/lib/pixel-export-engine"

/**
 * Browser raster encoder for the export engine (PNG / JPEG / WebP through a canvas).
 * Browsers silently fall back to PNG for a format they cannot encode (older Safari has no WebP
 * encoder); that is detected by the returned MIME type and reported as an "encode" error so the
 * UI can say so instead of saving a PNG under a .webp name.
 */
export const canvasRasterEncoder: RasterEncoder = async (rgba, width, height, mime, quality) => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new ExportError("encode")
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, mime === "image/png" ? undefined : quality),
  )
  if (!blob || blob.type !== mime) throw new ExportError("encode")
  return new Uint8Array(await blob.arrayBuffer())
}
