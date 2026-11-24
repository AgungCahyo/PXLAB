import { describe, expect, it } from "vitest"
import {
  buildPixelSourceV2,
  canAddLayer,
  createEmptyLayer,
  parsePixelSource,
  PIXEL_LAYER_MAX,
  PIXEL_PALETTE,
  PIXEL_TEXT_LAYER_MAX,
  syncTextMirror,
  type PixelLayerRuntime,
} from "@/lib/pixel"
import { PixelHistory } from "@/lib/pixel-history"
import { createTextObject } from "./model"
import { rasterizeTextObject } from "./raster"

const W = 32
const H = 32

function textLayer(text: string, over: Partial<ReturnType<typeof createTextObject>> = {}): PixelLayerRuntime {
  const obj = createTextObject({ text, x: 2, y: 2, width: 28, height: 12, ...over })
  const layer = createEmptyLayer(W, H, "Text")
  layer.text = obj
  layer.indices = rasterizeTextObject(obj, 1, W, H)
  return layer
}

describe("text object persistence", () => {
  it("round-trips through the artwork source and survives reload", () => {
    const base = createEmptyLayer(W, H, "Layer 1")
    const t = textLayer("Hello", { align: "center", fontWeight: "bold", rotation: 90, letterSpacing: 2 })
    const src = buildPixelSourceV2([base, t], W, H, PIXEL_PALETTE)
    const parsed = parsePixelSource(JSON.parse(JSON.stringify(src)))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.layers[0]!.text).toBeUndefined()
    expect(parsed.layers[1]!.text).toMatchObject({
      id: t.text!.id,
      text: "Hello",
      align: "center",
      fontWeight: "bold",
      rotation: 90,
      letterSpacing: 2,
    })
    expect(Array.from(parsed.layers[1]!.indices)).toEqual(Array.from(t.indices))
    // The server stores `parsed.data`, so the text object must be part of it (publish keeps text editable).
    expect((parsed.data as { layers: { text?: { text: string } }[] }).layers[1]!.text?.text).toBe("Hello")
  })

  it("keeps the raster in the file so clients without text objects show the same picture", () => {
    const t = textLayer("Hi")
    const src = buildPixelSourceV2([createEmptyLayer(W, H), t], W, H, PIXEL_PALETTE)
    const row = src.layers[1] as { runs: number[]; text?: unknown }
    expect(row.runs.length).toBeGreaterThan(1)
    expect(row.text).toBeTruthy()
    // Stripping `text` (what an older client does) still parses and flattens identically.
    const stripped = JSON.parse(JSON.stringify(src))
    delete stripped.layers[1].text
    const parsed = parsePixelSource(stripped)
    expect(parsed.ok && parsed.layers[1]!.text).toBeFalsy()
    expect(parsed.ok && Array.from(parsed.layers[1]!.indices)).toEqual(Array.from(t.indices))
  })

  it("artwork without text objects serialises exactly as before", () => {
    const src = buildPixelSourceV2([createEmptyLayer(W, H)], W, H, PIXEL_PALETTE)
    expect(src.version).toBe(2)
    expect(JSON.stringify(src)).not.toContain("text")
  })

  it("old V1/V2 sources still open and have no text layers", () => {
    const parsed = parsePixelSource(buildPixelSourceV2([createEmptyLayer(W, H), createEmptyLayer(W, H)], W, H))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.layers.every((l) => !l.text)).toBe(true)
  })

  it("a malformed text record degrades to a plain pixel layer instead of failing the document", () => {
    const t = textLayer("ok")
    const src = JSON.parse(JSON.stringify(buildPixelSourceV2([createEmptyLayer(W, H), t], W, H)))
    src.layers[1].text = "garbage"
    const parsed = parsePixelSource(src)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.layers[1]!.text).toBeUndefined()
  })

  it("mirrors layer visibility, lock and opacity into the object, and layers stay the authority", () => {
    const t = textLayer("x")
    t.visible = false
    t.locked = true
    t.opacity = 40
    syncTextMirror(t)
    expect(t.text).toMatchObject({ visible: false, locked: true, opacity: 40 })
    const src = buildPixelSourceV2([createEmptyLayer(W, H), t], W, H)
    const parsed = parsePixelSource(JSON.parse(JSON.stringify(src)))
    expect(parsed.ok && parsed.layers[1]!.text).toMatchObject({ visible: false, locked: true, opacity: 40 })
  })

  it("text layers have their own budget and do not use up painted layers", () => {
    const layers: PixelLayerRuntime[] = []
    for (let i = 0; i < PIXEL_LAYER_MAX; i += 1) layers.push(createEmptyLayer(W, H))
    expect(canAddLayer(layers)).toBe(false)
    expect(canAddLayer(layers, "text")).toBe(true)
    for (let i = 0; i < PIXEL_TEXT_LAYER_MAX; i += 1) layers.push(textLayer("t"))
    expect(canAddLayer(layers, "text")).toBe(false)
    const src = buildPixelSourceV2(layers, W, H)
    expect(src.layers).toHaveLength(PIXEL_LAYER_MAX + PIXEL_TEXT_LAYER_MAX)
    expect(parsePixelSource(JSON.parse(JSON.stringify(src))).ok).toBe(true)
  })
})

describe("text objects in history", () => {
  const doc = (layers: PixelLayerRuntime[]) => ({
    layers,
    active: 0,
    palette: PIXEL_PALETTE,
    selection: null,
    floating: null,
  })

  it("restores the previous text object on undo and shares unchanged ones between frames", () => {
    const history = new PixelHistory()
    const t = textLayer("one")
    history.push(doc([createEmptyLayer(W, H), t]))
    const edited: PixelLayerRuntime = { ...t, text: { ...t.text!, text: "two" }, indices: new Uint8Array(t.indices) }
    const frame = history.undo(doc([createEmptyLayer(W, H), edited]))!
    expect(frame.layers[1]!.text!.text).toBe("one")
    // Redo returns the edited object.
    const again = history.redo(doc([createEmptyLayer(W, H), t]))!
    expect(again.layers[1]!.text!.text).toBe("two")
  })

  it("frames are immutable snapshots, not live references", () => {
    const history = new PixelHistory()
    const t = textLayer("snap")
    history.push(doc([createEmptyLayer(W, H), t]))
    t.text = { ...t.text!, text: "mutated" }
    const frame = history.undo(doc([createEmptyLayer(W, H), t]))!
    expect(frame.layers[1]!.text!.text).toBe("snap")
  })

  it("discardLast drops an abandoned step", () => {
    const history = new PixelHistory()
    history.push(doc([createEmptyLayer(W, H)]))
    expect(history.discardLast()).toBe(true)
    expect(history.canUndo).toBe(false)
    expect(history.discardLast()).toBe(false)
  })
})
