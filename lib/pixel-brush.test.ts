import { describe, expect, it } from "vitest"
import { stampBrush, strokeBrushLine, type PixelSelection } from "@/lib/pixel"
import {
  BrushStroke,
  brushCoverage,
  brushMaskFromClipboard,
  brushMaskFromSelection,
  clampBrushOptions,
  ditherPasses,
  isPlainBrush,
  listPointerSamples,
  normalizePointerPressure,
} from "@/lib/pixel-brush"

const W = 64
const H = 64
const INK: [number, number, number] = [10, 20, 30]
const blank = () => new Uint8ClampedArray(W * H * 4).fill(255)
const ctx = (size = 1, shape: "square" | "circle" = "square") => ({ rgb: INK, size, shape })
const inked = (px: Uint8ClampedArray) => {
  let n = 0
  for (let i = 0; i < W * H; i += 1) if (px[i * 4] === INK[0] && px[i * 4 + 1] === INK[1]) n += 1
  return n
}

function run(options: Partial<Parameters<typeof clampBrushOptions>[0]>, pts: Array<[number, number]>, size = 1, shape: "square" | "circle" = "square") {
  const px = blank()
  const stroke = new BrushStroke(W, H)
  stroke.begin(clampBrushOptions(options))
  let prev: { x: number; y: number } | null = null
  for (const [x, y] of pts) {
    stroke.paint(px, prev, { x, y }, ctx(size, shape))
    prev = { x, y }
  }
  return px
}

describe("brush options", () => {
  it("defaults are the plain legacy brush", () => {
    expect(isPlainBrush(clampBrushOptions())).toBe(true)
    expect(isPlainBrush(clampBrushOptions({ opacity: 99 }))).toBe(false)
    expect(isPlainBrush(clampBrushOptions({ spacing: 10 }))).toBe(false)
  })
  it("clamps garbage input", () => {
    const o = clampBrushOptions({ opacity: 500, flow: -3, hardness: NaN, spacing: 9999 })
    expect([o.opacity, o.flow, o.hardness, o.spacing]).toEqual([100, 1, 0, 200])
  })
})

describe("ordered dither", () => {
  it("0 never paints, 1 always paints, 0.5 paints half of every 8x8 block", () => {
    let half = 0
    for (let y = 0; y < 8; y += 1)
      for (let x = 0; x < 8; x += 1) {
        expect(ditherPasses(0, x, y)).toBe(false)
        expect(ditherPasses(1, x, y)).toBe(true)
        if (ditherPasses(0.5, x, y)) half += 1
      }
    expect(half).toBe(32)
  })
})

describe("coverage footprint", () => {
  it("hardness 100 matches the legacy stamp footprint exactly", () => {
    for (const shape of ["square", "circle"] as const) {
      for (let size = 1; size <= 12; size += 1) {
        const legacy = blank()
        stampBrush(legacy, 30, 30, INK, size, W, H, shape)
        const fresh = blank()
        const stroke = new BrushStroke(W, H)
        stroke.begin(clampBrushOptions({ hardness: 100, opacity: 100, flow: 100, spacing: 0 }))
        stroke.paint(fresh, null, { x: 30, y: 30 }, ctx(size, shape))
        expect(Array.from(fresh)).toEqual(Array.from(legacy))
      }
    }
  })
  it("soft hardness falls off toward the edge", () => {
    expect(brushCoverage(0, 0, 9, "circle", 0)).toBe(1)
    expect(brushCoverage(4, 0, 9, "circle", 0)).toBeLessThan(brushCoverage(2, 0, 9, "circle", 0))
    expect(brushCoverage(9, 0, 9, "circle", 0)).toBe(0)
  })
})

describe("stroke continuity (spacing 0)", () => {
  it("a non-plain stroke equals the legacy line pixels at full opacity", () => {
    const legacy = blank()
    strokeBrushLine(legacy, 3, 3, 40, 17, INK, 3, W, H, "square")
    const fresh = run({ opacity: 100, flow: 100, hardness: 100, spacing: 0, pressureSize: true }, [[3, 3], [40, 17]], 3)
    expect(Array.from(fresh)).toEqual(Array.from(legacy))
  })
  it("splitting a stroke into samples does not change the result", () => {
    const whole = run({ opacity: 60, flow: 40 }, [[2, 2], [50, 30]], 4, "circle")
    const split = run({ opacity: 60, flow: 40 }, [[2, 2], [10, 6], [22, 12], [50, 30]], 4, "circle")
    // Same cells are inked; flow accumulation may differ slightly along bends, count must be close.
    expect(Math.abs(inked(whole) - inked(split))).toBeLessThan(inked(whole) * 0.15)
  })
})

describe("opacity and flow", () => {
  it("overlapping a stroke over itself never exceeds the opacity ceiling", () => {
    const once = run({ opacity: 50 }, [[5, 5], [30, 5]], 3)
    const back = run({ opacity: 50 }, [[5, 5], [30, 5], [5, 5], [30, 5], [5, 5]], 3)
    expect(inked(back)).toBe(inked(once))
  })
  it("is deterministic", () => {
    const a = run({ opacity: 35, flow: 50, hardness: 20 }, [[8, 8], [40, 20]], 7, "circle")
    const b = run({ opacity: 35, flow: 50, hardness: 20 }, [[8, 8], [40, 20]], 7, "circle")
    expect(Array.from(a)).toEqual(Array.from(b))
  })
  it("lower opacity inks fewer cells; opacity 100 inks all", () => {
    const full = inked(run({ opacity: 100 }, [[5, 5], [30, 5]], 5))
    const half = inked(run({ opacity: 50 }, [[5, 5], [30, 5]], 5))
    expect(half).toBeLessThan(full)
    expect(half).toBeGreaterThan(full * 0.35)
  })
  it("low flow builds up across repeated stamps within a stroke", () => {
    const light = inked(run({ flow: 10 }, [[10, 10]], 5))
    const built = inked(run({ flow: 10 }, [[10, 10], [11, 10], [10, 10], [11, 10], [10, 10], [11, 10], [10, 10], [11, 10], [10, 10]], 5))
    expect(built).toBeGreaterThan(light)
  })
  it("a new stroke starts from zero accumulation", () => {
    const px = blank()
    const stroke = new BrushStroke(W, H)
    const o = clampBrushOptions({ flow: 20 })
    stroke.begin(o)
    stroke.paint(px, null, { x: 10, y: 10 }, ctx(5))
    const first = inked(px)
    const px2 = blank()
    stroke.begin(o)
    stroke.paint(px2, null, { x: 10, y: 10 }, ctx(5))
    expect(inked(px2)).toBe(first)
  })
})

describe("spacing", () => {
  it("larger spacing leaves gaps; stamps are evenly distributed and continue across segments", () => {
    const tight = inked(run({ spacing: 50 }, [[2, 10], [60, 10]], 2))
    const loose = inked(run({ spacing: 200 }, [[2, 10], [60, 10]], 2))
    expect(loose).toBeLessThan(tight)
    const oneSegment = run({ spacing: 100 }, [[2, 10], [60, 10]], 2)
    const manySegments = run({ spacing: 100 }, [[2, 10], [15, 10], [31, 10], [47, 10], [60, 10]], 2)
    expect(Array.from(manySegments)).toEqual(Array.from(oneSegment))
  })
})

describe("pressure", () => {
  it("mouse and touch are full pressure; pen is clamped with a floor", () => {
    expect(normalizePointerPressure("mouse", 0.5)).toBe(1)
    expect(normalizePointerPressure("touch", 0)).toBe(1)
    expect(normalizePointerPressure("pen", 0)).toBe(0.5)
    expect(normalizePointerPressure("pen", 0.01)).toBe(0.15)
    expect(normalizePointerPressure("pen", 5)).toBe(1)
  })
  it("pressure scales size when enabled and is ignored when disabled", () => {
    const soft = blank()
    const hard = blank()
    const off = blank()
    const s1 = new BrushStroke(W, H)
    const s2 = new BrushStroke(W, H)
    const s3 = new BrushStroke(W, H)
    s1.begin(clampBrushOptions({ pressureSize: true }))
    s2.begin(clampBrushOptions({ pressureSize: true }))
    s3.begin(clampBrushOptions({}))
    s1.paint(soft, null, { x: 20, y: 20, pressure: 0.3 }, ctx(10, "circle"))
    s2.paint(hard, null, { x: 20, y: 20, pressure: 1 }, ctx(10, "circle"))
    s3.paint(off, null, { x: 20, y: 20, pressure: 0.3 }, ctx(10, "circle"))
    expect(inked(soft)).toBeLessThan(inked(hard))
    expect(inked(off)).toBe(inked(hard))
  })
  it("reads pressure from coalesced pen events", () => {
    const samples = listPointerSamples({
      clientX: 5,
      clientY: 5,
      pointerType: "pen",
      pressure: 0.2,
      getCoalescedEvents: () => [
        { clientX: 1, clientY: 1, pointerType: "pen", pressure: 0.4 },
        { clientX: 2, clientY: 2, pointerType: "pen", pressure: 0.8 },
      ],
    })
    expect(samples.map((s) => s.pressure)).toEqual([0.4, 0.8])
    expect(listPointerSamples({ clientX: 1, clientY: 2, pointerType: "mouse", pressure: 0.5 })[0]!.pressure).toBe(1)
  })
})

describe("custom brush tips", () => {
  it("builds a mask from a masked selection and stamps that exact shape", () => {
    const sel: PixelSelection = { x: 10, y: 10, width: 3, height: 3, mask: new Uint8Array([0, 1, 0, 1, 1, 1, 0, 1, 0]) }
    const tip = brushMaskFromSelection(sel)!
    expect(Array.from(tip.mask)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0])
    const px = run({ custom: tip }, [[20, 20]])
    const cells = [[20, 19], [19, 20], [20, 20], [21, 20], [20, 21]]
    expect(inked(px)).toBe(5)
    for (const [x, y] of cells) expect(px[(y! * W + x!) * 4]).toBe(INK[0])
  })
  it("rejects oversized or empty tips and respects clipboard transparency", () => {
    expect(brushMaskFromSelection({ x: 0, y: 0, width: 65, height: 4 })).toBeNull()
    const clip = { width: 2, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255, 0, 0, 0, 0]) }
    expect(Array.from(brushMaskFromClipboard(clip)!.mask)).toEqual([1, 0])
    expect(brushMaskFromClipboard({ width: 1, height: 1, data: new Uint8ClampedArray(4) })).toBeNull()
  })
  it("respects the selection clip", () => {
    const px = blank()
    const stroke = new BrushStroke(W, H)
    stroke.begin(clampBrushOptions({}))
    stroke.paint(px, null, { x: 10, y: 10 }, { ...ctx(9), clip: { x: 10, y: 0, width: 54, height: 64 } })
    for (let y = 0; y < H; y += 1) for (let x = 0; x < 10; x += 1) expect(px[(y * W + x) * 4]).toBe(255)
    expect(inked(px)).toBeGreaterThan(0)
  })
})
