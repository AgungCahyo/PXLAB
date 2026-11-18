import { describe, expect, it } from "vitest"
import {
  PIXEL_CANVAS_SIZE,
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  PIXEL_SOURCE_VERSION,
  PIXEL_SOURCE_VERSION_V2,
  buildPixelSource,
  buildPixelSourceV2,
  clientToCell,
  pointerToCell,
  viewDeviceTransform,
  colorUsageFromSource,
  colorUsagePercents,
  compositeLayersToRgba,
  createEmptyLayer,
  createLayerId,
  decodeRle,
  encodeRle,
  blitRect,
  clearRectToPaper,
  constrainSquareEnd,
  ensurePaletteColor,
  extractRect,
  fillPaper,
  fillRect,
  fitScale,
  flattenLayersToIndices,
  flipRectHorizontal,
  floodFill,
  hexToRgb,
  inCanvas,
  indicesToRgba,
  isPixelCanvasSize,
  normalizePixelHex,
  normalizePixelRect,
  paintEllipse,
  parseColorUsage,
  parsePixelSource,
  rgbToHex,
  rgbToPaletteIndex,
  rgbaToIndices,
  removeDocumentColor,
  replaceRgbInPixels,
  rotateClipboardNearest,
  rotateRect90Cw,
  setPixel,
  stampBrush,
  measurePixelTextBox,
  stampText,
  strokeBrushLineSymmetric,
  strokeCubicBezier,
  strokeQuadraticBezier,
  strokeRect,
  strokeRectBrush,
  createBezierAnchor,
  rasterizeCubicPath,
  rasterizePolygon,
  snapCssScaleToDevicePixels,
  stepZoom,
  strokeBrushLine,
  symmetryPoints,
  fillPolygon,
  fillLinearGradient,
  combineSelections,
  densifyStrokeSegment,
  listPointerClientSamples,
  scaleClipboard,
  selectionCombineModeFromModifiers,
  selectionFromColor,
  selectionFromFlood,
  selectionFromPolygon,
  walkLine,
  zoomToward,
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

  it("maps pointer via buffer space matching the view draw transform", () => {
    const dpr = 2.625
    const scale = 4
    const originX = 12.19047619047619 // snapped-ish CSS origin
    const originY = 8
    const { deviceScale, translateX, translateY } = viewDeviceTransform(originX, originY, scale, dpr)
    // Click the visual center of artwork cell (5, 3) in buffer pixels.
    const cellX = 5
    const cellY = 3
    const bufferX = translateX + (cellX + 0.5) * deviceScale
    const bufferY = translateY + (cellY + 0.5) * deviceScale
    // CSS rect disagrees with buffer/dpr (mobile fractional DPR case).
    const rectWidth = 390.4
    const rectHeight = 520.2
    const bufferWidth = 1024
    const bufferHeight = 1365
    const cell = pointerToCell({
      clientX: 40 + (bufferX / bufferWidth) * rectWidth,
      clientY: 80 + (bufferY / bufferHeight) * rectHeight,
      rectLeft: 40,
      rectTop: 80,
      rectWidth,
      rectHeight,
      bufferWidth,
      bufferHeight,
      originX,
      originY,
      scale,
      dpr,
    })
    expect(cell).toEqual({ x: cellX, y: cellY })
  })

  it("keeps corners stable when CSS size ≠ buffer/dpr", () => {
    const dpr = 3
    const scale = 2
    const originX = 10
    const originY = 20
    const { deviceScale, translateX, translateY } = viewDeviceTransform(originX, originY, scale, dpr)
    const rectWidth = 361
    const rectHeight = 361
    const bufferWidth = 1080
    const bufferHeight = 1080
    const samples = [
      { cellX: 0, cellY: 0 },
      { cellX: 15, cellY: 0 },
      { cellX: 0, cellY: 15 },
      { cellX: 15, cellY: 15 },
      { cellX: 7, cellY: 8 },
    ]
    for (const sample of samples) {
      const bufferX = translateX + (sample.cellX + 0.25) * deviceScale
      const bufferY = translateY + (sample.cellY + 0.25) * deviceScale
      const cell = pointerToCell({
        clientX: (bufferX / bufferWidth) * rectWidth,
        clientY: (bufferY / bufferHeight) * rectHeight,
        rectLeft: 0,
        rectTop: 0,
        rectWidth,
        rectHeight,
        bufferWidth,
        bufferHeight,
        originX,
        originY,
        scale,
        dpr,
      })
      expect(cell).toEqual({ x: sample.cellX, y: sample.cellY })
    }
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
    expect(isPixelCanvasSize(1025, 8)).toBe(false)
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

  it("flood-fills a contiguous region and stamps brushes", () => {
    const w = 8
    const h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    setPixel(pixels, 1, 1, [255, 0, 0], w, h)
    setPixel(pixels, 2, 1, [255, 0, 0], w, h)
    expect(floodFill(pixels, 1, 1, [0, 0, 255], w, h)).toBe(2)
    expect(rgbToHex([0, 0, 255])).toBe("#0000FF")
    stampBrush(pixels, 4, 4, [0, 0, 0], 3, w, h)
    expect([pixels[(4 * w + 4) * 4], pixels[(4 * w + 4) * 4 + 1], pixels[(4 * w + 4) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
    const square = new Uint8ClampedArray(w * h * 4)
    fillPaper(square)
    stampBrush(square, 4, 4, [0, 0, 0], 3, w, h, "square")
    expect([square[(3 * w + 3) * 4], square[(3 * w + 3) * 4 + 1], square[(3 * w + 3) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
  })

  it("draws rect and ellipse shapes", () => {
    const w = 16
    const h = 16
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    strokeRect(pixels, 2, 2, 5, 5, [0, 0, 0], w, h)
    expect([pixels[(2 * w + 2) * 4], pixels[(2 * w + 2) * 4 + 1], pixels[(2 * w + 2) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
    fillRect(pixels, 8, 8, 10, 10, [1, 2, 3], w, h)
    expect([pixels[(9 * w + 9) * 4], pixels[(9 * w + 9) * 4 + 1], pixels[(9 * w + 9) * 4 + 2]]).toEqual([
      1, 2, 3,
    ])
    paintEllipse(pixels, 0, 0, 6, 4, [9, 9, 9], true, w, h)
    expect(constrainSquareEnd(0, 0, 5, 2)).toEqual({ x: 5, y: 5 })
  })

  it("strokes rect and ellipse with brush width", () => {
    const w = 24
    const h = 24
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    strokeRectBrush(pixels, 4, 4, 16, 16, [0, 0, 0], 3, w, h)
    expect([pixels[(4 * w + 4) * 4], pixels[(4 * w + 4) * 4 + 1], pixels[(4 * w + 4) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
    expect([pixels[(5 * w + 4) * 4], pixels[(5 * w + 4) * 4 + 1], pixels[(5 * w + 4) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
    fillPaper(pixels)
    paintEllipse(pixels, 2, 2, 18, 18, [7, 7, 7], false, w, h, 3)
    expect([pixels[(2 * w + 10) * 4], pixels[(2 * w + 10) * 4 + 1], pixels[(2 * w + 10) * 4 + 2]]).toEqual([
      7, 7, 7,
    ])
    expect([pixels[(10 * w + 10) * 4], pixels[(10 * w + 10) * 4 + 1], pixels[(10 * w + 10) * 4 + 2]]).toEqual([
      255, 253, 247,
    ])
  })

  it("rasterizes cubic bezier stroke and fill", () => {
    const w = 32
    const h = 32
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    strokeCubicBezier(
      pixels,
      { x: 1, y: 16 },
      { x: 8, y: 1 },
      { x: 24, y: 1 },
      { x: 30, y: 16 },
      [1, 2, 3],
      1,
      w,
      h,
    )
    expect([pixels[(16 * w + 1) * 4], pixels[(16 * w + 1) * 4 + 1], pixels[(16 * w + 1) * 4 + 2]]).toEqual([
      1, 2, 3,
    ])
    expect([pixels[(16 * w + 30) * 4], pixels[(16 * w + 30) * 4 + 1], pixels[(16 * w + 30) * 4 + 2]]).toEqual([
      1, 2, 3,
    ])
    fillPaper(pixels)
    const anchors = [
      createBezierAnchor(4, 4),
      createBezierAnchor(20, 4),
      createBezierAnchor(20, 20),
      createBezierAnchor(4, 20),
    ]
    anchors[0].hoX = 10
    anchors[0].hoY = 4
    anchors[1].hiX = 14
    anchors[1].hiY = 4
    anchors[1].hoX = 20
    anchors[1].hoY = 10
    anchors[2].hiX = 20
    anchors[2].hiY = 14
    anchors[2].hoX = 14
    anchors[2].hoY = 20
    anchors[3].hiX = 10
    anchors[3].hiY = 20
    anchors[3].hoX = 4
    anchors[3].hoY = 14
    anchors[0].hiX = 4
    anchors[0].hiY = 10
    rasterizeCubicPath(pixels, anchors, [9, 9, 9], w, h, { mode: "fill", closed: true })
    expect([pixels[(12 * w + 12) * 4], pixels[(12 * w + 12) * 4 + 1], pixels[(12 * w + 12) * 4 + 2]]).toEqual([
      9, 9, 9,
    ])
  })

  it("rasterizes polygon stroke and fill drafts", () => {
    const w = 16
    const h = 16
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    const points = [
      { x: 2, y: 2 },
      { x: 12, y: 2 },
      { x: 12, y: 12 },
      { x: 2, y: 12 },
    ]
    rasterizePolygon(pixels, points, [3, 4, 5], w, h, { mode: "fill", closed: true })
    expect([pixels[(6 * w + 6) * 4], pixels[(6 * w + 6) * 4 + 1], pixels[(6 * w + 6) * 4 + 2]]).toEqual([
      3, 4, 5,
    ])
    fillPaper(pixels)
    rasterizePolygon(pixels, points, [8, 8, 8], w, h, { mode: "stroke", size: 1, closed: true })
    expect([pixels[(2 * w + 2) * 4], pixels[(2 * w + 2) * 4 + 1], pixels[(2 * w + 2) * 4 + 2]]).toEqual([
      8, 8, 8,
    ])
    expect([pixels[(6 * w + 6) * 4], pixels[(6 * w + 6) * 4 + 1], pixels[(6 * w + 6) * 4 + 2]]).toEqual([
      255, 253, 247,
    ])
  })

  it("fills polygons, curves, text, gradients, and mask selections", () => {
    const w = 16
    const h = 16
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    fillPolygon(pixels, [{ x: 1, y: 1 }, { x: 8, y: 1 }, { x: 1, y: 8 }], [0, 0, 0], w, h)
    expect([pixels[(2 * w + 2) * 4], pixels[(2 * w + 2) * 4 + 1], pixels[(2 * w + 2) * 4 + 2]]).toEqual([
      0, 0, 0,
    ])
    strokeQuadraticBezier(pixels, { x: 0, y: 15 }, { x: 8, y: 0 }, { x: 15, y: 15 }, [1, 2, 3], 1, w, h)
    expect([pixels[(15 * w + 15) * 4], pixels[(15 * w + 15) * 4 + 1], pixels[(15 * w + 15) * 4 + 2]]).toEqual([
      1, 2, 3,
    ])
    fillPaper(pixels)
    stampText(pixels, 1, 1, "A", [9, 8, 7], w, h)
    expect(pixels[(1 * w + 3) * 4]).toBe(9)
    fillPaper(pixels)
    stampText(pixels, 0, 0, "A", [9, 8, 7], w, h)
    stampText(pixels, 8, 0, "a", [9, 8, 7], w, h)
    expect(pixels[2 * 4]).toBe(9)
    expect(pixels[8 * 4]).toBe(255)
    fillPaper(pixels)
    stampText(pixels, 0, 0, "A", [4, 5, 6], w, h, { width: 10, height: 14, scale: 2 })
    expect(pixels[4 * 4]).toBe(4)
    expect(measurePixelTextBox("  Hi  ", 1).text).toBe("Hi")
    expect(measurePixelTextBox("  Hi  ", 1, undefined, { trim: false }).text).toBe("  Hi  ")
    expect(measurePixelTextBox("Hi", 1).width).toBe(11)
    const wrapped = measurePixelTextBox("HelloWorld", 1, 18)
    expect(wrapped.height).toBeGreaterThan(7)
    const point = measurePixelTextBox("HelloWorld", 1)
    expect(point.height).toBe(7)
    fillLinearGradient(pixels, 0, 0, 15, 0, [[0, 0, 0], [255, 255, 255]], w, h)
    expect(pixels[0]).toBe(0)
    expect(pixels[15 * 4]).toBe(255)
    fillPaper(pixels)
    const mask = new Uint8Array(w * h)
    mask[0] = 1
    fillLinearGradient(
      pixels,
      0,
      0,
      15,
      0,
      [[0, 0, 0], [255, 255, 255]],
      w,
      h,
      { x: 0, y: 0, width: w, height: h, mask },
    )
    expect(pixels[0]).toBe(0)
    expect(pixels[4]).not.toBe(0)
    fillPaper(pixels)
    setPixel(pixels, 2, 2, [4, 5, 6], w, h)
    setPixel(pixels, 3, 2, [4, 5, 6], w, h)
    setPixel(pixels, 10, 10, [4, 5, 6], w, h)
    const flood = selectionFromFlood(pixels, 2, 2, w, h)
    expect(flood?.width).toBe(2)
    expect(flood?.mask).toBeUndefined()
    const byColor = selectionFromColor(pixels, 2, 2, w, h)
    expect(byColor?.mask).toBeDefined()
    const lasso = selectionFromPolygon([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 5 }], w, h)
    expect(lasso).not.toBeNull()
  })

  it("extracts, blits, flips, and rotates a rect", () => {
    const w = 8
    const h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    setPixel(pixels, 1, 1, [10, 20, 30], w, h)
    setPixel(pixels, 2, 1, [40, 50, 60], w, h)
    const rect = normalizePixelRect(1, 1, 2, 2)
    const clip = extractRect(pixels, rect, w, h)
    expect(clip.width).toBe(2)
    expect(clip.data[0]).toBe(10)
    clearRectToPaper(pixels, rect, w, h)
    expect([pixels[(1 * w + 1) * 4], pixels[(1 * w + 1) * 4 + 1], pixels[(1 * w + 1) * 4 + 2]]).toEqual(
      hexToRgb("#FFFDF7"),
    )
    blitRect(pixels, clip, 3, 3, w, h)
    expect([pixels[(3 * w + 3) * 4], pixels[(3 * w + 3) * 4 + 1], pixels[(3 * w + 3) * 4 + 2]]).toEqual([
      10, 20, 30,
    ])
    flipRectHorizontal(pixels, { x: 3, y: 3, width: 2, height: 2 }, w, h)
    expect([pixels[(3 * w + 3) * 4], pixels[(3 * w + 3) * 4 + 1], pixels[(3 * w + 3) * 4 + 2]]).toEqual([
      40, 50, 60,
    ])
    const next = rotateRect90Cw(pixels, { x: 3, y: 3, width: 2, height: 2 }, w, h)
    expect(next.width).toBe(2)
    expect(next.height).toBe(2)
  })

  it("mirrors strokes and replaces or removes document colors", () => {
    expect(symmetryPoints(1, 2, 8, 8, "xy")).toEqual([
      { x: 1, y: 2 },
      { x: 6, y: 2 },
      { x: 1, y: 5 },
      { x: 6, y: 5 },
    ])
    const w = 8
    const h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    strokeBrushLineSymmetric(pixels, 1, 1, 1, 1, [1, 2, 3], 1, w, h, "x")
    expect([pixels[(1 * w + 1) * 4], pixels[(1 * w + 6) * 4]]).toEqual([1, 1])
    expect(replaceRgbInPixels(pixels, [1, 2, 3], [9, 9, 9], undefined, w, h)).toBe(2)
    const palette = [PIXEL_PAPER, "#010203", "#090909"]
    setPixel(pixels, 0, 0, hexToRgb("#090909"), w, h)
    const removed = removeDocumentColor(pixels, palette, "#090909", w, h)
    expect("palette" in removed && removed.palette).toEqual([PIXEL_PAPER, "#010203"])
  })

  it("scales clipboard pixels with nearest neighbor", () => {
    const clip = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255, 4, 0, 0, 255,
      ]),
      mask: new Uint8Array([1, 1, 0, 1]),
    }
    const scaled = scaleClipboard(clip, 4, 2)
    expect(scaled.width).toBe(4)
    expect(scaled.height).toBe(2)
    expect(scaled.data[0]).toBe(1)
    expect(scaled.data[8]).toBe(2)
    expect(scaled.mask?.[0]).toBe(1)
    expect(scaled.mask?.[2]).toBe(1)
  })

  it("combines selections with union, subtract, and intersect", () => {
    expect(selectionCombineModeFromModifiers(true, false)).toBe("union")
    expect(selectionCombineModeFromModifiers(false, true)).toBe("subtract")
    expect(selectionCombineModeFromModifiers(true, true)).toBe("intersect")
    const a = { x: 0, y: 0, width: 4, height: 4 }
    const b = { x: 2, y: 2, width: 4, height: 4 }
    const united = combineSelections(a, b, "union", 8, 8)
    expect(united).toEqual({ x: 0, y: 0, width: 6, height: 6, mask: expect.any(Uint8Array) })
    const subtracted = combineSelections(a, b, "subtract", 8, 8)
    expect(subtracted?.width).toBe(4)
    expect(subtracted?.height).toBe(4)
    expect(subtracted?.mask).toBeDefined()
    const intersected = combineSelections(a, b, "intersect", 8, 8)
    expect(intersected).toEqual({ x: 2, y: 2, width: 2, height: 2 })
  })

  it("clips replace, stroke, and flood fill to selection masks", () => {
    const w = 8
    const h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    setPixel(pixels, 1, 1, [7, 7, 7], w, h)
    setPixel(pixels, 2, 1, [7, 7, 7], w, h)
    setPixel(pixels, 1, 2, [7, 7, 7], w, h)
    const mask = new Uint8Array(4)
    mask[0] = 1
    mask[1] = 1
    const clip = { x: 1, y: 1, width: 2, height: 2, mask }
    expect(replaceRgbInPixels(pixels, [7, 7, 7], [1, 2, 3], clip, w, h)).toBe(2)
    expect([pixels[(1 * w + 1) * 4], pixels[(1 * w + 2) * 4], pixels[(2 * w + 1) * 4]]).toEqual([
      1, 1, 7,
    ])
    fillPaper(pixels)
    stampBrush(pixels, 1, 1, [9, 9, 9], 1, w, h, "square", clip)
    stampBrush(pixels, 1, 2, [9, 9, 9], 1, w, h, "square", clip)
    expect(pixels[(1 * w + 1) * 4]).toBe(9)
    expect(pixels[(2 * w + 1) * 4]).toBe(255)
    fillPaper(pixels)
    setPixel(pixels, 1, 1, [4, 4, 4], w, h)
    setPixel(pixels, 2, 1, [4, 4, 4], w, h)
    setPixel(pixels, 1, 2, [4, 4, 4], w, h)
    expect(floodFill(pixels, 1, 1, [5, 5, 5], w, h, clip)).toBe(2)
    expect([pixels[(1 * w + 1) * 4], pixels[(1 * w + 2) * 4], pixels[(2 * w + 1) * 4]]).toEqual([
      5, 5, 4,
    ])
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
    const parsed = parsePixelSource({ ...source, version: 99 })
    expect(parsed).toEqual({ ok: false, error: "unsupported_version" })
  })

  it("promotes v1 to a single layer and round-trips v2", () => {
    const indices = new Uint8Array(16 * 16)
    indices[0] = 2
    indices[1] = 3
    const v1 = buildPixelSource(indices, 16, 16)
    const promoted = parsePixelSource(v1)
    expect(promoted.ok).toBe(true)
    if (!promoted.ok) return
    expect(promoted.layers).toHaveLength(1)
    expect(promoted.layers[0]?.name).toBe("Layer 1")
    expect(promoted.indices[0]).toBe(2)

    const upper = createEmptyLayer(16, 16, "Layer 2")
    upper.indices[5] = 1
    const v2 = buildPixelSourceV2(
      [
        {
          id: createLayerId(),
          name: "Layer 1",
          visible: true,
          locked: false,
          indices,
        },
        upper,
      ],
      16,
      16,
    )
    expect(v2.version).toBe(PIXEL_SOURCE_VERSION_V2)
    const parsed = parsePixelSource(v2)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.version).toBe(2)
    expect(parsed.layers).toHaveLength(2)
    expect(parsed.indices[5]).toBe(1)
    expect(parsed.indices[0]).toBe(2)
  })

  it("composites upper-layer zero as transparent", () => {
    const w = 4
    const h = 4
    const bottom = createEmptyLayer(w, h, "Bottom")
    bottom.indices[0] = 2
    const top = createEmptyLayer(w, h, "Top")
    top.indices[0] = 0
    top.indices[1] = 1
    const flat = flattenLayersToIndices([bottom, top], w, h)
    expect(flat[0]).toBe(2)
    expect(flat[1]).toBe(1)
    const rgba = new Uint8ClampedArray(w * h * 4)
    compositeLayersToRgba([bottom, top], rgba, PIXEL_PALETTE, w, h)
    expect([rgba[0], rgba[1], rgba[2]]).toEqual(hexToRgb(PIXEL_PALETTE[2]!))
    expect([rgba[4], rgba[5], rgba[6]]).toEqual(hexToRgb(PIXEL_PALETTE[1]!))
  })

  it("lists coalesced pointer samples in order and falls back", () => {
    const coalesced = listPointerClientSamples({
      clientX: 9,
      clientY: 9,
      getCoalescedEvents: () => [
        { clientX: 1, clientY: 2 },
        { clientX: 3, clientY: 4 },
        { clientX: 5, clientY: 6 },
      ],
    })
    expect(coalesced).toEqual([
      { clientX: 1, clientY: 2 },
      { clientX: 3, clientY: 4 },
      { clientX: 5, clientY: 6 },
    ])
    expect(
      listPointerClientSamples({
        clientX: 8,
        clientY: 7,
        getCoalescedEvents: () => [],
      }),
    ).toEqual([{ clientX: 8, clientY: 7 }])
    expect(listPointerClientSamples({ clientX: 2, clientY: 3 })).toEqual([{ clientX: 2, clientY: 3 }])
  })

  it("densifies sparse curved stroke segments without rewriting short chords", () => {
    const short = densifyStrokeSegment(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      { x: 2, y: 1 },
    )
    expect(short).toEqual([{ x: 2, y: 1 }])

    const dense = densifyStrokeSegment(
      [
        { x: 0, y: 10 },
        { x: 2, y: 10 },
      ],
      { x: 10, y: 2 },
    )
    expect(dense.length).toBeGreaterThan(1)
    expect(dense[dense.length - 1]).toEqual({ x: 10, y: 2 })
    // Midpoints should arc upward of the chord (incoming horizontal → down-right).
    const mid = dense[Math.floor(dense.length / 2)]!
    const chordY = 10 + ((2 - 10) * (mid.x - 2)) / (10 - 2)
    expect(mid.y).toBeLessThanOrEqual(Math.ceil(chordY) + 1)
  })

  it("rasterizes a fast circular trajectory closer to the path than coarse chords", () => {
    const w = 64
    const h = 64
    const cx = 32
    const cy = 32
    const r = 14
    const fine: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= 48; i += 1) {
      const t = (i / 48) * Math.PI * 2
      fine.push({ x: Math.round(cx + Math.cos(t) * r), y: Math.round(cy + Math.sin(t) * r) })
    }
    // Sparse samples as if coalesced events were dropped.
    const coarse = fine.filter((_, index) => index % 6 === 0 || index === fine.length - 1)

    const paintPath = (samples: Array<{ x: number; y: number }>) => {
      const pixels = new Uint8ClampedArray(w * h * 4)
      fillPaper(pixels)
      const trail: Array<{ x: number; y: number }> = []
      let prev: { x: number; y: number } | null = null
      for (const cell of samples) {
        if (!prev) {
          strokeBrushLine(pixels, cell.x, cell.y, cell.x, cell.y, [1, 2, 3], 1, w, h)
          trail.push(cell)
          prev = cell
          continue
        }
        for (const point of densifyStrokeSegment(trail, cell)) {
          strokeBrushLine(pixels, prev.x, prev.y, point.x, point.y, [1, 2, 3], 1, w, h)
          trail.push(point)
          if (trail.length > 8) trail.splice(0, trail.length - 8)
          prev = point
        }
      }
      return pixels
    }

    const densePaint = paintPath(fine)
    const recovered = paintPath(coarse)
    const chordOnly = (() => {
      const pixels = new Uint8ClampedArray(w * h * 4)
      fillPaper(pixels)
      for (let i = 1; i < coarse.length; i += 1) {
        const a = coarse[i - 1]!
        const b = coarse[i]!
        strokeBrushLine(pixels, a.x, a.y, b.x, b.y, [1, 2, 3], 1, w, h)
      }
      return pixels
    })()

    const ink = (pixels: Uint8ClampedArray) => {
      let count = 0
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 1) count += 1
      return count
    }
    const overlap = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
      let shared = 0
      for (let i = 0; i < a.length; i += 4) if (a[i] === 1 && b[i] === 1) shared += 1
      return shared
    }
    // Recovered sparse path should share more ink with the fine path than pure chords.
    expect(overlap(recovered, densePaint) / ink(densePaint)).toBeGreaterThan(
      overlap(chordOnly, densePaint) / ink(densePaint),
    )
  })

  it("keeps multi-layer composite identical after viewport zoom math", () => {
    const w = 8
    const h = 8
    const bottom = createEmptyLayer(w, h, "Bottom")
    const top = createEmptyLayer(w, h, "Top")
    bottom.indices[0] = 2
    bottom.indices[10] = 3
    top.indices[10] = 1
    top.indices[20] = 4
    const beforeBottom = Uint8Array.from(bottom.indices)
    const beforeTop = Uint8Array.from(top.indices)
    const rgbaA = new Uint8ClampedArray(w * h * 4)
    const rgbaB = new Uint8ClampedArray(w * h * 4)
    compositeLayersToRgba([bottom, top], rgbaA, PIXEL_PALETTE, w, h)
    // Viewport zoom must not rewrite layer pixel data — only camera changes.
    zoomToward({
      originX: 0,
      originY: 0,
      scale: 1,
      nextScale: 4,
      focusX: 40,
      focusY: 40,
    })
    const snapped = snapCssScaleToDevicePixels(4, 2)
    const { deviceScale } = viewDeviceTransform(0, 0, snapped, 2)
    expect(deviceScale).toBe(Math.max(1, Math.floor(snapped * 2 + 1e-9)))
    compositeLayersToRgba([bottom, top], rgbaB, PIXEL_PALETTE, w, h)
    expect([...bottom.indices]).toEqual([...beforeBottom])
    expect([...top.indices]).toEqual([...beforeTop])
    expect([...rgbaB]).toEqual([...rgbaA])
  })

  it("rotateClipboardNearest 90° matches rotateRect90Cw on solid rects", () => {
    const w = 8
    const h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    fillPaper(pixels)
    fillRect(pixels, 2, 2, 4, 3, [10, 20, 30], w, h)
    const rect = { x: 2, y: 2, width: 3, height: 2 }
    const clip = extractRect(pixels, rect, w, h)
    const rotatedClip = rotateClipboardNearest(clip, 90)
    expect(rotatedClip.width).toBe(2)
    expect(rotatedClip.height).toBe(3)

    const viaBoard = new Uint8ClampedArray(pixels)
    const next = rotateRect90Cw(viaBoard, rect, w, h)
    expect(next.width).toBe(2)
    expect(next.height).toBe(3)
    const expected = extractRect(viaBoard, next, w, h)
    expect([...rotatedClip.data]).toEqual([...expected.data])
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
