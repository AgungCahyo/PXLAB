import { describe, expect, it } from "vitest"
import { createEmptyLayer, compositeLayersToRgba, PIXEL_PALETTE, writeRgbaRectToIndices } from "@/lib/pixel"
import { brushDirtyPad, clampDirtyRect, dirtyRectForSegment, unionDirtyRect } from "@/lib/pixel-dirty"

describe("dirty rects", () => {
  it("pads a brush the same way stampBrush reaches", () => {
    expect(brushDirtyPad(1)).toBe(0)
    expect(brushDirtyPad(2)).toBe(1)
    expect(brushDirtyPad(3)).toBe(1)
    expect(brushDirtyPad(4)).toBe(2)
  })

  it("covers a segment, its brush pad, and symmetry mirrors", () => {
    const rect = dirtyRectForSegment(1, 2, 4, 2, 3, 16, 16, "x")
    expect(rect).toEqual({ x: 0, y: 1, width: 16, height: 3 })
  })

  it("drops a segment that cannot touch the canvas", () => {
    expect(dirtyRectForSegment(-8, -8, -4, -6, 1, 16, 16)).toBeNull()
  })

  it("unions and clamps", () => {
    expect(unionDirtyRect({ x: 1, y: 2, width: 2, height: 2 }, { x: 4, y: 0, width: 1, height: 1 })).toEqual({
      x: 1,
      y: 0,
      width: 4,
      height: 4,
    })
    expect(clampDirtyRect({ x: -2, y: 1, width: 4, height: 2 }, 8, 8)).toEqual({ x: 0, y: 1, width: 2, height: 2 })
    expect(clampDirtyRect({ x: 8, y: 0, width: 2, height: 2 }, 8, 8)).toBeNull()
  })
})

describe("partial composite", () => {
  it("matches a full composite inside the rect and leaves the outside alone", () => {
    const w = 8
    const h = 6
    const bottom = createEmptyLayer(w, h, "bottom")
    const top = createEmptyLayer(w, h, "top")
    bottom.indices[w * 2 + 2] = 1
    top.indices[w * 2 + 2] = 2
    top.indices[3] = 3
    const palette = PIXEL_PALETTE
    const full = new Uint8ClampedArray(w * h * 4)
    compositeLayersToRgba([bottom, top], full, palette, w, h)

    top.indices[w * 2 + 2] = 0
    const fullAfter = new Uint8ClampedArray(w * h * 4)
    compositeLayersToRgba([bottom, top], fullAfter, palette, w, h)

    const partial = new Uint8ClampedArray(full)
    const rect = { x: 1, y: 1, width: 3, height: 3 }
    compositeLayersToRgba([bottom, top], partial, palette, w, h, rect)

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const inside = x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height
        const p = (y * w + x) * 4
        const expected = inside ? fullAfter : full
        expect(Array.from(partial.slice(p, p + 4))).toEqual(Array.from(expected.slice(p, p + 4)))
      }
    }
  })

  it("writes only the dirty rectangle back to indices", () => {
    const w = 4
    const h = 3
    const pixels = new Uint8ClampedArray(w * h * 4)
    const [r, g, b] = [255, 92, 92]
    const i = 1 * w + 2
    pixels[i * 4] = r
    pixels[i * 4 + 1] = g
    pixels[i * 4 + 2] = b
    pixels[i * 4 + 3] = 255
    const indices = new Uint8Array(w * h)
    indices.fill(7)
    writeRgbaRectToIndices(pixels, indices, w, h, { x: 2, y: 1, width: 1, height: 1 }, PIXEL_PALETTE)
    expect(indices[i]).not.toBe(7)
    expect(indices[0]).toBe(7)
    expect(indices[i - 1]).toBe(7)
  })

  it("recomposites a small rect much faster than the full frame", () => {
    const w = 512
    const h = 512
    const layers = [0, 1, 2].map((n) => {
      const layer = createEmptyLayer(w, h, `L${n}`)
      layer.indices[1000] = n + 1
      return layer
    })
    const full = new Uint8ClampedArray(w * h * 4)
    const partial = new Uint8ClampedArray(w * h * 4)
    const rect = { x: 40, y: 40, width: 16, height: 16 }
    const time = (run: () => void) => {
      const start = performance.now()
      for (let i = 0; i < 8; i += 1) run()
      return performance.now() - start
    }
    time(() => compositeLayersToRgba(layers, full, PIXEL_PALETTE, w, h))
    time(() => compositeLayersToRgba(layers, partial, PIXEL_PALETTE, w, h, rect))
    const fullMs = time(() => compositeLayersToRgba(layers, full, PIXEL_PALETTE, w, h))
    const rectMs = time(() => compositeLayersToRgba(layers, partial, PIXEL_PALETTE, w, h, rect))
    expect(rectMs).toBeLessThan(fullMs / 4)
  })
})
