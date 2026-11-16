import { describe, expect, it } from "vitest"
import {
  PIXEL_CANVAS_SIZE,
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  PIXEL_SOURCE_VERSION,
  buildPixelSource,
  clientToCell,
  colorUsageFromSource,
  colorUsagePercents,
  decodeRle,
  encodeRle,
  ensurePaletteColor,
  fillPaper,
  fitScale,
  hexToRgb,
  inCanvas,
  indicesToRgba,
  isPixelCanvasSize,
  normalizePixelHex,
  parseColorUsage,
  parsePixelSource,
  rgbToPaletteIndex,
  rgbaToIndices,
  setPixel,
  stepZoom,
  walkLine,
} from "@/lib/pixel"

describe("pixel canvas geometry", () => {
  it("keeps cells inside 0..511", () => {
    expect(inCanvas(0, 0)).toBe(true)
    expect(inCanvas(511, 511)).toBe(true)
    expect(inCanvas(-1, 0)).toBe(false)
    expect(inCanvas(512, 10)).toBe(false)
  })

  it("maps the pointer through pan and zoom", () => {
    const cell = clientToCell({
      clientX: 140,
      clientY: 80,
      left: 100,
      top: 40,
      originX: 10,
      originY: 10,
      scale: 2,
    })
    expect(cell).toEqual({ x: 15, y: 15 })
  })

  it("fills gaps on a steep diagonal", () => {
    const visited: string[] = []
    walkLine(0, 0, 3, 6, (x, y) => visited.push(`${x},${y}`))
    expect(visited[0]).toBe("0,0")
    expect(visited.at(-1)).toBe("3,6")
    expect(visited.length).toBeGreaterThanOrEqual(7)
    for (let i = 1; i < visited.length; i += 1) {
      const [x0, y0] = visited[i - 1].split(",").map(Number)
      const [x1, y1] = visited[i].split(",").map(Number)
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBe(1)
    }
  })

  it("steps zoom through discrete levels and fit", () => {
    expect(stepZoom("fit", 1, 0.6)).toBe(1)
    expect(stepZoom(1, 1, 0.6)).toBe(2)
    expect(stepZoom(12, 1, 0.6)).toBe(16)
    expect(stepZoom(48, 1, 0.6)).toBe(48)
    expect(stepZoom(1, -1, 0.6)).toBe("fit")
    expect(stepZoom(4, -1, 3.5)).toBe("fit")
  })

  it("fits a 16×16 work larger than one screen pixel per cell", () => {
    expect(fitScale(320, 320, 16, 16)).toBeGreaterThan(8)
  })

  it("accepts custom landscape sizes and rejects out-of-range sides", () => {
    expect(isPixelCanvasSize(128, 64)).toBe(true)
    expect(isPixelCanvasSize(16, 16)).toBe(true)
    expect(isPixelCanvasSize(7, 16)).toBe(false)
    expect(isPixelCanvasSize(513, 8)).toBe(false)
  })
})

describe("pixel buffer", () => {
  it("starts as paper and paints a bounded pixel", () => {
    const pixels = new Uint8ClampedArray(PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE * 4)
    fillPaper(pixels)
    const [pr, pg, pb] = hexToRgb(PIXEL_PAPER)
    expect([pixels[0], pixels[1], pixels[2], pixels[3]]).toEqual([pr, pg, pb, 255])
    setPixel(pixels, 2, 0, [0, 0, 0])
    expect([pixels[8], pixels[9], pixels[10]]).toEqual([0, 0, 0])
    setPixel(pixels, -1, 0, [255, 0, 0])
    expect(pixels[0]).toBe(pr)
  })
})

describe("pixel editor source", () => {
  it("round-trips rle-index through source json", () => {
    const indices = new Uint8Array(PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE)
    indices[0] = 1
    indices[1] = 1
    indices[10] = 3
    const source = buildPixelSource(indices)
    const parsed = parsePixelSource(source)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.version).toBe(PIXEL_SOURCE_VERSION)
    expect(parsed.indices[0]).toBe(1)
    expect(parsed.indices[1]).toBe(1)
    expect(parsed.indices[10]).toBe(3)
    expect(parsed.indices[2]).toBe(0)
  })

  it("rejects an unknown source version", () => {
    const source = buildPixelSource(new Uint8Array(PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE))
    const parsed = parsePixelSource({ ...source, version: 2 })
    expect(parsed).toEqual({ ok: false, error: "unsupported_version" })
  })

  it("rejects truncated and overlong rle", () => {
    expect(decodeRle([0, PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE - 1], PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE)).toBeNull()
    expect(decodeRle([0, PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE + 1], PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE)).toBeNull()
  })

  it("rejects an out-of-range palette index", () => {
    const cells = PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE
    expect(decodeRle([PIXEL_PALETTE.length, cells], cells, PIXEL_PALETTE.length)).toBeNull()
    expect(decodeRle([PIXEL_DOCUMENT_PALETTE_MAX, cells], cells)).toBeNull()
  })

  it("splits long paper runs at 65535", () => {
    const indices = new Uint8Array(PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE)
    const runs = encodeRle(indices)
    expect(runs[1]).toBe(65535)
    expect(runs.reduce((sum, value, index) => (index % 2 === 1 ? sum + value : sum), 0)).toBe(
      PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE,
    )
  })

  it("maps painted pixels back onto palette indices", () => {
    const pixels = new Uint8ClampedArray(PIXEL_CANVAS_SIZE * PIXEL_CANVAS_SIZE * 4)
    fillPaper(pixels)
    const [r, g, b] = hexToRgb(PIXEL_PALETTE[2])
    setPixel(pixels, 4, 0, [r, g, b])
    expect(rgbaToIndices(pixels)[4]).toBe(2)
  })

  it("round-trips a 16×16 source without assuming 512", () => {
    const indices = new Uint8Array(16 * 16)
    indices[5] = 4
    const source = buildPixelSource(indices, 16, 16)
    const parsed = parsePixelSource(source)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.width).toBe(16)
    expect(parsed.data.height).toBe(16)
    expect(parsed.indices.length).toBe(256)
    expect(parsed.indices[5]).toBe(4)
  })

  it("round-trips a 128×64 landscape source", () => {
    const indices = new Uint8Array(128 * 64)
    indices[127] = 2
    const parsed = parsePixelSource(buildPixelSource(indices, 128, 64))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.indices[127]).toBe(2)
    expect(parsed.indices.length).toBe(8192)
  })

  it("normalizes free hex and rejects shorthand", () => {
    expect(normalizePixelHex("#00aaff")).toBe("#00AAFF")
    expect(normalizePixelHex("ff5c5c")).toBe("#FF5C5C")
    expect(normalizePixelHex("#FFF")).toBeNull()
    expect(normalizePixelHex("red")).toBeNull()
  })

  it("appends a custom color without remapping drawn indices", () => {
    const palette = [PIXEL_PAPER, "#FF5C5C"]
    const indices = new Uint8Array(16)
    indices[0] = 1
    const next = ensurePaletteColor(palette, "#00aaff")
    expect("index" in next && next.index).toBe(2)
    if (!("palette" in next)) return
    expect(next.palette).toEqual([PIXEL_PAPER, "#FF5C5C", "#00AAFF"])
    expect(indices[0]).toBe(1)
    const pixels = new Uint8ClampedArray(16 * 4)
    indicesToRgba(indices, pixels, next.palette)
    expect([pixels[0], pixels[1], pixels[2]]).toEqual(hexToRgb("#FF5C5C"))
    const [r, g, b] = hexToRgb("#00AAFF")
    expect(rgbToPaletteIndex(r, g, b, next.palette)).toBe(2)
  })

  it("round-trips a custom document color in source json", () => {
    const palette = [PIXEL_PAPER, "#112233"]
    const indices = new Uint8Array(16 * 16)
    indices[3] = 1
    const parsed = parsePixelSource(buildPixelSource(indices, 16, 16, palette))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.palette).toEqual(palette)
    expect(parsed.indices[3]).toBe(1)
    const pixels = new Uint8ClampedArray(16 * 16 * 4)
    indicesToRgba(parsed.indices, pixels, parsed.data.palette)
    expect(rgbaToIndices(pixels, 16, 16, parsed.data.palette)[3]).toBe(1)
  })

  it("reuses an existing slot instead of replacing it", () => {
    const palette = [PIXEL_PAPER, "#00AAFF"]
    const again = ensurePaletteColor(palette, "#00aaff")
    expect("index" in again && again.index).toBe(1)
    if (!("palette" in again)) return
    expect(again.palette).toHaveLength(2)
  })

  it("refuses a 65th unique color", () => {
    const palette = [PIXEL_PAPER]
    for (let i = 1; i < PIXEL_DOCUMENT_PALETTE_MAX; i += 1) {
      const hex = `#${i.toString(16).padStart(6, "0")}`.toUpperCase()
      const result = ensurePaletteColor(palette, hex)
      expect("palette" in result).toBe(true)
      if ("palette" in result) palette.splice(0, palette.length, ...result.palette)
    }
    expect(palette).toHaveLength(PIXEL_DOCUMENT_PALETTE_MAX)
    expect(ensurePaletteColor(palette, "#ABCDEF")).toEqual({ error: "palette_full" })
  })
})

describe("color usage from RLE", () => {
  it("excludes Paper and sorts by count", () => {
    const palette = [PIXEL_PAPER, "#FF5C5C", "#55B8FF"]
    // 4×4 = 16 pixels: 10 paper, 4 blue, 2 red
    const runs = [0, 10, 2, 4, 1, 2]
    const usage = colorUsageFromSource({ palette, runs })
    expect(usage).toEqual([
      { hex: "#55B8FF", count: 4 },
      { hex: "#FF5C5C", count: 2 },
    ])
    expect(colorUsagePercents(usage)).toEqual([67, 33])
  })

  it("returns an empty list when the canvas is only Paper", () => {
    const usage = colorUsageFromSource({
      palette: [PIXEL_PAPER],
      runs: [0, 64],
    })
    expect(usage).toEqual([])
    expect(parseColorUsage([])).toEqual([])
    expect(parseColorUsage(null)).toBeNull()
  })
})
