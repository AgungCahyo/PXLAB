import { describe, expect, it } from "vitest"
import {
  applyAlphaLock,
  compositeLayersToRgba,
  createEmptyLayer,
  hexToRgb,
  snapshotIndicesRect,
  writeIndicesRectToRgba,
  flattenLayersToIndices,
  type PixelLayerRuntime,
} from "./pixel"
import { PixelHistory } from "./pixel-history"
import { bakeMergeDown, bakeVisibleLayers, createPaletteResolver } from "@/lib/pixel-merge"

const W = 10
const H = 8
const palette = ["#FFFDF7", "#FF0000", "#00FF00", "#0000FF", "#808080", "#FFFF00"]

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}
function randomLayers(seed: number, count: number): PixelLayerRuntime[] {
  const r = rng(seed)
  return Array.from({ length: count }, (_, k) => {
    const layer = createEmptyLayer(W, H, `L${k}`)
    for (let i = 0; i < W * H; i += 1) layer.indices[i] = r() < 0.5 ? 1 + Math.floor(r() * (palette.length - 1)) : 0
    return layer
  })
}
function render(layers: PixelLayerRuntime[], pal: readonly string[]) {
  const out = new Uint8ClampedArray(W * H * 4)
  compositeLayersToRgba(layers, out, pal, W, H)
  return out
}

describe("transparency lock", () => {
  const w = 6
  it("keeps empty cells empty and painted cells painted, but allows recolouring", () => {
    const indices = new Uint8Array([0, 1, 2, 0, 3, 0])
    const snap = snapshotIndicesRect(indices, w, 1)
    indices[0] = 5 // paint an empty cell -> reverted
    indices[1] = 0 // erase a painted cell -> reverted
    indices[2] = 4 // recolour -> kept
    indices[3] = 0 // untouched empty
    expect(applyAlphaLock(indices, snap, w)).toBe(true)
    expect(Array.from(indices)).toEqual([0, 1, 4, 0, 3, 0])
  })

  it("reports no change when nothing violates the lock", () => {
    const indices = new Uint8Array([0, 1, 2, 0])
    const snap = snapshotIndicesRect(indices, 4, 1)
    indices[1] = 3
    expect(applyAlphaLock(indices, snap, 4)).toBe(false)
  })

  it("only inspects the snapshot rectangle", () => {
    const width = 6
    const height = 4
    const indices = new Uint8Array(width * height)
    const snap = snapshotIndicesRect(indices, width, height, { x: 1, y: 1, width: 2, height: 2 })
    indices[1 * width + 1] = 3 // inside, empty -> reverted
    indices[0] = 3 // outside the rect, not this edit's business
    expect(applyAlphaLock(indices, snap, width)).toBe(true)
    expect(indices[1 * width + 1]).toBe(0)
    expect(indices[0]).toBe(3)
  })

  it("refreshes the RGBA rectangle from the corrected indices", () => {
    const width = 3
    const indices = new Uint8Array([1, 0, 0])
    const snap = snapshotIndicesRect(indices, width, 1)
    const px = new Uint8ClampedArray(width * 4)
    writeIndicesRectToRgba(indices, px, width, snap, palette)
    expect(Array.from(px.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(Array.from(px.slice(4, 8))).toEqual([...hexToRgb(palette[0]!), 255])
  })
})

describe("palette resolver", () => {
  it("reuses exact matches, appends while there is room, then maps to the nearest", () => {
    const r = createPaletteResolver(["#000000", "#FFFFFF"], 3)
    expect(r.resolve(255, 255, 255)).toBe(1)
    expect(r.added).toBe(0)
    const added = r.resolve(250, 0, 0)
    expect(added).toBe(2)
    expect(r.added).toBe(1)
    expect(r.palette[2]).toBe("#FA0000")
    expect(r.resolve(250, 0, 0)).toBe(2)
    expect(r.resolve(10, 10, 10)).toBe(0) // full: nearest of black / white / red
    expect(r.approximated).toBe(1)
  })
})

describe("merge down", () => {
  it("plain layers use the original index merge", () => {
    const [lower, upper] = randomLayers(1, 2)
    const r = createPaletteResolver(palette)
    const out = bakeMergeDown(lower!, upper!, true, palette, r)
    out.forEach((v, i) => expect(v).toBe(upper!.indices[i] !== 0 ? upper!.indices[i] : lower!.indices[i]))
    expect(r.added).toBe(0)
  })

  it("multiply bakes a real colour into the palette and matches the displayed result", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.indices.fill(5) // yellow
    const top = createEmptyLayer(W, H, "top")
    top.indices[0] = 1 // red
    top.blend = "multiply"
    const before = render([base, top], palette)
    const r = createPaletteResolver(palette)
    const merged = { ...base, indices: bakeMergeDown(base, top, true, palette, r) }
    const after = render([merged], r.palette)
    expect(Array.from(after)).toEqual(Array.from(before))
  })

  it("opacity 0 leaves the lower layer alone; non-base transparent cells take the source colour", () => {
    const lower = createEmptyLayer(W, H, "lower")
    lower.indices[1] = 2
    const upper = createEmptyLayer(W, H, "upper")
    upper.indices[0] = 1
    upper.indices[1] = 1
    upper.opacity = 0
    const r = createPaletteResolver(palette)
    expect(Array.from(bakeMergeDown(lower, upper, false, palette, r))).toEqual(Array.from(lower.indices))
    upper.opacity = 50
    const out = bakeMergeDown(lower, upper, false, palette, r)
    expect(out[0]).toBe(1) // lower empty -> source colour, full strength
    expect(out[1]).not.toBe(2) // lower painted -> blended with it
  })
})

describe("merge visible", () => {
  it("is the original flatten when every visible layer is plain", () => {
    const layers = randomLayers(2, 3)
    layers[1]!.visible = false
    const r = createPaletteResolver(palette)
    expect(Array.from(bakeVisibleLayers(layers, W, H, palette, r))).toEqual(
      Array.from(flattenLayersToIndices(layers, W, H)),
    )
    expect(r.added).toBe(0)
  })

  it("WYSIWYG: merging blended layers reproduces exactly what was displayed", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const layers = randomLayers(seed, 4)
      layers[1]!.blend = "screen"
      layers[1]!.opacity = 70
      layers[2]!.blend = "difference"
      layers[3]!.opacity = 40
      layers[3]!.blend = "multiply"
      const before = render(layers, palette)
      const r = createPaletteResolver(palette)
      const indices = bakeVisibleLayers(layers, W, H, palette, r)
      const merged = createEmptyLayer(W, H, "Merged")
      merged.indices = indices
      expect(r.approximated).toBe(0)
      expect(Array.from(render([merged], r.palette))).toEqual(Array.from(before))
    }
  })

  it("ignores hidden layers and layers at opacity 0", () => {
    const layers = randomLayers(3, 3)
    layers[1]!.visible = false
    layers[2]!.opacity = 0
    layers[2]!.blend = "multiply"
    const r = createPaletteResolver(palette)
    const out = bakeVisibleLayers(layers, W, H, palette, r)
    const only = render([layers[0]!], palette)
    const merged = createEmptyLayer(W, H, "m")
    merged.indices = out
    expect(Array.from(render([merged], r.palette))).toEqual(Array.from(only))
  })
})

describe("history keeps layer style", () => {
  it("undo restores opacity, blend and the transparency lock", () => {
    const layers = [createEmptyLayer(W, H, "a"), createEmptyLayer(W, H, "b")]
    const h = new PixelHistory()
    const doc = () => ({ layers, active: 1, palette, selection: null, floating: null })
    layers[1]!.opacity = 80
    layers[1]!.blend = "overlay"
    h.push(doc())
    layers[1]!.opacity = 20
    layers[1]!.blend = "multiply"
    layers[1]!.lockAlpha = true
    const frame = h.undo(doc())!
    expect([frame.layers[1]!.opacity, frame.layers[1]!.blend, frame.layers[1]!.lockAlpha]).toEqual([80, "overlay", undefined])
    const redo = h.redo({ layers: frame.layers as PixelLayerRuntime[], active: 1, palette, selection: null, floating: null })!
    expect([redo.layers[1]!.opacity, redo.layers[1]!.blend, redo.layers[1]!.lockAlpha]).toEqual([20, "multiply", true])
  })
})
