import { describe, expect, it } from "vitest"
import {
  buildPixelSourceV2,
  compositeLayersToRgba,
  createEmptyLayer,
  flattenLayersToIndices,
  parsePixelSource,
  PIXEL_SOURCE_VERSION_V2,
  PIXEL_SOURCE_VERSION_V3,
  PIXEL_SOURCE_VERSION_V4,
  type PixelLayerRuntime,
} from "./pixel"
import { PixelHistory } from "./pixel-history"
import { isGroupLayoutValid, type PixelGroupRuntime } from "@/lib/pixel-groups"
import { bakeVisibleLayers, createPaletteResolver } from "@/lib/pixel-merge"

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
    layer.id = `l${k}`
    for (let i = 0; i < W * H; i += 1) layer.indices[i] = r() < 0.5 ? 1 + Math.floor(r() * (palette.length - 1)) : 0
    return layer
  })
}
const group = (id: string, patch: Partial<PixelGroupRuntime> = {}): PixelGroupRuntime => ({
  id,
  name: id,
  visible: true,
  opacity: 100,
  blend: "normal",
  collapsed: false,
  ...patch,
})
function render(layers: PixelLayerRuntime[], groups: PixelGroupRuntime[] = [], rect?: { x: number; y: number; width: number; height: number }) {
  const out = new Uint8ClampedArray(W * H * 4)
  compositeLayersToRgba(layers, out, palette, W, H, rect ?? null, groups)
  return out
}

describe("group rendering", () => {
  it("a plain group renders exactly like the flat stack", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const layers = randomLayers(seed, 5)
      const flat = render(layers)
      layers[1]!.group = "g"
      layers[2]!.group = "g"
      layers[3]!.group = "g"
      expect(Array.from(render(layers, [group("g")]))).toEqual(Array.from(flat))
    }
  })

  it("a lone member at opacity X inside a normal group equals the ungrouped layer at opacity X", () => {
    const layers = randomLayers(3, 3)
    layers[1]!.opacity = 40
    const ungrouped = render(layers)
    layers[1]!.group = "g"
    expect(Array.from(render(layers, [group("g")]))).toEqual(Array.from(ungrouped))
  })

  it("group opacity mixes the whole group result with what is below", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.id = "bg"
    base.indices.fill(5) // yellow
    const a = createEmptyLayer(W, H, "a")
    a.id = "a"
    a.indices[0] = 1 // red
    const b = createEmptyLayer(W, H, "b")
    b.id = "b"
    b.indices[0] = 3 // blue, covers red inside the group
    b.indices[1] = 2 // green
    a.group = "g"
    b.group = "g"
    const out = render([base, a, b], [group("g", { opacity: 50 })])
    // cell 0: group colour is blue (top member) mixed 50% with yellow
    expect(Array.from(out.slice(0, 3))).toEqual([Math.round(255 + (0 - 255) * 0.5), Math.round(255 + (0 - 255) * 0.5), Math.round(0 + (255 - 0) * 0.5)])
    // cell 1: green at 50% over yellow
    expect(Array.from(out.slice(4, 7))).toEqual([Math.round(255 + (0 - 255) * 0.5), 255, 0])
    // cell 2: nothing painted in the group -> untouched yellow
    expect(Array.from(out.slice(8, 11))).toEqual([255, 255, 0])
  })

  it("composites members in isolation: a multiply member does not see the layers outside its group", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.id = "bg"
    base.indices.fill(5) // yellow
    const gray = createEmptyLayer(W, H, "gray")
    gray.id = "gray"
    gray.indices[0] = 4 // #808080
    gray.blend = "multiply"
    const ungrouped = render([base, gray])
    expect(Array.from(ungrouped.slice(0, 3))).toEqual([128, 128, 0]) // darkens yellow
    gray.group = "g"
    const grouped = render([base, gray], [group("g")])
    expect(Array.from(grouped.slice(0, 3))).toEqual([128, 128, 128]) // isolated: plain gray
  })

  it("group blend mode applies to the group result like a layer blend", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.id = "bg"
    base.indices.fill(5)
    const gray = createEmptyLayer(W, H, "gray")
    gray.id = "gray"
    gray.indices[0] = 4
    gray.group = "g"
    const viaGroup = render([base, gray], [group("g", { blend: "multiply" })])
    const gray2 = createEmptyLayer(W, H, "gray")
    gray2.indices[0] = 4
    gray2.blend = "multiply"
    expect(Array.from(viaGroup)).toEqual(Array.from(render([base, gray2])))
  })

  it("hidden and fully transparent groups hide their members everywhere", () => {
    const layers = randomLayers(4, 3)
    layers[1]!.group = "g"
    layers[2]!.group = "g"
    const without = render([layers[0]!])
    for (const patch of [{ visible: false }, { opacity: 0 }]) {
      const groups = [group("g", patch)]
      expect(Array.from(render(layers, groups))).toEqual(Array.from(without))
      expect(Array.from(flattenLayersToIndices(layers, W, H, groups))).toEqual(Array.from(flattenLayersToIndices([layers[0]!], W, H)))
    }
  })

  it("a rect recomposite matches the full composite inside the rect (groups, blends, opacity)", () => {
    const layers = randomLayers(6, 5)
    layers[1]!.group = "g"
    layers[2]!.group = "g"
    layers[2]!.blend = "screen"
    layers[2]!.opacity = 55
    layers[3]!.blend = "difference"
    const groups = [group("g", { opacity: 70, blend: "overlay" })]
    const full = render(layers, groups)
    const partial = new Uint8ClampedArray(full.length).fill(9)
    compositeLayersToRgba(layers, partial, palette, W, H, { x: 2, y: 1, width: 5, height: 4 }, groups)
    for (let y = 0; y < H; y += 1)
      for (let x = 0; x < W; x += 1) {
        const p = (y * W + x) * 4
        const inside = x >= 2 && x < 7 && y >= 1 && y < 5
        expect(Array.from(partial.slice(p, p + 4))).toEqual(inside ? Array.from(full.slice(p, p + 4)) : [9, 9, 9, 9])
      }
  })

  it("merging visible layers with groups reproduces the displayed image exactly", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const layers = randomLayers(seed, 5)
      layers[1]!.group = "g"
      layers[2]!.group = "g"
      layers[2]!.blend = "multiply"
      layers[2]!.opacity = 65
      layers[4]!.blend = "screen"
      const groups = [group("g", { opacity: 60, blend: "soft-light" })]
      const before = render(layers, groups)
      const r = createPaletteResolver(palette)
      const merged = createEmptyLayer(W, H, "m")
      merged.indices = bakeVisibleLayers(layers, W, H, palette, r, groups)
      expect(r.approximated).toBe(0)
      // the merged layer is shown with the palette the merge extended
      const after = new Uint8ClampedArray(W * H * 4)
      compositeLayersToRgba([merged], after, r.palette, W, H)
      expect(Array.from(after)).toEqual(Array.from(before))
    }
  })
})

describe("V4 source format", () => {
  it("only documents that use groups become V4; the rest keep their lower version", () => {
    const plain = randomLayers(1, 2)
    expect(buildPixelSourceV2(plain, W, H, palette).version).toBe(PIXEL_SOURCE_VERSION_V2)
    plain[0]!.opacity = 50
    expect(buildPixelSourceV2(plain, W, H, palette).version).toBe(PIXEL_SOURCE_VERSION_V3)
    plain[1]!.group = "g"
    expect(buildPixelSourceV2(plain, W, H, palette, [group("g")]).version).toBe(PIXEL_SOURCE_VERSION_V4)
  })

  it("round-trips groups, membership and every layer field", () => {
    const layers = randomLayers(2, 4)
    layers[1]!.group = "g"
    layers[2]!.group = "g"
    layers[2]!.opacity = 30
    layers[2]!.blend = "overlay"
    layers[3]!.lockAlpha = true
    const groups = [group("g", { name: "Trees", opacity: 45, blend: "multiply", collapsed: true, visible: false })]
    const json = JSON.parse(JSON.stringify(buildPixelSourceV2(layers, W, H, palette, groups)))
    const parsed = parsePixelSource(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.version).toBe(PIXEL_SOURCE_VERSION_V4)
    expect(parsed.groups).toEqual(groups)
    expect(parsed.layers.map((l) => l.group ?? null)).toEqual([null, "g", "g", null])
    expect(parsed.layers[2]!.opacity).toBe(30)
    expect(parsed.layers[2]!.blend).toBe("overlay")
    expect(parsed.layers[3]!.lockAlpha).toBe(true)
    expect(isGroupLayoutValid(parsed.layers, parsed.groups)).toBe(true)
    // the re-serialised data survives another round trip unchanged
    expect(JSON.parse(JSON.stringify(parsed.data))).toEqual(json)
  })

  it("older documents parse with no groups", () => {
    const v2 = parsePixelSource(JSON.parse(JSON.stringify(buildPixelSourceV2(randomLayers(3, 2), W, H, palette))))
    expect(v2.ok && v2.groups).toEqual([])
  })

  it("repairs bad group data instead of failing: split runs, unknown ids, malformed records", () => {
    const layers = randomLayers(4, 5)
    const base = JSON.parse(JSON.stringify(buildPixelSourceV2(layers.map((l, i) => ({ ...l, group: i === 1 ? "g" : null })), W, H, palette, [group("g")])))
    base.layers[0].group = "g"
    base.layers[1].group = "ghost"
    base.layers[3].group = "g" // g now split: l0 ... l3
    base.groups.push({ nonsense: true }, null, { id: "" })
    const parsed = parsePixelSource(base)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(isGroupLayoutValid(parsed.layers, parsed.groups)).toBe(true)
    expect(parsed.layers.map((l) => l.group ?? null)).toEqual(["g", null, null, null, null])
    expect(parsed.groups.map((g) => g.id)).toEqual(["g"])
  })

  it("version 5 is still rejected", () => {
    const good = JSON.parse(JSON.stringify(buildPixelSourceV2(randomLayers(5, 1), W, H, palette)))
    expect(parsePixelSource({ ...good, version: 5 })).toEqual({ ok: false, error: "unsupported_version" })
  })
})

describe("history keeps groups", () => {
  it("undo and redo restore group membership and group style", () => {
    const layers = randomLayers(7, 3)
    const groups = [group("g")]
    layers[1]!.group = "g"
    const h = new PixelHistory()
    const doc = () => ({ layers, groups, active: 1, palette, selection: null, floating: null })
    h.push(doc())
    groups[0]!.opacity = 20
    groups[0]!.name = "Renamed"
    layers[2]!.group = "g"
    const frame = h.undo(doc())!
    expect(frame.groups).toEqual([group("g")])
    expect(frame.layers.map((l) => l.group)).toEqual([null, "g", null])
    const redo = h.redo({ layers, groups: frame.groups, active: 1, palette, selection: null, floating: null })!
    expect(redo.groups[0]!.opacity).toBe(20)
    expect(redo.groups[0]!.name).toBe("Renamed")
    expect(redo.layers.map((l) => l.group)).toEqual([null, "g", "g"])
  })
})
