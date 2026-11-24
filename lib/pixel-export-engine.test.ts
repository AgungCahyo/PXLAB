import { describe, expect, it } from "vitest"
import {
  buildExport,
  composeSpriteSheet,
  ExportError,
  layoutSpriteSheet,
  maxExportScale,
  paintedMask,
  renderComposite,
  renderLayer,
  rgbaToIndexed,
  sanitizeFileStem,
  visibleLayerIndices,
  type ExportDocument,
  type RasterEncoder,
} from "@/lib/pixel-export-engine"
import { decodeGif } from "@/lib/pixel-gif-decode.testutil"
import { compositeLayersToRgba, createEmptyLayer, PIXEL_EXPORT_EDGE_MAX, type PixelLayerRuntime } from "./pixel"
import type { PixelGroupRuntime } from "@/lib/pixel-groups"

const W = 10
const H = 6
const palette = ["#FFFDF7", "#FF0000", "#00FF00", "#0000FF", "#808080", "#FFFF00"]

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}
function layers(seed: number, n: number): PixelLayerRuntime[] {
  const r = rng(seed)
  return Array.from({ length: n }, (_, k) => {
    const l = createEmptyLayer(W, H, `L${k}`)
    l.id = `l${k}`
    for (let i = 0; i < W * H; i += 1) l.indices[i] = r() < 0.4 ? 1 + Math.floor(r() * (palette.length - 1)) : 0
    return l
  })
}
const doc = (ls: PixelLayerRuntime[], groups: PixelGroupRuntime[] = []): ExportDocument => ({
  width: W,
  height: H,
  palette,
  layers: ls,
  groups,
})

/** Stand-in for the browser encoder: records what it was given and returns the raw pixels. */
const calls: Array<{ w: number; h: number; mime: string; quality: number }> = []
const stub: RasterEncoder = async (rgba, w, h, mime, quality) => {
  calls.push({ w, h, mime, quality })
  return new Uint8Array(rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength))
}
function zipEntries(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const out: Record<string, Uint8Array> = {}
  let p = view.getUint32(zip.length - 22 + 16, true)
  const n = view.getUint16(zip.length - 22 + 10, true)
  for (let i = 0; i < n; i += 1) {
    const size = view.getUint32(p + 24, true)
    const nameLen = view.getUint16(p + 28, true)
    const offset = view.getUint32(p + 42, true)
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen))
    const start = offset + 30 + view.getUint16(offset + 26, true)
    out[name] = zip.subarray(start, start + size)
    p += 46 + nameLen
  }
  return out
}

describe("composite export matches the editor", () => {
  it("paper background is exactly the viewport composite (plain, blended and grouped documents)", () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const ls = layers(seed, 4)
      ls[1]!.blend = "multiply"
      ls[1]!.opacity = 60
      ls[2]!.group = "g"
      ls[3]!.group = "g"
      ls[3]!.blend = "screen"
      const groups: PixelGroupRuntime[] = [{ id: "g", name: "g", visible: true, opacity: 70, blend: "overlay", collapsed: false }]
      const d = doc(ls, groups)
      const view = new Uint8ClampedArray(W * H * 4)
      compositeLayersToRgba(ls, view, palette, W, H, null, groups)
      expect(Array.from(renderComposite(d, { kind: "paper" }))).toEqual(Array.from(view))
    }
  })

  it("transparent background clears only cells nothing painted, not paper-coloured painted cells", () => {
    const base = createEmptyLayer(W, H, "bg")
    base.indices[0] = 0 // empty
    base.indices[1] = 1 // red
    const top = createEmptyLayer(W, H, "top")
    top.indices[2] = 5 // yellow
    const out = renderComposite(doc([base, top]), { kind: "transparent" })
    expect(out[3]).toBe(0) // cell 0: unpainted -> alpha 0
    expect(Array.from(out.slice(4, 8))).toEqual([255, 0, 0, 255])
    expect(Array.from(out.slice(8, 12))).toEqual([255, 255, 0, 255])
    // a painted cell whose colour equals Paper must stay opaque
    const paperPalette = ["#FFFDF7", "#FFFDF7"]
    const l = createEmptyLayer(2, 1, "x")
    l.indices[0] = 1
    const o = renderComposite({ width: 2, height: 1, palette: paperPalette, layers: [l], groups: [] }, { kind: "transparent" })
    expect(o[3]).toBe(255)
    expect(o[7]).toBe(0)
  })

  it("custom colour fills only unpainted cells; hidden layers and hidden groups do not paint", () => {
    const ls = layers(3, 3)
    ls[1]!.visible = false
    ls[2]!.group = "g"
    const groups: PixelGroupRuntime[] = [{ id: "g", name: "g", visible: false, opacity: 100, blend: "normal", collapsed: false }]
    const d = doc(ls, groups)
    expect(visibleLayerIndices(d)).toEqual([0])
    const mask = paintedMask(d)
    const out = renderComposite(d, { kind: "color", hex: "#102030" })
    for (let i = 0; i < W * H; i += 1) {
      const p = i * 4
      if (mask[i]) expect(Array.from(out.slice(p, p + 3))).not.toEqual([16, 32, 48])
      else expect(Array.from(out.slice(p, p + 4))).toEqual([16, 32, 48, 255])
    }
  })
})

describe("single-layer render", () => {
  it("draws only that layer, honours opacity as alpha when asked, ignores blend and group", () => {
    const l = layers(5, 1)[0]!
    l.opacity = 50
    l.blend = "multiply"
    const d = doc([l])
    const solid = renderLayer(l, d, { kind: "transparent" }, false)
    const alpha = renderLayer(l, d, { kind: "transparent" }, true)
    for (let i = 0; i < W * H; i += 1) {
      const p = i * 4
      if (l.indices[i] === 0) {
        expect(solid[p + 3]).toBe(0)
        expect(alpha[p + 3]).toBe(0)
      } else {
        expect(solid[p + 3]).toBe(255)
        expect(alpha[p + 3]).toBe(128)
        expect(Array.from(alpha.slice(p, p + 3))).toEqual(Array.from(solid.slice(p, p + 3)))
      }
    }
  })
})

describe("png / jpeg / webp", () => {
  it("scales with exact nearest-neighbour blocks and names the file", async () => {
    const d = doc(layers(2, 2))
    const base = renderComposite(d, { kind: "paper" })
    const r = await buildExport(d, { format: "png", scale: 3, background: { kind: "paper" } }, stub, "My Art!")
    expect([r.width, r.height, r.file.mime, r.file.name]).toEqual([W * 3, H * 3, "image/png", "My Art!@3x.png"])
    for (let y = 0; y < H * 3; y += 1)
      for (let x = 0; x < W * 3; x += 1) {
        const so = ((Math.floor(y / 3) * W + Math.floor(x / 3)) * 4)
        const oo = (y * W * 3 + x) * 4
        expect(Array.from(r.file.bytes.slice(oo, oo + 4))).toEqual(Array.from(base.slice(so, so + 4)))
      }
  })

  it("JPEG cannot hold alpha, so transparent falls back to Paper; quality is passed on", async () => {
    calls.length = 0
    const l = createEmptyLayer(W, H, "x")
    const r = await buildExport(doc([l]), { format: "jpeg", scale: 1, background: { kind: "transparent" }, quality: 0.7 }, stub, "a")
    expect(r.file.name).toBe("a.jpg")
    expect(r.file.mime).toBe("image/jpeg")
    expect(r.file.bytes[3]).toBe(255)
    expect(calls[0]).toMatchObject({ mime: "image/jpeg", quality: 0.7 })
    const w = await buildExport(doc([l]), { format: "webp", scale: 1, background: { kind: "transparent" } }, stub, "a")
    expect(w.file.bytes[3]).toBe(0)
    expect(w.file.name).toBe("a.webp")
  })

  it("rejects bad scales and oversized output", async () => {
    const d = doc(layers(1, 1))
    await expect(buildExport(d, { format: "png", scale: 0, background: { kind: "paper" } }, stub)).rejects.toMatchObject({ code: "scale" })
    await expect(buildExport(d, { format: "png", scale: 1.5, background: { kind: "paper" } }, stub)).rejects.toBeInstanceOf(ExportError)
    const edge = maxExportScale(W, H)
    expect(W * edge).toBeLessThanOrEqual(PIXEL_EXPORT_EDGE_MAX)
    await expect(buildExport(d, { format: "png", scale: edge + 1, background: { kind: "paper" } }, stub)).rejects.toMatchObject({ code: "bounds" })
  })
})

describe("GIF export", () => {
  it("layers as frames: each visible layer is one frame with exact indices and a transparent background", async () => {
    const ls = layers(7, 4)
    ls[2]!.visible = false
    const r = await buildExport(doc(ls), { format: "gif", scale: 1, background: { kind: "transparent" }, source: "layers", delayMs: 150, loop: 0 }, stub, "anim")
    expect(r.frames).toBe(3)
    const dec = decodeGif(r.file.bytes)
    expect(dec.frames).toHaveLength(3)
    const t = dec.frames[0]!.transparent
    expect(t).not.toBeNull()
    const shown = [0, 1, 3]
    shown.forEach((li, fi) => {
      for (let i = 0; i < W * H; i += 1) {
        const idx = ls[li]!.indices[i]!
        const got = dec.frames[fi]!.indices[i]!
        if (idx === 0) expect(got).toBe(t)
        else expect(dec.palette[got]).toEqual(Array.from(hex(palette[idx]!)))
      }
    })
    expect(dec.frames.map((f) => f.delay)).toEqual([15, 15, 15])
    expect(dec.frames.every((f) => f.disposal === 2)).toBe(true)
  })

  it("flat GIF reproduces the visible image colours exactly when it has few colours", async () => {
    const ls = layers(8, 3)
    const d = doc(ls)
    const r = await buildExport(d, { format: "gif", scale: 2, background: { kind: "paper" }, source: "flat", delayMs: 100, loop: 0 }, stub)
    const dec = decodeGif(r.file.bytes)
    expect([dec.width, dec.height]).toEqual([W * 2, H * 2])
    const view = renderComposite(d, { kind: "paper" })
    for (let y = 0; y < H * 2; y += 1)
      for (let x = 0; x < W * 2; x += 1) {
        const so = (Math.floor(y / 2) * W + Math.floor(x / 2)) * 4
        expect(dec.palette[dec.frames[0]!.indices[y * W * 2 + x]!]).toEqual(Array.from(view.slice(so, so + 3)))
      }
  })

  it("flat GIF with transparent background keeps unpainted cells transparent", async () => {
    const d = doc(layers(9, 2))
    const r = await buildExport(d, { format: "gif", scale: 1, background: { kind: "transparent" }, source: "flat", delayMs: 100, loop: 0 }, stub)
    const dec = decodeGif(r.file.bytes)
    const mask = paintedMask(d)
    const t = dec.frames[0]!.transparent
    expect(t).not.toBeNull()
    for (let i = 0; i < W * H; i += 1) expect(dec.frames[0]!.indices[i] === t).toBe(!mask[i])
  })

  it("reduces to at most 256 colours and maps each pixel to a kept colour", () => {
    const w = 40
    const h = 20
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i += 1) rgba.set([i % 256, (i * 3) % 256, (i * 7) % 256, i % 11 === 0 ? 0 : 255], i * 4)
    const idx = rgbaToIndexed(rgba, w, h)
    expect(idx.palette.length).toBeLessThanOrEqual(256)
    for (let i = 0; i < w * h; i += 1) {
      if (rgba[i * 4 + 3] === 0) expect(idx.indices[i]).toBe(idx.transparentIndex)
      else expect(idx.indices[i]).not.toBe(idx.transparentIndex)
    }
  })

  it("full 256-colour palette with a transparent background still works when an index is unused", async () => {
    const big = Array.from({ length: 256 }, (_, i) => `#${i.toString(16).padStart(2, "0")}${(255 - i).toString(16).padStart(2, "0")}40`)
    const l = createEmptyLayer(4, 1, "x")
    l.indices.set([1, 2, 3, 0])
    const d: ExportDocument = { width: 4, height: 1, palette: big, layers: [l], groups: [] }
    const r = await buildExport(d, { format: "gif", scale: 1, background: { kind: "transparent" }, source: "layers", delayMs: 100, loop: 0 }, stub)
    const dec = decodeGif(r.file.bytes)
    expect(dec.frames[0]!.transparent).not.toBeNull()
    expect(dec.frames[0]!.indices[3]).toBe(dec.frames[0]!.transparent)
  })

  it("errors when nothing is visible", async () => {
    const l = createEmptyLayer(W, H, "x")
    l.visible = false
    await expect(
      buildExport(doc([l]), { format: "gif", scale: 1, background: { kind: "paper" }, source: "layers", delayMs: 100, loop: 0 }, stub),
    ).rejects.toMatchObject({ code: "no_layers" })
  })
})

describe("sprite sheet", () => {
  it("lays frames out in a grid with gaps and no outer margin", () => {
    const l = layoutSpriteSheet(5, 8, 6, 0, 2)
    expect([l.columns, l.rows, l.width, l.height]).toEqual([3, 2, 3 * 8 + 2 * 2, 2 * 6 + 2])
    expect(l.rects[4]).toEqual({ x: 10, y: 8, w: 8, h: 6 })
    const single = layoutSpriteSheet(3, 4, 4, 1, 0)
    expect([single.columns, single.rows, single.width, single.height]).toEqual([1, 3, 4, 12])
    expect(layoutSpriteSheet(2, 4, 4, 99, 0).columns).toBe(2)
    expect(() => layoutSpriteSheet(0, 4, 4, 0, 0)).toThrow()
  })

  it("composes each visible layer into its cell and builds a ZIP with the sheet and a JSON map", async () => {
    const ls = layers(11, 3)
    ls[1]!.visible = false
    const d = doc(ls)
    const r = await buildExport(d, { format: "sheet", scale: 2, background: { kind: "transparent" }, columns: 2, padding: 1, includeJson: true }, stub, "hero")
    expect(r.file.name).toBe("hero-sheet@2x.zip")
    expect(r.entries).toEqual(["hero-sheet@2x.png", "hero-sheet@2x.json"])
    const files = zipEntries(r.file.bytes)
    const json = JSON.parse(new TextDecoder().decode(files["hero-sheet@2x.json"]!))
    expect(json.frames).toHaveLength(2)
    expect(json.meta).toMatchObject({ columns: 2, rows: 1, scale: 2, padding: 2, size: { w: (W * 2 + 1) * 2, h: H * 2 } })
    expect(json.frames[1]).toMatchObject({ index: 1, name: "L2", x: (W + 1) * 2, y: 0, w: W * 2, h: H * 2 })
    // pixels: sheet frame 0 equals layer 0 alone, scaled
    const sheet = files["hero-sheet@2x.png"]!
    const sheetW = r.width
    const frame0 = renderLayer(ls[0]!, d, { kind: "transparent" }, false)
    for (let y = 0; y < H * 2; y += 1)
      for (let x = 0; x < W * 2; x += 1) {
        const so = (Math.floor(y / 2) * W + Math.floor(x / 2)) * 4
        const oo = (y * sheetW + x) * 4
        expect(Array.from(sheet.slice(oo, oo + 4))).toEqual(Array.from(frame0.slice(so, so + 4)))
      }
  })

  it("without JSON it is just the PNG; the gap uses the chosen background", async () => {
    const ls = layers(12, 2)
    const d = doc(ls)
    const r = await buildExport(d, { format: "sheet", scale: 1, background: { kind: "color", hex: "#112233" }, columns: 2, padding: 3, includeJson: false }, stub, "s")
    expect(r.file.name).toBe("s-sheet.png")
    expect(r.width).toBe(W * 2 + 3)
    // a gap pixel (x = W) is the background colour
    expect(Array.from(r.file.bytes.slice(W * 4, W * 4 + 4))).toEqual([17, 34, 51, 255])
  })

  it("composeSpriteSheet keeps empty background transparent", () => {
    const layout = layoutSpriteSheet(2, 1, 1, 2, 1)
    const out = composeSpriteSheet([Uint8ClampedArray.from([1, 2, 3, 255]), Uint8ClampedArray.from([4, 5, 6, 255])], 1, 1, layout, { kind: "transparent" })
    expect(Array.from(out)).toEqual([1, 2, 3, 255, 0, 0, 0, 0, 4, 5, 6, 255])
  })
})

describe("layers ZIP", () => {
  it("writes one PNG per visible layer with unique, safe, ordered names", async () => {
    const ls = layers(13, 4)
    ls[0]!.name = "Background"
    ls[1]!.name = "a/b:c*?"
    ls[2]!.name = "Eyes"
    ls[3]!.name = "Eyes"
    ls[2]!.visible = false
    const d = doc(ls)
    const r = await buildExport(d, { format: "layers", scale: 1, background: { kind: "transparent" }, applyOpacity: false, includeHidden: false }, stub, "My Hero")
    expect(r.file.name).toBe("My Hero-layers.zip")
    expect(r.entries).toEqual(["01-Background.png", "02-a-b-c.png", "03-Eyes.png"])
    const files = zipEntries(r.file.bytes)
    expect(Object.keys(files)).toEqual(r.entries)
    expect(Array.from(files["03-Eyes.png"]!)).toEqual(Array.from(renderLayer(ls[3]!, d, { kind: "transparent" }, false)))
    const all = await buildExport(d, { format: "layers", scale: 1, background: { kind: "transparent" }, applyOpacity: false, includeHidden: true }, stub)
    expect(all.entries).toHaveLength(4)
    expect(new Set(all.entries).size).toBe(4)
  })

  it("applies layer opacity as alpha and scales when asked", async () => {
    const l = createEmptyLayer(2, 2, "ghost")
    l.indices[0] = 1
    l.opacity = 40
    const d: ExportDocument = { width: 2, height: 2, palette, layers: [l], groups: [] }
    const r = await buildExport(d, { format: "layers", scale: 2, background: { kind: "transparent" }, applyOpacity: true, includeHidden: false }, stub)
    const png = zipEntries(r.file.bytes)["01-ghost.png"]!
    expect(png[3]).toBe(102)
    expect(png.length).toBe(4 * 4 * 4)
  })
})

describe("helpers", () => {
  it("sanitises file names", () => {
    expect(sanitizeFileStem("  ../we:ird*name?  ")).toBe("we-ird-name")
    expect(sanitizeFileStem("...")).toBe("layer")
    expect(sanitizeFileStem("x".repeat(200)).length).toBe(48)
  })
})

function hex(h: string) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
}
