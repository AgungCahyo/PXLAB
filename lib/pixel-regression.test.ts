import { describe, expect, it } from "vitest"
import {
  compositeLayersToRgba,
  createEmptyLayer,
  floodFill,
  PIXEL_PALETTE,
} from "@/lib/pixel"

function reference(pixels: Uint8ClampedArray, sx: number, sy: number, rgb: number[], w: number, h: number) {
  const key = (x: number, y: number) => (y * w + x) * 4
  const t = [pixels[key(sx, sy)], pixels[key(sx, sy) + 1], pixels[key(sx, sy) + 2]]
  if (t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2]) return 0
  const stack = [[sx, sy]]
  let n = 0
  while (stack.length) {
    const [x, y] = stack.pop()!
    if (x < 0 || y < 0 || x >= w || y >= h) continue
    const i = key(x, y)
    if (pixels[i] !== t[0] || pixels[i + 1] !== t[1] || pixels[i + 2] !== t[2]) continue
    pixels[i] = rgb[0]; pixels[i + 1] = rgb[1]; pixels[i + 2] = rgb[2]; pixels[i + 3] = 255
    n += 1
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return n
}

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

describe("floodFill scanline regression", () => {
  it("matches a naive 4-connected reference on random bitmaps", () => {
    const w = 37
    const h = 29
    for (let seed = 1; seed <= 40; seed += 1) {
      const rnd = seeded(seed)
      const a = new Uint8ClampedArray(w * h * 4)
      for (let i = 0; i < w * h; i += 1) {
        const v = rnd() < 0.62 ? 255 : 0
        a[i * 4] = v; a[i * 4 + 1] = v; a[i * 4 + 2] = v; a[i * 4 + 3] = 255
      }
      const b = new Uint8ClampedArray(a)
      const x = Math.floor(rnd() * w)
      const y = Math.floor(rnd() * h)
      const got = floodFill(a, x, y, [10, 200, 30], w, h)
      const want = reference(b, x, y, [10, 200, 30], w, h)
      expect(got).toBe(want)
      expect(Array.from(a)).toEqual(Array.from(b))
    }
  })

  it("handles a large empty canvas without recursion or stack overflow", () => {
    const w = 1024
    const h = 256
    const px = new Uint8ClampedArray(w * h * 4).fill(255)
    expect(floodFill(px, 0, 0, [1, 2, 3], w, h)).toBe(w * h)
  })

  it("rejects out-of-canvas starts", () => {
    const px = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    expect(floodFill(px, -1, 0, [0, 0, 0], 4, 4)).toBe(0)
    expect(floodFill(px, 4, 0, [0, 0, 0], 4, 4)).toBe(0)
  })
})

describe("compositeLayersToRgba regression", () => {
  it("falls back to paper for indices beyond the palette", () => {
    const w = 2
    const h = 1
    const layer = createEmptyLayer(w, h, "bg")
    layer.indices[0] = 200
    const out = new Uint8ClampedArray(w * h * 4)
    compositeLayersToRgba([layer], out, PIXEL_PALETTE, w, h)
    expect(Array.from(out.slice(0, 4))).toEqual([255, 253, 247, 255])
  })
})
