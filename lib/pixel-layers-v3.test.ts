import { describe, expect, it } from "vitest"
import {
  blendChannel,
  blendOverPixel,
  clampLayerOpacity,
  isPixelBlendMode,
  PIXEL_BLEND_MODES,
} from "@/lib/pixel-blend"
import {
  buildPixelSourceV2,
  compositeLayersToRgba,
  createEmptyLayer,
  flattenLayersToIndices,
  hexToRgb,
  parsePixelSource,
  PIXEL_PALETTE,
  PIXEL_SOURCE_VERSION_V2,
  PIXEL_SOURCE_VERSION_V3,
  type PixelLayerRuntime,
} from "@/lib/pixel"
import { pixelContentSchema } from "@/lib/validations/creation"

const W = 12
const H = 9
const palette = ["#FFFDF7", "#FF0000", "#00FF00", "#0000FF", "#808080", "#FFFF00"]

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

function randomLayers(seed: number, count: number): PixelLayerRuntime[] {
  const r = rng(seed)
  return Array.from({ length: count }, (_, k) => {
    const layer = createEmptyLayer(W, H, `L${k}`)
    for (let i = 0; i < W * H; i += 1) layer.indices[i] = r() < 0.45 ? Math.floor(r() * palette.length) : 0
    layer.visible = r() > 0.15
    return layer
  })
}

/** Straight port of the pre-V3 compositor, used as the oracle for plain layers. */
function legacyComposite(layers: PixelLayerRuntime[]) {
  const out = new Uint8ClampedArray(W * H * 4)
  const [pr, pg, pb] = hexToRgb(palette[0]!)
  for (let i = 0; i < W * H; i += 1) out.set([pr, pg, pb, 255], i * 4)
  layers.forEach((layer, li) => {
    if (!layer.visible) return
    for (let i = 0; i < W * H; i += 1) {
      const index = layer.indices[i]!
      if (li > 0 && index === 0) continue
      const [r, g, b] = hexToRgb(palette[index] ?? palette[0]!)
      out.set([r, g, b, 255], i * 4)
    }
  })
  return out
}

function composite(layers: PixelLayerRuntime[]) {
  const out = new Uint8ClampedArray(W * H * 4)
  compositeLayersToRgba(layers, out, palette, W, H)
  return out
}

describe("blend maths", () => {
  it("matches known W3C values", () => {
    expect(blendChannel("multiply", 0.5, 0.5)).toBeCloseTo(0.25)
    expect(blendChannel("screen", 0.5, 0.5)).toBeCloseTo(0.75)
    // overlay = hard-light with the operands swapped: dark backdrop multiplies, light backdrop screens
    expect(blendChannel("overlay", 0.25, 0.8)).toBeCloseTo(0.4, 6)
    expect(blendChannel("overlay", 0.75, 0.2)).toBeCloseTo(0.6, 6)
    expect(blendChannel("hard-light", 0.8, 0.25)).toBeCloseTo(0.4, 6)
    expect(blendChannel("darken", 0.3, 0.7)).toBe(0.3)
    expect(blendChannel("lighten", 0.3, 0.7)).toBe(0.7)
    expect(blendChannel("add", 0.8, 0.6)).toBe(1)
    expect(blendChannel("difference", 0.2, 0.9)).toBeCloseTo(0.7)
    expect(blendChannel("exclusion", 0.5, 0.5)).toBeCloseTo(0.5)
    expect(blendChannel("subtract", 0.2, 0.9)).toBe(0)
    expect(blendChannel("color-dodge", 0, 0.5)).toBe(0)
    expect(blendChannel("color-dodge", 0.5, 1)).toBe(1)
    expect(blendChannel("color-burn", 1, 0.5)).toBe(1)
    expect(blendChannel("color-burn", 0.5, 0)).toBe(0)
  })

  it("stays inside 0..1 for every mode across the full input grid", () => {
    for (const mode of PIXEL_BLEND_MODES) {
      for (let b = 0; b <= 255; b += 5) {
        for (let s = 0; s <= 255; s += 5) {
          const v = blendChannel(mode, b / 255, s / 255)
          expect(v).toBeGreaterThanOrEqual(-1e-9)
          expect(v).toBeLessThanOrEqual(1 + 1e-9)
          expect(Number.isNaN(v)).toBe(false)
        }
      }
    }
  })

  it("blends white and black sensibly", () => {
    expect(blendChannel("multiply", 1, 0.37)).toBeCloseTo(0.37)
    expect(blendChannel("screen", 0, 0.37)).toBeCloseTo(0.37)
    expect(blendChannel("difference", 0.37, 0.37)).toBe(0)
  })

  it("applies opacity as a linear mix and ignores opacity 0", () => {
    const px = new Uint8ClampedArray([200, 100, 0, 255])
    blendOverPixel(px, 0, 0, 100, 100, 50, "normal")
    expect(Array.from(px)).toEqual([100, 100, 50, 255])
    const same = new Uint8ClampedArray([1, 2, 3, 255])
    blendOverPixel(same, 0, 9, 9, 9, 0, "multiply")
    expect(Array.from(same)).toEqual([1, 2, 3, 255])
  })

  it("validates modes and clamps opacity", () => {
    expect(PIXEL_BLEND_MODES.every(isPixelBlendMode)).toBe(true)
    expect(isPixelBlendMode("dissolve")).toBe(false)
    expect([clampLayerOpacity(-5), clampLayerOpacity(130), clampLayerOpacity(33.4), clampLayerOpacity("x"), clampLayerOpacity(NaN)]).toEqual([0, 100, 33, 100, 100])
  })
})

describe("compositor", () => {
  it("is bit-identical to the pre-V3 compositor for plain layers", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const layers = randomLayers(seed, 1 + (seed % 4))
      expect(Array.from(composite(layers))).toEqual(Array.from(legacyComposite(layers)))
    }
  })

  it("normal 50% over paper mixes halfway; opacity 0 is invisible", () => {
    const base = createEmptyLayer(W, H, "bg")
    const top = createEmptyLayer(W, H, "top")
    top.indices[0] = 1
    top.opacity = 50
    const out = composite([base, top])
    const [pr, pg, pb] = hexToRgb(palette[0]!)
    expect(out[0]).toBe(Math.round(pr + (255 - pr) * 0.5))
    expect(out[1]).toBe(Math.round(pg + (0 - pg) * 0.5))
    expect(out[2]).toBe(Math.round(pb + (0 - pb) * 0.5))
    top.opacity = 0
    expect(Array.from(composite([base, top]))).toEqual(Array.from(composite([base])))
  })

  it("multiply of red over yellow-ish paper darkens, and layers with index 0 stay transparent", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.indices.fill(5) // yellow
    const top = createEmptyLayer(W, H, "top")
    top.indices[3] = 1 // red
    top.blend = "multiply"
    const out = composite([base, top])
    expect(Array.from(out.slice(12, 16))).toEqual([255, 0, 0, 255]) // yellow x red
    expect(Array.from(out.slice(0, 4))).toEqual([255, 255, 0, 255]) // untouched yellow
  })

  it("recompositing a rect matches a full composite inside it and leaves the rest alone", () => {
    const layers = randomLayers(7, 3)
    layers[1]!.blend = "screen"
    layers[1]!.opacity = 60
    layers[2]!.blend = "difference"
    const full = composite(layers)
    const partial = new Uint8ClampedArray(full.length).fill(7)
    compositeLayersToRgba(layers, partial, palette, W, H, { x: 3, y: 2, width: 5, height: 4 })
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = (y * W + x) * 4
        const inside = x >= 3 && x < 8 && y >= 2 && y < 6
        expect(Array.from(partial.slice(p, p + 4))).toEqual(inside ? Array.from(full.slice(p, p + 4)) : [7, 7, 7, 7])
      }
  })

  it("skips hidden layers and layers at opacity 0 when flattening indices", () => {
    const a = createEmptyLayer(W, H, "a")
    a.indices.fill(2)
    const b = createEmptyLayer(W, H, "b")
    b.indices.fill(3)
    b.opacity = 0
    expect(flattenLayersToIndices([a, b], W, H)[0]).toBe(2)
  })
})

describe("V3 source format", () => {
  it("keeps documents that use no V3 feature as V2 (older readers keep working)", () => {
    const src = buildPixelSourceV2(randomLayers(3, 3), W, H, palette)
    expect(src.version).toBe(PIXEL_SOURCE_VERSION_V2)
    expect(JSON.stringify(src)).not.toContain("opacity")
  })

  it("writes V3 as soon as one layer uses opacity, a blend mode or the alpha lock", () => {
    for (const patch of [{ opacity: 80 }, { blend: "multiply" as const }, { lockAlpha: true }]) {
      const layers = randomLayers(4, 2)
      Object.assign(layers[1]!, patch)
      expect(buildPixelSourceV2(layers, W, H, palette).version).toBe(PIXEL_SOURCE_VERSION_V3)
    }
  })

  it("round-trips every V3 field exactly", () => {
    const layers = randomLayers(5, 4)
    layers[1]!.opacity = 37
    layers[1]!.blend = "overlay"
    layers[2]!.lockAlpha = true
    layers[3]!.opacity = 0
    layers[3]!.blend = "soft-light"
    const parsed = parsePixelSource(JSON.parse(JSON.stringify(buildPixelSourceV2(layers, W, H, palette))))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.version).toBe(PIXEL_SOURCE_VERSION_V3)
    parsed.layers.forEach((l, i) => {
      const src = layers[i]!
      expect(Array.from(l.indices)).toEqual(Array.from(src.indices))
      expect(l.opacity).toBe(src.opacity ?? 100)
      expect(l.blend).toBe(src.blend ?? "normal")
      expect(l.lockAlpha).toBe(Boolean(src.lockAlpha))
      expect([l.id, l.name, l.visible, l.locked]).toEqual([src.id, src.name, src.visible, src.locked])
    })
  })

  it("opens a stored V2 document with defaults and does not upgrade it by itself", () => {
    const v2 = JSON.parse(JSON.stringify(buildPixelSourceV2(randomLayers(6, 2), W, H, palette)))
    const parsed = parsePixelSource(v2)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.version).toBe(PIXEL_SOURCE_VERSION_V2)
    expect(parsed.layers.every((l) => l.opacity === undefined && l.blend === undefined)).toBe(true)
    expect(buildPixelSourceV2(parsed.layers, W, H, palette).version).toBe(PIXEL_SOURCE_VERSION_V2)
  })

  it("degrades unknown or malformed V3 fields to defaults instead of failing", () => {
    const src = JSON.parse(JSON.stringify(buildPixelSourceV2((() => {
      const l = randomLayers(8, 1)
      l[0]!.opacity = 50
      return l
    })(), W, H, palette)))
    src.layers[0].blend = "dissolve"
    src.layers[0].opacity = "lots"
    src.layers[0].lockAlpha = "yes"
    const parsed = parsePixelSource(src)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect([parsed.layers[0]!.opacity, parsed.layers[0]!.blend, parsed.layers[0]!.lockAlpha]).toEqual([100, "normal", false])
  })

  it("still rejects unknown versions and corrupt pixel data", () => {
    const good = JSON.parse(JSON.stringify(buildPixelSourceV2(randomLayers(9, 1), W, H, palette)))
    expect(parsePixelSource({ ...good, version: 5 })).toEqual({ ok: false, error: "unsupported_version" })
    const bad = JSON.parse(JSON.stringify(good))
    bad.layers[0].runs = [1, 2]
    expect(parsePixelSource(bad).ok).toBe(false)
  })

  it("accepts version 3 in the creation header schema", () => {
    const header = {
      version: 3,
      width: 16,
      height: 16,
      palette: [...PIXEL_PALETTE],
      encoding: "rle-index",
      source_path: "u/c/source.json",
    }
    expect(pixelContentSchema.safeParse(header).success).toBe(true)
    expect(pixelContentSchema.safeParse({ ...header, version: 4 }).success).toBe(true)
    expect(pixelContentSchema.safeParse({ ...header, version: 5 }).success).toBe(false)
  })
})
