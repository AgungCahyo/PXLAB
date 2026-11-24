import { describe, expect, it } from "vitest"
import { createEmptyLayer, type PixelClipboard, type PixelSelection } from "./pixel"
import { captureFrame, PixelHistory, type HistoryDocument } from "./pixel-history"

const W = 16
const H = 16

function stack(n: number) {
  return Array.from({ length: n }, (_, i) => createEmptyLayer(W, H, `L${i}`))
}

function doc(
  layers: ReturnType<typeof stack>,
  active = 0,
  patch: Partial<Pick<HistoryDocument, "palette" | "selection" | "floating">> = {},
): HistoryDocument {
  return {
    layers,
    active,
    palette: patch.palette ?? ["#FFFDF8"],
    selection: patch.selection ?? null,
    floating: patch.floating ?? null,
  }
}

describe("PixelHistory", () => {
  it("undo/redo restores exact previous pixels and metadata", () => {
    const layers = stack(2)
    const h = new PixelHistory()
    h.push(doc(layers))
    layers[0].indices[5] = 3
    layers[1].visible = false
    const before = h.undo(doc(layers))!
    expect(before.layers[0].indices[5]).toBe(0)
    expect(before.layers[1].visible).toBe(true)
    const after = h.redo(doc(stack(2)))!
    expect(after.layers[0].indices[5]).toBe(3)
    expect(after.layers[1].visible).toBe(false)
  })

  it("shares buffers of unchanged layers between frames", () => {
    const layers = stack(4)
    const h = new PixelHistory()
    h.push(doc(layers))
    layers[2].indices[1] = 9
    h.push(doc(layers, 2))
    // 4 layers in frame A + only the changed layer new in frame B
    expect(h.bytes()).toBe(5 * W * H)
  })

  it("frames are immutable snapshots, not live views", () => {
    const layers = stack(1)
    const h = new PixelHistory()
    h.push(doc(layers))
    layers[0].indices[0] = 7
    expect(h.undo(doc(layers))!.layers[0].indices[0]).toBe(0)
  })

  it("a new push clears redo", () => {
    const layers = stack(1)
    const h = new PixelHistory()
    h.push(doc(layers))
    h.undo(doc(layers))
    expect(h.canRedo).toBe(true)
    h.push(doc(layers))
    expect(h.canRedo).toBe(false)
  })

  it("respects the step limit", () => {
    const layers = stack(1)
    const h = new PixelHistory({ limit: 3 })
    for (let i = 0; i < 10; i += 1) {
      h.push(doc(layers))
      layers[0].indices[i] = 1
    }
    expect(h.undoDepth).toBe(3)
  })

  it("respects the byte budget but always keeps one step", () => {
    const layers = stack(2)
    const h = new PixelHistory({ limit: 100, maxBytes: 3 * W * H })
    for (let i = 0; i < 8; i += 1) {
      layers[0].indices[i] = i + 1
      layers[1].indices[i] = i + 1
      h.push(doc(layers))
    }
    expect(h.bytes()).toBeLessThanOrEqual(4 * W * H)
    expect(h.undoDepth).toBeGreaterThanOrEqual(1)
    const tiny = new PixelHistory({ maxBytes: 1 })
    tiny.push(doc(layers))
    expect(tiny.undoDepth).toBe(1)
  })

  it("keeps layer add/delete/reorder restorable by id", () => {
    const layers = stack(3)
    const h = new PixelHistory()
    h.push(doc(layers, 1))
    const reordered = [layers[2], layers[0]]
    const frame = h.undo(doc(reordered, 0))!
    expect(frame.layers.map((l) => l.id)).toEqual(layers.map((l) => l.id))
    expect(frame.active).toBe(1)
  })

  it("captureFrame does not share buffers across different layers", () => {
    const layers = stack(2)
    layers[1].indices[0] = 1
    const f = captureFrame(doc(layers), captureFrame(doc(layers)))
    expect(f.layers[0].indices).not.toBe(f.layers[1].indices)
  })

  it("restores palette without copying unchanged layer buffers", () => {
    const layers = stack(2)
    const h = new PixelHistory()
    const before = ["#FFFDF8", "#111111"]
    h.push(doc(layers, 0, { palette: before }))
    const added = ["#FFFDF8", "#111111", "#FF0000"]
    const frame = h.undo(doc(layers, 0, { palette: added }))!
    expect([...frame.palette]).toEqual(before)
    const restored = h.redo(doc(layers, 0, { palette: frame.palette }))!
    expect([...restored.palette]).toEqual(added)
    expect(h.bytes()).toBe(2 * W * H)
  })

  it("palette snapshots ignore later mutation of the live array", () => {
    const layers = stack(1)
    const palette = ["#FFFDF8"]
    const h = new PixelHistory()
    h.push(doc(layers, 0, { palette }))
    palette.push("#00FF00")
    expect([...h.undo(doc(layers, 0, { palette }))!.palette]).toEqual(["#FFFDF8"])
  })

  it("restores selection masks and shares an unchanged mask", () => {
    const layers = stack(1)
    const mask = new Uint8Array(W * H)
    mask[3] = 1
    const selection: PixelSelection = { x: 1, y: 2, width: 4, height: 5, mask }
    const h = new PixelHistory()
    h.push(doc(layers, 0, { selection }))
    h.push(doc(layers, 0, { selection: { ...selection, mask: new Uint8Array(mask) } }))
    expect(h.bytes()).toBe(W * H + mask.byteLength)
    mask[3] = 0
    const frame = h.undo(doc(layers))!
    expect(frame.selection).toEqual({ x: 1, y: 2, width: 4, height: 5, mask: expect.any(Uint8Array) })
    expect(frame.selection!.mask![3]).toBe(1)
    const changed = new Uint8Array(mask)
    changed[4] = 1
    h.push(doc(layers, 0, { selection: { ...selection, mask: changed } }))
    expect(h.bytes()).toBe(W * H + mask.byteLength * 2)
  })

  it("restores a floating clipboard and counts it toward the byte budget", () => {
    const layers = stack(1)
    const data = new Uint8ClampedArray(8)
    data[0] = 9
    const floating: PixelClipboard = { width: 2, height: 1, data }
    const h = new PixelHistory({ limit: 10, maxBytes: W * H + data.byteLength })
    h.push(doc(layers, 0, { floating, selection: { x: 0, y: 0, width: 2, height: 1 } }))
    data[0] = 1
    const frame = h.undo(doc(layers))!
    expect(frame.floating?.data[0]).toBe(9)
    expect(frame.floating?.width).toBe(2)
    const again = new Uint8ClampedArray(data)
    again[1] = 4
    h.push(doc(layers, 0, { floating: { ...floating, data: again } }))
    h.push(doc(layers, 0, { floating: { ...floating, data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]) } }))
    expect(h.undoDepth).toBe(1)
    expect(h.bytes()).toBeLessThanOrEqual(W * H + 8)
  })
})
