import { describe, expect, it } from "vitest"
import { floodFill, replaceMatchingColor } from "@/lib/pixel"
import { PIXEL_FILL_PATTERNS, isPixelFillPattern, patternHit, type PixelFillPattern } from "@/lib/pixel-pattern"

const W = 24
const H = 16
const INK: [number, number, number] = [10, 20, 30]

const blank = () => new Uint8ClampedArray(W * H * 4).fill(255)
const isInk = (px: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * W + x) * 4
  return px[i] === INK[0] && px[i + 1] === INK[1] && px[i + 2] === INK[2]
}
const inkCount = (px: Uint8ClampedArray) => {
  let n = 0
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (isInk(px, x, y)) n += 1
  return n
}

describe("pattern coverage", () => {
  const share = (p: PixelFillPattern, w = 8, h = 8) => {
    let n = 0
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (patternHit(p, x, y)) n += 1
    return n / (w * h)
  }
  it("has the intended density", () => {
    expect(share("solid")).toBe(1)
    expect(share("checker")).toBe(0.5)
    expect(share("dots")).toBe(0.25)
    expect(share("dither25")).toBe(0.25)
    expect(share("dither75")).toBe(0.75)
    expect(share("lines-h")).toBe(0.5)
    expect(share("lines-v")).toBe(0.5)
    expect(share("diagonal")).toBe(0.25)
    expect(share("crosshatch", 8, 8)).toBe(1 - (3 * 3 * 4) / 64) // cells with neither x%4 nor y%4 == 0: 3x3 per 4x4
  })

  it("is anchored to canvas coordinates and periodic, including negative coordinates", () => {
    for (const p of PIXEL_FILL_PATTERNS) {
      for (let y = -9; y < 9; y += 1)
        for (let x = -9; x < 9; x += 1) {
          expect(patternHit(p, x, y)).toBe(patternHit(p, x + 8, y + 8))
        }
    }
  })

  it("dither25 is a subset of dither75 (patterns nest like real ordered dither)", () => {
    for (let y = 0; y < 8; y += 1)
      for (let x = 0; x < 8; x += 1) if (patternHit("dither25", x, y)) expect(patternHit("dither75", x, y)).toBe(true)
  })

  it("recognises valid names only", () => {
    expect(PIXEL_FILL_PATTERNS.every(isPixelFillPattern)).toBe(true)
    expect(isPixelFillPattern("plaid")).toBe(false)
  })
})

describe("pattern flood fill", () => {
  it("solid pattern is the same as the default", () => {
    const a = blank()
    const b = blank()
    floodFill(a, 3, 3, INK, W, H)
    floodFill(b, 3, 3, INK, W, H, null, 0, null, "solid")
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it("paints exactly the region cells that hit the pattern and leaves the rest alone", () => {
    for (const pattern of PIXEL_FILL_PATTERNS) {
      const px = blank()
      // wall: a closed box so the region is a known rectangle
      for (let x = 4; x <= 15; x += 1) {
        for (const y of [3, 10]) px.set([0, 0, 0, 255], (y * W + x) * 4)
      }
      for (let y = 3; y <= 10; y += 1) {
        for (const x of [4, 15]) px.set([0, 0, 0, 255], (y * W + x) * 4)
      }
      const before = new Uint8ClampedArray(px)
      const painted = floodFill(px, 8, 6, INK, W, H, null, 0, null, pattern)
      let expected = 0
      for (let y = 0; y < H; y += 1)
        for (let x = 0; x < W; x += 1) {
          const inside = x > 4 && x < 15 && y > 3 && y < 10
          const i = (y * W + x) * 4
          if (inside && patternHit(pattern, x, y)) {
            expect(isInk(px, x, y), `${pattern} ${x},${y}`).toBe(true)
            expected += 1
          } else {
            expect(Array.from(px.slice(i, i + 4)), `${pattern} untouched ${x},${y}`).toEqual(Array.from(before.slice(i, i + 4)))
          }
        }
      expect(painted).toBe(expected)
    }
  })

  it("the region is not cut up by the pattern (cells between pattern hits still belong to the fill)", () => {
    const px = blank()
    // one thin corridor 1 cell wide and 12 long; checker would hit every other cell
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) px.set([0, 0, 0, 255], (y * W + x) * 4)
    for (let x = 2; x < 14; x += 1) px.set([255, 255, 255, 255], (5 * W + x) * 4)
    const painted = floodFill(px, 2, 5, INK, W, H, null, 0, null, "checker")
    expect(painted).toBe(6)
    expect(inkCount(px)).toBe(6)
  })

  it("respects tolerance, selection clip, and the already-that-colour early exit", () => {
    const px = blank()
    px.set([250, 255, 255, 255], (2 * W + 2) * 4) // slightly off white
    const loose = floodFill(new Uint8ClampedArray(px), 0, 0, INK, W, H, null, 10, null, "checker")
    const strict = floodFill(new Uint8ClampedArray(px), 0, 0, INK, W, H, null, 0, null, "checker")
    expect(loose).toBeGreaterThan(strict)
    const clipped = blank()
    const n = floodFill(clipped, 0, 0, INK, W, H, { x: 0, y: 0, width: 6, height: 4 }, 0, null, "dots")
    expect(n).toBe(3 * 2)
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) if (isInk(clipped, x, y)) expect(x < 6 && y < 4).toBe(true)
    const same = blank().map((_, i) => (i % 4 === 3 ? 255 : 0)) as unknown as Uint8ClampedArray
    expect(floodFill(same, 0, 0, [0, 0, 0], W, H, null, 0, null, "checker")).toBe(0)
  })

  it("two neighbouring pattern fills tile seamlessly", () => {
    const px = blank()
    for (let y = 0; y < H; y += 1) px.set([0, 0, 0, 255], (y * W + 12) * 4) // wall at x=12
    floodFill(px, 2, 2, INK, W, H, null, 0, null, "dither25")
    floodFill(px, 20, 2, INK, W, H, null, 0, null, "dither25")
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) if (x !== 12) expect(isInk(px, x, y)).toBe(patternHit("dither25", x, y))
  })
})

describe("pattern global replace", () => {
  it("replaces only matching cells that hit the pattern", () => {
    const px = blank()
    const painted = replaceMatchingColor(px, 0, 0, INK, W, H, null, 0, null, "lines-h")
    expect(painted).toBe(W * (H / 2))
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) expect(isInk(px, x, y)).toBe(y % 2 === 0)
  })
})
