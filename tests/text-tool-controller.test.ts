import { describe, expect, it } from "vitest"
import { createEmptyLayer, PIXEL_LAYER_MAX, PIXEL_PALETTE, PIXEL_TEXT_LAYER_MAX, type PixelLayerRuntime } from "@/lib/pixel"
import { TextToolController, type TextToolEnv } from "@/components/canvas/text-tool"

const W = 64
const H = 64

function setup(opts: { palette?: string[] } = {}) {
  const layers: PixelLayerRuntime[] = [createEmptyLayer(W, H, "Layer 1")]
  const palette = [...(opts.palette ?? PIXEL_PALETTE)]
  const log = { undo: 0, discarded: 0, changed: 0, structure: 0, flashed: [] as string[], paletteFull: 0 }
  let active = 0
  const coalesce = new Map<string, number>()
  let now = 0
  const env: TextToolEnv = {
    layers: () => layers,
    activeIndex: () => active,
    setActive: (i) => (active = i),
    size: () => ({ width: W, height: H }),
    viewScale: () => 8,
    drawingColor: () => "#20202A",
    colorIndex: (hex) => {
      const i = palette.indexOf(hex.toUpperCase())
      if (i >= 0) return i
      if (palette.length >= 256) return null
      palette.push(hex.toUpperCase())
      return palette.length - 1
    },
    layerHidden: (l) => !l.visible,
    pushUndo: () => void (log.undo += 1),
    pushUndoCoalesced: (key) => {
      const last = coalesce.get(key)
      coalesce.set(key, now)
      if (last !== undefined && now - last < 900) return false
      log.undo += 1
      return true
    },
    discardUndo: () => void (log.discarded += 1),
    changed: (_r, o) => {
      log.changed += 1
      if (o?.structure) log.structure += 1
    },
    requestView: () => {},
    flash: (k) => void log.flashed.push(k),
    paletteFull: () => void (log.paletteFull += 1),
  }
  const ctl = new TextToolController(env, () => {})
  return { ctl, layers, log, palette, tick: (ms: number) => (now += ms), active: () => active }
}

const ink = (l: PixelLayerRuntime) => l.indices.reduce((n, v) => n + (v ? 1 : 0), 0)

describe("text tool controller", () => {
  it("click creates one unified text object and starts editing", () => {
    const { ctl, layers, log } = setup()
    ctl.pointerDown({ x: 10, y: 10 })
    ctl.pointerUp({ x: 10, y: 10 })
    expect(layers).toHaveLength(2)
    expect(layers[1]!.text).toBeTruthy()
    expect(ctl.state().editing).toBe(true)
    expect(log.undo).toBe(1)
    expect(layers[1]!.text!.width).toBeGreaterThanOrEqual(24)
  })

  it("drag creates the same kind of object, sized by the drag", () => {
    const click = setup()
    click.ctl.pointerDown({ x: 4, y: 4 })
    click.ctl.pointerUp({ x: 4, y: 4 })
    const drag = setup()
    drag.ctl.pointerDown({ x: 4, y: 4 })
    drag.ctl.pointerMove({ x: 30, y: 20 })
    drag.ctl.pointerUp({ x: 30, y: 20 })
    const a = click.layers[1]!.text!
    const b = drag.layers[1]!.text!
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort())
    expect(b.width).toBe(27)
    expect(b.height).toBe(17)
    expect(drag.ctl.state().editing).toBe(true)
  })

  it("typing is one undo step and renders into the layer cache", () => {
    const { ctl, layers, log } = setup()
    ctl.pointerDown({ x: 2, y: 2 })
    ctl.pointerUp({ x: 2, y: 2 })
    ctl.setContent("H")
    ctl.setContent("Hi")
    ctl.setContent("Hi there")
    expect(log.undo).toBe(1)
    expect(ink(layers[1]!)).toBeGreaterThan(10)
    expect(layers[1]!.text!.text).toBe("Hi there")
  })

  it("a blank box is removed and its undo step discarded", () => {
    const { ctl, layers, log } = setup()
    ctl.pointerDown({ x: 2, y: 2 })
    ctl.pointerUp({ x: 2, y: 2 })
    ctl.finishEdit()
    expect(layers).toHaveLength(1)
    expect(log.discarded).toBe(1)
    expect(ctl.state().selected).toBeNull()
  })

  it("emptying existing text deletes it but keeps the undo step", () => {
    const { ctl, layers, log } = setup()
    ctl.create({ x: 0, y: 0, width: 30, height: 8 }, "abc")
    expect(ctl.state().editing).toBe(false)
    const id = layers[1]!.text!.id
    ctl.startEdit(id)
    ctl.setContent("")
    ctl.finishEdit()
    expect(layers).toHaveLength(1)
    expect(log.discarded).toBe(0)
  })

  it("double-click reopens editing; single click only selects", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    ctl.cancelInteraction()
    ctl.select(null)
    ctl.pointerDown({ x: 8, y: 8 })
    ctl.pointerUp({ x: 8, y: 8 })
    expect(ctl.state().selected?.id).toBe(layers[1]!.text!.id)
    expect(ctl.state().editing).toBe(false)
    ctl.doubleClick({ x: 8, y: 8 })
    expect(ctl.state().editing).toBe(true)
  })

  it("dragging an object moves it as one history step and leaves no trail", () => {
    const { ctl, layers, log } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    const before = log.undo
    ctl.select(null)
    ctl.pointerDown({ x: 8, y: 8 })
    for (let i = 1; i <= 6; i += 1) ctl.pointerMove({ x: 8 + i, y: 8 + i })
    ctl.pointerUp({ x: 14, y: 14 })
    expect(log.undo - before).toBe(1)
    expect(layers[1]!.text!.x).toBe(11)
    expect(layers[1]!.text!.y).toBe(11)
    // Nothing remains at the old position.
    for (let y = 5; y < 11; y += 1) for (let x = 5; x < 11; x += 1) expect(layers[1]!.indices[y * W + x]).toBe(0)
  })

  it("resize changes bounds, not font size, and reflows horizontally", () => {
    const { ctl, layers, log } = setup()
    ctl.create({ x: 4, y: 4, width: 80 > W ? 56 : 80, height: 8 }, "aaa bbb ccc ddd")
    const t0 = layers[1]!.text!
    const size = t0.fontSize
    ctl.select(layers[1]!.text!.id)
    const before = log.undo
    // East handle sits on the right edge, vertically centred.
    ctl.pointerDown({ x: t0.x + t0.width, y: t0.y + Math.floor(t0.height / 2) })
    ctl.pointerMove({ x: t0.x + 20, y: t0.y + 4 })
    ctl.pointerUp({ x: t0.x + 20, y: t0.y + 4 })
    const t1 = layers[1]!.text!
    expect(t1.width).toBeLessThan(t0.width)
    expect(t1.fontSize).toBe(size)
    expect(log.undo - before).toBe(1)
  })

  it("typography updates are single steps and coalesce while a control is dragged", () => {
    const { ctl, layers, log, tick } = setup()
    ctl.create({ x: 0, y: 0, width: 40, height: 20 }, "hello")
    const before = log.undo
    ctl.update({ fontSize: 14 })
    expect(log.undo - before).toBe(1)
    ctl.update({ letterSpacing: 2 }, "ls")
    tick(100)
    ctl.update({ letterSpacing: 3 }, "ls")
    tick(100)
    ctl.update({ letterSpacing: 4 }, "ls")
    expect(log.undo - before).toBe(2)
    expect(layers[1]!.text!.letterSpacing).toBe(4)
    expect(layers[1]!.text!.text).toBe("hello")
  })

  it("font size snaps to the pixel font and text content survives typography changes", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 0, y: 0, width: 50, height: 20 }, "keep me")
    ctl.update({ fontSize: 10 })
    expect(layers[1]!.text!.fontSize).toBe(7)
    ctl.update({ fontSize: 22, align: "center", verticalAlign: "middle", fontWeight: "bold" })
    expect(layers[1]!.text).toMatchObject({ fontSize: 21, align: "center", verticalAlign: "middle", text: "keep me" })
  })

  it("layer-owned fields and the text content cannot be changed through typography", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 0, y: 0, width: 40, height: 20 }, "hi")
    const id = layers[1]!.text!.id
    ctl.update({ id: "hacked", text: "nope", visible: false, locked: true, opacity: 3 })
    expect(layers[1]!.text).toMatchObject({ id, text: "hi", visible: true, locked: false, opacity: 100 })
  })

  it("a locked object cannot be moved, edited or restyled", () => {
    const { ctl, layers, log } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    layers[1]!.locked = true
    const before = { ...layers[1]!.text! }
    ctl.pointerDown({ x: 8, y: 8 })
    ctl.pointerMove({ x: 20, y: 20 })
    ctl.pointerUp({ x: 20, y: 20 })
    ctl.doubleClick({ x: 8, y: 8 })
    expect(ctl.update({ fontSize: 21 })).toBe(false)
    expect(layers[1]!.text).toMatchObject({ x: before.x, y: before.y, fontSize: before.fontSize })
    expect(ctl.state().editing).toBe(false)
    expect(log.flashed).toContain("locked")
  })

  it("hidden layers are not hit-tested", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    layers[1]!.visible = false
    ctl.select(null)
    ctl.pointerDown({ x: 8, y: 8 })
    ctl.pointerUp({ x: 8, y: 8 })
    // Empty space was clicked, so a new object is being created instead.
    expect(layers).toHaveLength(3)
  })

  it("delete and rasterize", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    const pixels = ink(layers[1]!)
    expect(ctl.rasterize(layers[1]!.text!.id)).toBe(true)
    expect(layers[1]!.text).toBeUndefined()
    expect(ink(layers[1]!)).toBe(pixels)
    ctl.create({ x: 5, y: 30, width: 30, height: 10 }, "x")
    expect(ctl.deleteSelected()).toBe(true)
    expect(layers).toHaveLength(2)
  })

  it("text layers have their own budget and report when it is full", () => {
    const { ctl, layers, log } = setup()
    for (let i = 0; i < PIXEL_TEXT_LAYER_MAX; i += 1) expect(ctl.create({ x: 0, y: i, width: 10, height: 8 }, "t")).toBeTruthy()
    expect(ctl.create({ x: 0, y: 0, width: 10, height: 8 }, "t")).toBeNull()
    expect(log.flashed).toContain("max")
    expect(layers.filter((l) => !l.text)).toHaveLength(1)
    expect(PIXEL_LAYER_MAX).toBe(8)
  })

  it("a full palette keeps the previous colour and reports it", () => {
    const full = Array.from({ length: 256 }, (_, i) => (i === 0 ? "#FFFDF7" : `#${(i * 65793).toString(16).padStart(6, "0").slice(-6).toUpperCase()}`))
    full[1] = "#20202A"
    const { ctl, layers, log } = setup({ palette: full })
    ctl.create({ x: 0, y: 0, width: 30, height: 10 }, "x")
    ctl.update({ color: "#123457" })
    expect(layers[1]!.text!.color).toBe("#20202A")
    expect(log.paletteFull).toBeGreaterThan(0)
  })

  it("keeps the selection in sync with the active layer", () => {
    const { ctl, layers } = setup()
    ctl.create({ x: 5, y: 5, width: 30, height: 10 }, "yo")
    ctl.cancelInteraction()
    ctl.select(null)
    ctl.syncSelectionToActive()
    expect(ctl.state().selected?.id).toBe(layers[1]!.text!.id)
  })

  it("abortBlankNew cancels only a just-created blank box", () => {
    const { ctl, layers, log } = setup()
    ctl.pointerDown({ x: 2, y: 2 })
    ctl.pointerUp({ x: 2, y: 2 })
    expect(ctl.abortBlankNew()).toBe(true)
    expect(layers).toHaveLength(1)
    expect(log.discarded).toBe(1)
    ctl.create({ x: 0, y: 0, width: 30, height: 10 }, "keep")
    ctl.startEdit(layers[1]!.text!.id)
    expect(ctl.abortBlankNew()).toBe(false)
  })
})
