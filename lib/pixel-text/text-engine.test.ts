import { describe, expect, it, beforeEach } from "vitest"
import { clearTextLayoutCache, layoutText } from "./layout"
import { createTextObject, normalizeTextObject, textObjectsEqual } from "./model"
import { rasterizeTextObject, textDirtyRect } from "./raster"
import { hitTextHandle, pointInTextBox, resizeTextBox } from "./geometry"
import { resolvePixelFont, snapFontSize } from "./fonts"

const W = 64
const H = 64
const lit = (idx: Uint8Array) => idx.reduce((n, v) => n + (v ? 1 : 0), 0)

describe("text object model", () => {
  it("clamps and defaults malformed input instead of rejecting it", () => {
    const t = normalizeTextObject({ text: "hi\r\nthere", width: -5, fontSize: 9999, align: "bogus", color: "red", opacity: 400 })!
    expect(t.text).toBe("hi\nthere")
    expect(t.width).toBe(1)
    expect(t.fontSize).toBe(256)
    expect(t.align).toBe("left")
    expect(t.color).toBe("#20202A")
    expect(t.opacity).toBe(100)
    expect(normalizeTextObject(null)).toBeNull()
    expect(normalizeTextObject("x")).toBeNull()
  })

  it("compares by value so history can share unchanged objects", () => {
    const a = createTextObject({ id: "t1", text: "a" })
    expect(textObjectsEqual(a, { ...a })).toBe(true)
    expect(textObjectsEqual(a, { ...a, text: "b" })).toBe(false)
  })
})

describe("text layout", () => {
  beforeEach(() => clearTextLayoutCache())

  it("wraps at spaces and reflows when only the width changes", () => {
    const base = createTextObject({ text: "aa bb cc dd", width: 200 })
    expect(layoutText(base).lines).toHaveLength(1)
    const narrow = layoutText({ ...base, width: 30 })
    expect(narrow.lines.length).toBeGreaterThan(1)
    // Resizing the box never touches the font size.
    expect(narrow.scale).toBe(layoutText(base).scale)
  })

  it("breaks an over-long word at the edge and keeps one glyph per line minimum", () => {
    const out = layoutText(createTextObject({ text: "WWWWWWWWWW", width: 12 }))
    expect(out.lines.length).toBeGreaterThan(2)
    expect(out.lines.every((l) => l.text.length >= 1)).toBe(true)
  })

  it("lets trailing spaces hang instead of wrapping", () => {
    const t = createTextObject({ text: "ab      ", width: 14 })
    expect(layoutText(t).lines).toHaveLength(1)
  })

  it("keeps blank lines from Enter", () => {
    expect(layoutText(createTextObject({ text: "a\n\nb", width: 100 })).lines).toHaveLength(3)
  })

  it("aligns left, center, right and justifies soft-wrapped lines only", () => {
    const text = "aa bb cc"
    const left = layoutText(createTextObject({ text: "ab", width: 40, align: "left" })).lines[0]!
    const center = layoutText(createTextObject({ text: "ab", width: 40, align: "center" })).lines[0]!
    const right = layoutText(createTextObject({ text: "ab", width: 40, align: "right" })).lines[0]!
    expect(left.glyphs[0]!.x).toBe(0)
    expect(center.glyphs[0]!.x).toBeGreaterThan(0)
    expect(right.glyphs[0]!.x).toBeGreaterThan(center.glyphs[0]!.x)
    const just = layoutText(createTextObject({ text, width: 36, align: "justify" }))
    expect(just.lines.length).toBeGreaterThan(1)
    const first = just.lines[0]!
    expect(first.width).toBe(36)
    const last = just.lines[just.lines.length - 1]!
    expect(last.width).toBeLessThan(36)
  })

  it("positions blocks vertically", () => {
    const top = layoutText(createTextObject({ text: "a", height: 40, verticalAlign: "top" })).lines[0]!.y
    const mid = layoutText(createTextObject({ text: "a", height: 40, verticalAlign: "middle" })).lines[0]!.y
    const bot = layoutText(createTextObject({ text: "a", height: 40, verticalAlign: "bottom" })).lines[0]!.y
    expect(top).toBe(0)
    expect(mid).toBeGreaterThan(top)
    expect(bot).toBeGreaterThan(mid)
  })

  it("reports overflow and snaps pixel-font sizes to whole multiples", () => {
    const out = layoutText(createTextObject({ text: "a\nb\nc\nd", height: 10 }))
    expect(out.overflowY).toBe(true)
    const face = resolvePixelFont("pixel-5x7")
    expect(snapFontSize(face, 10)).toBe(7)
    expect(snapFontSize(face, 11)).toBe(14)
    expect(layoutText(createTextObject({ text: "a", fontSize: 14 })).scale).toBe(2)
  })

  it("falls back to the bundled font for unknown families", () => {
    expect(resolvePixelFont("does-not-exist").id).toBe("pixel-5x7")
  })

  it("is cached by layout inputs only", () => {
    const a = createTextObject({ text: "cache me", width: 80 })
    const moved = { ...a, x: 30, color: "#FF0000", rotation: 20 }
    expect(layoutText(a)).toBe(layoutText(moved))
  })
})

describe("text raster", () => {
  it("draws ink on whole pixels with the requested palette index", () => {
    const t = createTextObject({ text: "A", x: 2, y: 3, width: 20, height: 20 })
    const out = rasterizeTextObject(t, 5, W, H)
    expect(lit(out)).toBeGreaterThan(5)
    expect(new Set(out)).toEqual(new Set([0, 5]))
  })

  it("scales glyphs by integer multiples and does not blur", () => {
    const one = lit(rasterizeTextObject(createTextObject({ text: "I", width: 30, height: 30 }), 1, W, H))
    const two = lit(rasterizeTextObject(createTextObject({ text: "I", width: 30, height: 30, fontSize: 14 }), 1, W, H))
    expect(two).toBe(one * 4)
  })

  it("clips to the box unless overflow is visible", () => {
    const base = { text: "WWWWWWWW", x: 4, y: 4, width: 10, height: 10 }
    const clipped = rasterizeTextObject(createTextObject({ ...base, overflow: "clip" }), 1, W, H)
    expect(createTextObject({}).overflow).toBe("visible")
    const open = rasterizeTextObject(createTextObject({ ...base, overflow: "visible" }), 1, W, H)
    for (let y = 0; y < H; y += 1) for (let x = 14; x < W; x += 1) expect(clipped[y * W + x]).toBe(0)
    expect(lit(open)).toBeGreaterThan(lit(clipped))
  })

  it("bold adds ink and italic keeps the ink count", () => {
    const base = { text: "H", width: 30, height: 30 }
    const normal = lit(rasterizeTextObject(createTextObject(base), 1, W, H))
    expect(lit(rasterizeTextObject(createTextObject({ ...base, fontWeight: "bold" }), 1, W, H))).toBeGreaterThan(normal)
    expect(lit(rasterizeTextObject(createTextObject({ ...base, fontStyle: "italic" }), 1, W, H))).toBe(normal)
  })

  it("rotates 180 degrees as an exact mirror of the unrotated raster", () => {
    const base = { text: "Fy", x: 8, y: 8, width: 24, height: 12 }
    const a = rasterizeTextObject(createTextObject(base), 1, W, H)
    const b = rasterizeTextObject(createTextObject({ ...base, rotation: 180 }), 1, W, H)
    expect(lit(b)).toBe(lit(a))
    // Pixel (x,y) -> (2cx-1-x, 2cy-1-y) with the box centre at (20,14).
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (a[y * W + x]) expect(b[(27 - y) * W + (39 - x)]).toBe(1)
      }
    }
  })

  it("draws nothing for empty or whitespace text and stays on canvas", () => {
    expect(lit(rasterizeTextObject(createTextObject({ text: "   " }), 1, W, H))).toBe(0)
    expect(() => rasterizeTextObject(createTextObject({ text: "edge", x: 60, y: 60 }), 1, W, H)).not.toThrow()
  })

  it("dirty rect covers all ink, including when rotated", () => {
    for (const rotation of [0, 33, 90, 217]) {
      const t = createTextObject({ text: "Hello World", x: 10, y: 20, width: 40, height: 20, rotation })
      const out = rasterizeTextObject(t, 1, W, H)
      const rect = textDirtyRect(t, W, H)!
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          if (!out[y * W + x]) continue
          expect(x).toBeGreaterThanOrEqual(rect.x)
          expect(x).toBeLessThan(rect.x + rect.width)
          expect(y).toBeGreaterThanOrEqual(rect.y)
          expect(y).toBeLessThan(rect.y + rect.height)
        }
      }
    }
  })
})

describe("text box geometry", () => {
  const box = { x: 10, y: 10, width: 20, height: 10, rotation: 0 }
  const limits = { minWidth: 5, minHeight: 5, canvasWidth: 100, canvasHeight: 100 }

  it("east and west handles change width only; north and south change height only", () => {
    expect(resizeTextBox(box, "e", { x: 50, y: 999 }, limits)).toMatchObject({ x: 10, y: 10, width: 40, height: 10 })
    expect(resizeTextBox(box, "w", { x: 0, y: -50 }, limits)).toMatchObject({ x: 0, y: 10, width: 30, height: 10 })
    expect(resizeTextBox(box, "s", { x: 0, y: 40 }, limits)).toMatchObject({ x: 10, y: 10, width: 20, height: 30 })
    expect(resizeTextBox(box, "n", { x: 0, y: 2 }, limits)).toMatchObject({ x: 10, y: 2, width: 20, height: 18 })
  })

  it("corner handles move both axes and enforce minimum size", () => {
    expect(resizeTextBox(box, "se", { x: 60, y: 60 }, limits)).toMatchObject({ width: 50, height: 50 })
    expect(resizeTextBox(box, "nw", { x: 999, y: 999 }, limits)).toMatchObject({ width: 5, height: 5, x: 25, y: 15 })
  })

  it("keeps the dragged edge on the canvas without moving the opposite edge", () => {
    const r = resizeTextBox(box, "e", { x: 500, y: 0 }, limits)
    expect(r.x).toBe(10)
    expect(r.x + r.width).toBe(100)
  })

  it("hit-tests rotated boxes in their own frame", () => {
    const rotated = { x: 10, y: 10, width: 40, height: 10, rotation: 90 }
    expect(pointInTextBox(rotated, { x: 30, y: 15 })).toBe(true)
    expect(pointInTextBox(rotated, { x: 30, y: 33 })).toBe(true)
    expect(pointInTextBox(rotated, { x: 30, y: 40 })).toBe(false)
    expect(pointInTextBox(rotated, { x: 12, y: 15 })).toBe(false)
    expect(hitTextHandle(box, { x: 30, y: 15 }, 1)).toBe("e")
    expect(hitTextHandle(box, { x: 10, y: 10 }, 1)).toBe("nw")
    expect(hitTextHandle(box, { x: 20, y: 15 }, 1)).toBeNull()
  })

  it("resizes a rotated box along its own axes", () => {
    const rotated = { x: 10, y: 10, width: 40, height: 10, rotation: 90 }
    const r = resizeTextBox(rotated, "e", { x: 30, y: 60 }, limits)
    expect(r.height).toBe(10)
    expect(r.width).toBeGreaterThan(40)
  })
})
