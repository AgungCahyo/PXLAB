import { describe, expect, it } from "vitest"
import { PIXEL_PAPER, hexToRgb, rgbToHex } from "@/lib/pixel"
import {
  convertRgbaToPixelArt,
  fitInside,
  mergeImportIntoDocumentPalette,
  quantizeColorsMedianCut,
  resizeRgbaNearest,
  resolveImportOutputSize,
  validateImportFile,
} from "@/lib/pixel-import"

function rgbaFromPattern(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y)
      const p = (y * width + x) * 4
      data[p] = r
      data[p + 1] = g
      data[p + 2] = b
      data[p + 3] = a
    }
  }
  return data
}

describe("validateImportFile", () => {
  it("rejects empty and oversized files", () => {
    expect(validateImportFile(new File([], "x.png", { type: "image/png" }))).toBe("empty")
    const big = new File([new Uint8Array(9 * 1024 * 1024)], "big.png", { type: "image/png" })
    expect(validateImportFile(big)).toBe("too_large")
  })

  it("accepts png jpeg webp by type or extension", () => {
    const png = new File([new Uint8Array([1])], "a.png", { type: "image/png" })
    expect(validateImportFile(png)).toBeNull()
    const jpg = new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" })
    expect(validateImportFile(jpg)).toBeNull()
    const webp = new File([new Uint8Array([1])], "a.webp", { type: "image/webp" })
    expect(validateImportFile(webp)).toBeNull()
  })
})

describe("resize + fit", () => {
  it("nearest-neighbor downscales without blending", () => {
    const src = rgbaFromPattern(4, 2, (x) => (x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
    const out = resizeRgbaNearest(src, 4, 2, 2, 1)
    expect([...out.slice(0, 4)]).toEqual([255, 0, 0, 255])
    expect([...out.slice(4, 8)]).toEqual([0, 0, 255, 255])
  })

  it("fits landscape into canvas bounds", () => {
    expect(fitInside(800, 200, 64, 64)).toEqual({ width: 64, height: 16 })
  })

  it("resolves output with aspect lock", () => {
    const size = resolveImportOutputSize(
      {
        width: 100,
        height: 10,
        maintainAspect: true,
        colorCount: 8,
        paletteMode: "reduce",
        dither: "none",
      },
      200,
      100,
      64,
      64,
    )
    expect(size.width / size.height).toBeCloseTo(2, 1)
    expect(size.width).toBeLessThanOrEqual(64)
    expect(size.height).toBeLessThanOrEqual(64)
  })
})

describe("quantize + convert", () => {
  it("median-cut returns up to requested colors", () => {
    const samples = [
      { r: 255, g: 0, b: 0, n: 10 },
      { r: 0, g: 255, b: 0, n: 10 },
      { r: 0, g: 0, b: 255, n: 10 },
      { r: 255, g: 255, b: 0, n: 10 },
    ]
    const colors = quantizeColorsMedianCut(samples, 2)
    expect(colors.length).toBeLessThanOrEqual(2)
  })

  it("converts transparent PNG pixels to index 0", () => {
    const data = rgbaFromPattern(4, 4, (x, y) => {
      if (x === 0 && y === 0) return [233, 75, 60, 255]
      if (x === 1 && y === 0) return [0, 0, 0, 0]
      return [40, 43, 53, 255]
    })
    const result = convertRgbaToPixelArt(
      { data, width: 4, height: 4 },
      {
        width: 4,
        height: 4,
        maintainAspect: false,
        colorCount: 8,
        paletteMode: "reduce",
        dither: "none",
      },
      64,
      64,
    )
    expect(result.palette[0]).toBe(PIXEL_PAPER)
    expect(result.indices[1]).toBe(0)
    expect(result.indices[0]).not.toBe(0)
  })

  it("floyd-steinberg and ordered dither produce indexed output", () => {
    const data = rgbaFromPattern(8, 8, (x, y) => {
      const v = ((x + y) * 18) % 256
      return [v, v, v, 255]
    })
    for (const dither of ["floyd-steinberg", "ordered"] as const) {
      const result = convertRgbaToPixelArt(
        { data, width: 8, height: 8 },
        {
          width: 8,
          height: 8,
          maintainAspect: false,
          colorCount: 4,
          paletteMode: "reduce",
          dither,
        },
        64,
        64,
      )
      expect(result.indices.length).toBe(64)
      expect(result.palette.length).toBeGreaterThan(1)
    }
  })

  it("merges import palette into document without mutating source indices buffer identity wrongly", () => {
    const paper = hexToRgb(PIXEL_PAPER)
    void paper
    const localPalette = [PIXEL_PAPER, rgbToHex([233, 75, 60]), rgbToHex([40, 43, 53])]
    const localIndices = new Uint8Array([1, 0, 2, 1])
    const merged = mergeImportIntoDocumentPalette([PIXEL_PAPER], localPalette, localIndices)
    expect(merged.ok).toBe(true)
    if (!merged.ok) return
    expect(merged.colorsAdded).toBe(2)
    expect(merged.palette.length).toBe(3)
    expect(merged.indices[0]).toBe(1)
    expect(merged.indices[1]).toBe(0)
  })
})
