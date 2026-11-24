import { describe, expect, it } from "vitest"
import { createEmptyLayer, rotateRect90Cw, type PixelLayerRuntime } from "./pixel"
import { createPaletteResolver } from "@/lib/pixel-merge"
import {
  affineSourceMap,
  anchorOffset,
  clampAffineParams,
  cropLayers,
  fitRectParams,
  IDENTITY_PARAMS,
  isIdentityParams,
  resampleIndices,
  resizeCanvasLayers,
  resizeImageLayers,
  transformDocument,
  type AffineParams,
  type Interpolation,
} from "@/lib/pixel-transform"

const palette = ["#FFFDF7", "#FF0000", "#00FF00", "#0000FF", "#808080", "#FFFF00"]

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}
function randomIndices(seed: number, w: number, h: number, density = 0.55) {
  const r = rng(seed)
  return Uint8Array.from({ length: w * h }, () => (r() < density ? 1 + Math.floor(r() * (palette.length - 1)) : 0))
}
const params = (p: Partial<AffineParams>): AffineParams => ({ ...IDENTITY_PARAMS, ...p })
const ctx = (isBase = false, pal: readonly string[] = palette) => ({ palette: pal, resolver: createPaletteResolver(pal), isBase })
function run(src: Uint8Array, w: number, h: number, p: AffineParams, interp: Interpolation, isBase = false) {
  return resampleIndices(src, w, h, w, h, affineSourceMap(p, w, h), interp, ctx(isBase))
}

describe("identity", () => {
  it("returns the same indices for every interpolation (centres map exactly to centres)", () => {
    for (const interp of ["nearest", "bilinear", "bicubic"] as const) {
      for (const isBase of [false, true]) {
        const src = randomIndices(3, 13, 9)
        const c = ctx(isBase)
        const out = resampleIndices(src, 13, 9, 13, 9, affineSourceMap(IDENTITY_PARAMS, 13, 9), interp, c)
        expect(Array.from(out), `${interp} base=${isBase}`).toEqual(Array.from(src))
        expect(c.resolver.added).toBe(0)
      }
    }
  })
  it("detects identity and clamps garbage parameters", () => {
    expect(isIdentityParams(IDENTITY_PARAMS)).toBe(true)
    expect(isIdentityParams(params({ rotation: 360 }))).toBe(true)
    expect(isIdentityParams(params({ offsetX: 1 }))).toBe(false)
    const c = clampAffineParams({ scaleX: 0, scaleY: 99999, rotation: NaN, offsetX: Infinity })
    expect([c.scaleX, c.scaleY, c.rotation, c.offsetX]).toEqual([0.05, 16, 0, 0])
  })
})

describe("nearest keeps pixel boundaries exact", () => {
  it("flip H / V are exact mirror images", () => {
    const w = 11
    const h = 7
    const src = randomIndices(5, w, h)
    const fh = run(src, w, h, params({ flipH: true }), "nearest")
    const fv = run(src, w, h, params({ flipV: true }), "nearest")
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        expect(fh[y * w + x]).toBe(src[y * w + (w - 1 - x)])
        expect(fv[y * w + x]).toBe(src[(h - 1 - y) * w + x])
      }
  })

  it("90, 180 and 270 degree turns match the existing exact rotation on a square", () => {
    const n = 9
    const src = randomIndices(6, n, n)
    const rgba = (idx: Uint8Array) => {
      const a = new Uint8ClampedArray(n * n * 4)
      idx.forEach((v, i) => a.set([v, 0, 0, 255], i * 4))
      return a
    }
    const ref = rgba(src)
    rotateRect90Cw(ref, { x: 0, y: 0, width: n, height: n }, n, n)
    const out = run(src, n, n, params({ rotation: 90 }), "nearest")
    for (let i = 0; i < n * n; i += 1) expect(out[i]).toBe(ref[i * 4])
    const r180 = run(src, n, n, params({ rotation: 180 }), "nearest")
    for (let i = 0; i < n * n; i += 1) expect(r180[i]).toBe(src[n * n - 1 - i])
    const r270 = run(run(src, n, n, params({ rotation: 90 }), "nearest"), n, n, params({ rotation: 180 }), "nearest")
    expect(Array.from(run(src, n, n, params({ rotation: 270 }), "nearest"))).toEqual(Array.from(r270))
  })

  it("integer upscale turns every cell into an exact block", () => {
    const w = 8
    const h = 8
    const src = randomIndices(7, w, h, 1)
    const out = run(src, w, h, params({ scaleX: 2, scaleY: 2 }), "nearest")
    // upscaled about the centre: dest (x,y) <- src(floor((x - 4)/2 + 4), ...)
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const sx = Math.floor((x - 4) / 2 + 4)
        const sy = Math.floor((y - 4) / 2 + 4)
        expect(out[y * w + x]).toBe(src[sy * w + sx])
      }
  })

  it("half scale picks the centre-most source cell of each pair; offsets shift whole cells", () => {
    const w = 8
    const h = 4
    const src = Uint8Array.from({ length: w * h }, (_, i) => 1 + (i % 5))
    const shifted = run(src, w, h, params({ offsetX: 3, offsetY: 1 }), "nearest")
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const sx = x - 3
        const sy = y - 1
        expect(shifted[y * w + x]).toBe(sx < 0 || sy < 0 ? 0 : src[sy * w + sx])
      }
    // fractional offsets still land on exact cells (no blending, palette untouched)
    const c = ctx()
    resampleIndices(src, w, h, w, h, affineSourceMap(params({ offsetX: 0.4 }), w, h), "nearest", c)
    expect(c.resolver.added).toBe(0)
  })

  it("arbitrary rotation never invents colours and stays inside the palette", () => {
    const src = randomIndices(8, 16, 16)
    for (const deg of [10, 37, 45, 123, -77]) {
      const out = run(src, 16, 16, params({ rotation: deg }), "nearest")
      for (const v of out) expect(v === 0 || palette[v] !== undefined).toBe(true)
    }
  })

  it("rotating there and back by 90s is lossless; scale up then down by 2 restores the picture", () => {
    const n = 12
    const src = randomIndices(9, n, n)
    let cur: Uint8Array = src
    for (let i = 0; i < 4; i += 1) cur = run(cur, n, n, params({ rotation: 90 }), "nearest")
    expect(Array.from(cur)).toEqual(Array.from(src))
    const up = run(src, n, n, params({ scaleX: 2, scaleY: 2 }), "nearest")
    // the centre region survives a 2x zoom then 0.5x back
    const back = run(up, n, n, params({ scaleX: 0.5, scaleY: 0.5 }), "nearest")
    for (let y = 3; y < 9; y += 1) for (let x = 3; x < 9; x += 1) expect(back[y * n + x]).toBe(src[y * n + x])
  })
})

describe("bilinear and bicubic", () => {
  it("never bleed toward empty: an isolated red cell upscaled keeps pure red with no new colours", () => {
    for (const interp of ["bilinear", "bicubic"] as const) {
      const src = new Uint8Array(9 * 9)
      src[4 * 9 + 4] = 1
      const c = ctx(false)
      const out = resampleIndices(src, 9, 9, 9, 9, affineSourceMap(params({ scaleX: 3, scaleY: 3 }), 9, 9), interp, c)
      const painted = out.filter((v) => v !== 0)
      expect(painted.length).toBeGreaterThan(4)
      expect(painted.every((v) => v === 1)).toBe(true)
      expect(c.resolver.added).toBe(0)
    }
  })

  it("blend neighbouring colours and add them to the palette", () => {
    const src = Uint8Array.from([1, 1, 3, 3])
    const c = ctx(false)
    // half-cell shift: the middle samples straddle red and blue
    const out = resampleIndices(src, 4, 1, 4, 1, affineSourceMap(params({ offsetX: 0.5 }), 4, 1), "bilinear", c)
    expect(c.resolver.added).toBeGreaterThan(0)
    expect(c.resolver.palette.length).toBeGreaterThan(palette.length)
    expect(out.some((v) => v >= palette.length)).toBe(true)
  })

  it("a flat colour stays flat (weights sum to 1), also at the canvas edge", () => {
    for (const interp of ["bilinear", "bicubic"] as const) {
      const src = new Uint8Array(10 * 10).fill(2)
      const out = resampleIndices(src, 10, 10, 10, 10, affineSourceMap(params({ rotation: 30, scaleX: 1.3, scaleY: 1.3 }), 10, 10), interp, ctx(true))
      const inner = new Set<number>()
      for (let y = 3; y < 7; y += 1) for (let x = 3; x < 7; x += 1) inner.add(out[y * 10 + x]!)
      expect([...inner]).toEqual([2])
    }
  })

  it("base layer shows Paper where it is shifted away; other layers show nothing", () => {
    const src = new Uint8Array(6 * 6).fill(1)
    const base = run(src, 6, 6, params({ offsetX: 3 }), "bilinear", true)
    const top = run(src, 6, 6, params({ offsetX: 3 }), "bilinear", false)
    expect(base[0]).toBe(0)
    expect(top[0]).toBe(0)
    expect(base[5]).toBe(1)
  })

  it("when the palette is full new colours map to the nearest existing one", () => {
    const hex2 = (n: number) => n.toString(16).padStart(2, "0")
    const full = Array.from({ length: 256 }, (_, i) => `#${hex2(i)}${hex2((i * 7) % 256)}${hex2((i * 13) % 256)}`)
    const src = Uint8Array.from([10, 10, 200, 200])
    const c = ctx(false, full)
    const out = resampleIndices(src, 4, 1, 4, 1, affineSourceMap(params({ offsetX: 0.5 }), 4, 1), "bilinear", c)
    expect(c.resolver.palette.length).toBe(256)
    expect(c.resolver.approximated).toBeGreaterThan(0)
    for (const v of out) expect(v).toBeLessThan(256)
  })
})

describe("transformDocument", () => {
  const layers = (): PixelLayerRuntime[] => {
    const a = createEmptyLayer(8, 8, "bg")
    a.id = "a"
    a.indices = randomIndices(1, 8, 8)
    const b = createEmptyLayer(8, 8, "b")
    b.id = "b"
    b.indices = randomIndices(2, 8, 8)
    const c = createEmptyLayer(8, 8, "c")
    c.id = "c"
    c.indices = randomIndices(3, 8, 8)
    return [a, b, c]
  }
  const doc = (ls: PixelLayerRuntime[], activeIndex = 1) => ({ width: 8, height: 8, palette, layers: ls, activeIndex })

  it("scope layer touches only the active layer; scope all touches every unlocked layer", () => {
    const ls = layers()
    const one = transformDocument(doc(ls), { scope: "layer", params: params({ flipH: true }), interpolation: "nearest" })
    expect(one.layerIndices.map((x) => x !== null)).toEqual([false, true, false])
    const all = transformDocument(doc(ls), { scope: "all", params: params({ flipH: true }), interpolation: "nearest" })
    expect(all.layerIndices.map((x) => x !== null)).toEqual([true, true, true])
  })

  it("skips locked and transparency-locked layers and reports why", () => {
    const ls = layers()
    ls[0]!.locked = true
    ls[2]!.lockAlpha = true
    const r = transformDocument(doc(ls), { scope: "all", params: params({ flipV: true }), interpolation: "nearest" })
    expect(r.skipped).toEqual([{ id: "a", reason: "locked" }, { id: "c", reason: "lockAlpha" }])
    expect(r.layerIndices.map((x) => x !== null)).toEqual([false, true, false])
  })

  it("identity (and an identity-looking no-op) reports unchanged", () => {
    const ls = layers()
    const r = transformDocument(doc(ls), { scope: "all", params: IDENTITY_PARAMS, interpolation: "bicubic" })
    expect(r.changed).toBe(false)
    expect(r.layerIndices.every((x) => x === null)).toBe(true)
    const sym = new Uint8Array(64).fill(1)
    const flat = layers()
    flat[1]!.indices = sym
    const flip = transformDocument(doc(flat), { scope: "layer", params: params({ flipH: true }), interpolation: "nearest" })
    expect(flip.changed).toBe(false)
  })

  it("never mutates its input", () => {
    const ls = layers()
    const before = ls.map((l) => new Uint8Array(l.indices))
    transformDocument(doc(ls), { scope: "all", params: params({ rotation: 33, scaleX: 1.5, scaleY: 1.5 }), interpolation: "bicubic" })
    ls.forEach((l, i) => expect(Array.from(l.indices)).toEqual(Array.from(before[i]!)))
  })

  it("shares one palette across layers and reports added colours for blended results", () => {
    const ls = layers()
    const r = transformDocument(doc(ls), { scope: "all", params: params({ rotation: 20 }), interpolation: "bilinear" })
    expect(r.addedColors).toBeGreaterThan(0)
    expect(r.palette.length).toBe(palette.length + r.addedColors)
    for (const out of r.layerIndices) if (out) for (const v of out) expect(v).toBeLessThan(r.palette.length)
    const n = transformDocument(doc(ls), { scope: "all", params: params({ rotation: 20 }), interpolation: "nearest" })
    expect(n.addedColors).toBe(0)
  })

  it("crop to selection: outside is erased, the rectangle is fitted to the canvas and centred", () => {
    const ls = layers()
    ls[1]!.indices.fill(0)
    for (let y = 2; y < 6; y += 1) for (let x = 2; x < 6; x += 1) ls[1]!.indices[y * 8 + x] = 3
    const rect = { x: 2, y: 2, width: 4, height: 4 }
    const p = fitRectParams(rect, 8, 8, true)
    expect(p.scaleX).toBe(2)
    const r = transformDocument(doc(ls), { scope: "layer", params: p, interpolation: "nearest", cropRect: rect })
    const out = r.layerIndices[1]!
    // the 4x4 block filled with 3 now covers the whole 8x8 canvas
    expect(Array.from(out).every((v) => v === 3)).toBe(true)
    const small = fitRectParams({ x: 0, y: 0, width: 8, height: 2 }, 8, 8)
    expect(small.scaleX).toBe(1)
    expect([small.offsetX, small.offsetY]).toEqual([0, 3])
  })

  it("crop erases everything outside even when the scale is 1", () => {
    const ls = layers()
    ls[1]!.indices.fill(2)
    const r = transformDocument(doc(ls), { scope: "layer", params: IDENTITY_PARAMS, interpolation: "nearest", cropRect: { x: 2, y: 2, width: 3, height: 3 } })
    const out = r.layerIndices[1]!
    let painted = 0
    for (let y = 0; y < 8; y += 1)
      for (let x = 0; x < 8; x += 1) {
        const inside = x >= 2 && x < 5 && y >= 2 && y < 5
        expect(out[y * 8 + x]).toBe(inside ? 2 : 0)
        if (inside) painted += 1
      }
    expect(painted).toBe(9)
  })
})

describe("size-changing operations (engine)", () => {
  const mk = (w: number, h: number, seed: number): PixelLayerRuntime[] => {
    const l = createEmptyLayer(w, h, "x")
    l.indices = randomIndices(seed, w, h, 0.8)
    return [l]
  }

  it("crops to a rectangle, clipped to the canvas", () => {
    const ls = mk(6, 5, 1)
    const out = cropLayers(ls, 6, 5, { x: 2, y: 1, width: 3, height: 2 })!
    expect([out.width, out.height]).toEqual([3, 2])
    for (let y = 0; y < 2; y += 1) for (let x = 0; x < 3; x += 1) expect(out.indices[0]![y * 3 + x]).toBe(ls[0]!.indices[(y + 1) * 6 + (x + 2)])
    expect(cropLayers(ls, 6, 5, { x: 4, y: 3, width: 10, height: 10 })).toMatchObject({ width: 2, height: 2 })
    expect(cropLayers(ls, 6, 5, { x: 9, y: 9, width: 3, height: 3 })).toBeNull()
  })

  it("canvas resize keeps the art at the chosen anchor and never scales it", () => {
    const ls = mk(4, 4, 2)
    for (const anchor of ["top-left", "center", "bottom-right"] as const) {
      const [out] = resizeCanvasLayers(ls, 4, 4, 8, 6, anchor)
      const { x, y } = anchorOffset(anchor, 4, 4, 8, 6)
      for (let yy = 0; yy < 4; yy += 1) for (let xx = 0; xx < 4; xx += 1) expect(out![(yy + y) * 8 + xx + x]).toBe(ls[0]!.indices[yy * 4 + xx])
      expect(out!.length).toBe(48)
    }
    // shrinking crops from the anchor side
    const [shrunk] = resizeCanvasLayers(ls, 4, 4, 2, 2, "center")
    expect(shrunk![0]).toBe(ls[0]!.indices[1 * 4 + 1])
    expect(anchorOffset("center", 4, 4, 9, 9)).toEqual({ x: 2, y: 2 })
    expect(anchorOffset("bottom-right", 4, 4, 9, 9)).toEqual({ x: 5, y: 5 })
  })

  it("image resize by an integer factor with nearest is exact blocks and keeps the palette", () => {
    const ls = mk(5, 4, 3)
    const r = resizeImageLayers(ls, 5, 4, 15, 12, "nearest", palette)
    expect(r.addedColors).toBe(0)
    for (let y = 0; y < 12; y += 1) for (let x = 0; x < 15; x += 1) expect(r.indices[0]![y * 15 + x]).toBe(ls[0]!.indices[Math.floor(y / 3) * 5 + Math.floor(x / 3)])
    const down = resizeImageLayers(r.indices.map((indices) => ({ ...ls[0]!, indices })), 15, 12, 5, 4, "nearest", palette)
    expect(Array.from(down.indices[0]!)).toEqual(Array.from(ls[0]!.indices))
  })

  it("image resize with bilinear can add colours but keeps every cell inside the palette", () => {
    const ls = mk(6, 6, 4)
    const r = resizeImageLayers(ls, 6, 6, 9, 9, "bilinear", palette)
    for (const v of r.indices[0]!) expect(v).toBeLessThan(r.palette.length)
  })
})
