import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { PIXEL_PAPER, PIXEL_PALETTE, hexToRgb, rgbToHex } from "@/lib/pixel"
import {
  convertRgbaToPixelArt,
  fitInside,
  indexedImportToRgba,
  mergeImportIntoDocumentPalette,
  quantizeColorsMedianCut,
  resizeRgbaNearest,
  resolveImportForDocument,
  resolveImportOutputSize,
  validateImportFile,
} from "@/lib/pixel-import"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

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

describe("preview RGBA === layer import RGBA", () => {
  it("indexedImportToRgba matches palette hex bytes and keeps transparency", () => {
    const red = rgbToHex([233, 75, 60])
    const ink = rgbToHex([40, 43, 53])
    const palette = [PIXEL_PAPER, red, ink]
    const indices = new Uint8Array([1, 0, 2, 1])
    const rgba = indexedImportToRgba(indices, 2, 2, palette)
    expect([...rgba.slice(0, 4)]).toEqual([233, 75, 60, 255])
    expect([...rgba.slice(4, 8)]).toEqual([0, 0, 0, 0])
    expect([...rgba.slice(8, 12)]).toEqual([40, 43, 53, 255])
    expect([...rgba.slice(12, 16)]).toEqual([233, 75, 60, 255])
  })

  it("resolveImportForDocument preview bytes equal board commit merge bytes", () => {
    const data = rgbaFromPattern(8, 8, (x, y) => {
      if ((x + y) % 5 === 0) return [0, 0, 0, 0]
      if (x < 4) return [233, 75, 60, 255]
      if (y < 4) return [55, 184, 255, 255]
      return [40, 43, 53, 255]
    })
    const local = convertRgbaToPixelArt(
      { data, width: 8, height: 8 },
      {
        width: 8,
        height: 8,
        maintainAspect: false,
        colorCount: 8,
        paletteMode: "reduce",
        dither: "none",
      },
      64,
      64,
    )
    const doc = [...PIXEL_PALETTE]
    // Dialog preview path.
    const preview = resolveImportForDocument(local, doc)
    const previewRgba = indexedImportToRgba(
      preview.indices,
      preview.width,
      preview.height,
      preview.palette,
    )
    // Board.importPixelArtLayer path (confirm still sends local convert result).
    const boardMerge = mergeImportIntoDocumentPalette(doc, local.palette, local.indices)
    expect(boardMerge.ok).toBe(true)
    if (!boardMerge.ok) return
    const layerRgba = indexedImportToRgba(
      boardMerge.indices,
      local.width,
      local.height,
      boardMerge.palette,
    )
    expect(previewRgba.length).toBe(layerRgba.length)
    expect([...previewRgba]).toEqual([...layerRgba])
  })

  it("preserves exact RGBA through convert → resolve for opaque and transparent pixels", () => {
    const data = rgbaFromPattern(4, 4, (x, y) => {
      if (x === 0 && y === 0) return [255, 92, 92, 255]
      if (x === 1 && y === 0) return [0, 0, 0, 0]
      if (x === 2 && y === 0) return [168, 224, 95, 255]
      return [32, 32, 42, 255]
    })
    const local = convertRgbaToPixelArt(
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
      [...PIXEL_PALETTE],
    )
    const resolved = resolveImportForDocument(local, [...PIXEL_PALETTE])
    const rgba = indexedImportToRgba(
      resolved.indices,
      resolved.width,
      resolved.height,
      resolved.palette,
    )
    for (let i = 0; i < resolved.indices.length; i += 1) {
      const index = resolved.indices[i]!
      const p = i * 4
      if (index === 0) {
        expect(rgba[p + 3]).toBe(0)
        continue
      }
      const [r, g, b] = hexToRgb(resolved.palette[index]!)
      expect([rgba[p], rgba[p + 1], rgba[p + 2], rgba[p + 3]]).toEqual([r, g, b, 255])
    }
  })

  it("dialog preview and board commit share resolveImportForDocument; preview avoids drawImage upscale", () => {
    const dialog = read("components/creations/ImportPixelArtDialog.tsx")
    const lib = read("lib/pixel-import.ts")
    expect(dialog).toMatch(/resolveImportForDocument/)
    expect(dialog).toMatch(/indicesToPreviewDataUrl/)
    expect(lib).toMatch(/indexedImportToRgba/)
    expect(lib).toMatch(/putImageData/)
    expect(lib).not.toMatch(/drawImage\(temp/)
  })
})
