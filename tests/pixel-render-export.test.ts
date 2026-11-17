import { describe, expect, it } from "vitest"
import {
  PIXEL_PAPER,
  buildPaletteRgbIndex,
  buildPixelSource,
  hexToRgb,
  indicesToRgba,
  parsePixelSource,
  rgbaToIndices,
  resolveScale,
  rgb24Key,
  snapCssScaleToDevicePixels,
  snapOriginToDevicePixels,
} from "@/lib/pixel"
import { scaleRgbaNearest } from "@/lib/pixel-png-scale"

function paletteSet(palette: readonly string[]) {
  return new Set(palette.map((hex) => {
    const [r, g, b] = hexToRgb(hex)
    return rgb24Key(r, g, b)
  }))
}

function assertRgbaSubsetOfPalette(
  pixels: Uint8ClampedArray,
  palette: readonly string[],
  width: number,
  height: number,
) {
  const allowed = paletteSet(palette)
  let foreign = 0
  const limit = width * height * 4
  for (let i = 0; i < limit; i += 4) {
    const key = rgb24Key(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!)
    if (!allowed.has(key)) foreign += 1
    if (pixels[i + 3] !== 255) foreign += 1
  }
  expect(foreign).toBe(0)
}

describe("pixel render/export stage 0 — colors ⊆ palette", () => {
  it("keeps indices↔rgba round-trip inside the document palette", () => {
    const palette = [PIXEL_PAPER, "#E94B3C", "#59BCEB", "#45A849"]
    const width = 16
    const height = 16
    const indices = new Uint8Array(width * height)
    for (let i = 0; i < indices.length; i += 1) indices[i] = i % palette.length

    const pixels = new Uint8ClampedArray(width * height * 4)
    indicesToRgba(indices, pixels, palette)
    assertRgbaSubsetOfPalette(pixels, palette, width, height)

    const map = buildPaletteRgbIndex(palette)
    const back = rgbaToIndices(pixels, width, height, palette, map)
    expect([...back]).toEqual([...indices])

    const source = buildPixelSource(back, width, height, palette)
    const parsed = parsePixelSource(source)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const again = new Uint8ClampedArray(width * height * 4)
    indicesToRgba(parsed.indices, again, parsed.data.palette)
    assertRgbaSubsetOfPalette(again, parsed.data.palette, width, height)
  })

  it("keeps nearest upscale colors inside the source palette", () => {
    const palette = [PIXEL_PAPER, "#282B35"]
    const width = 8
    const height = 8
    const indices = new Uint8Array(width * height)
    for (let i = 0; i < indices.length; i += 1) indices[i] = i % 2
    const pixels = new Uint8ClampedArray(width * height * 4)
    indicesToRgba(indices, pixels, palette)
    const scaled = scaleRgbaNearest(pixels, width, height, 4)
    assertRgbaSubsetOfPalette(scaled.data, palette, scaled.width, scaled.height)
  })
})

describe("pixel render/export stage 2 — integer device scale", () => {
  it("snaps CSS scale so device cells are integers ≥ 1", () => {
    expect(snapCssScaleToDevicePixels(9.7, 1) * 1).toBe(9)
    expect(snapCssScaleToDevicePixels(0.4, 1)).toBe(1)
    expect(snapCssScaleToDevicePixels(2, 2) * 2).toBe(4)
    expect(snapCssScaleToDevicePixels(1.1, 1.25) * 1.25).toBe(1)
  })

  it("snaps fit resolveScale under fractional DPR", () => {
    const scale = resolveScale("fit", 1000, 640, 64, 64, 1)
    expect(Number.isInteger(scale)).toBe(true)
    expect(scale).toBeGreaterThanOrEqual(1)

    const scaleDpr = resolveScale("fit", 390, 700, 64, 64, 3)
    expect(Math.round(scaleDpr * 3)).toBe(Math.floor(scaleDpr * 3))
    expect(scaleDpr * 3).toBeGreaterThanOrEqual(1)
  })

  it("snaps origin to device pixels", () => {
    const snapped = snapOriginToDevicePixels(10.4, 3.2, 2)
    expect(snapped.originX * 2).toBe(Math.round(10.4 * 2))
    expect(snapped.originY * 2).toBe(Math.round(3.2 * 2))
  })
})
