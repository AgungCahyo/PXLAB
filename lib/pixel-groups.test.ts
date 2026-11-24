import { describe, expect, it } from "vitest"
import { createEmptyLayer, type PixelLayerRuntime } from "./pixel"
import {
  assignLayerToGroup,
  createGroupFromLayer,
  createGroupFromLayers,
  isGroupLayoutValid,
  layerEffectivelyHidden,
  layerSegments,
  moveGroup,
  moveLayerInStack,
  normalizeGroups,
  removeLayerFromGroup,
  ungroup,
  updateGroupStyle,
  type PixelGroupRuntime,
} from "@/lib/pixel-groups"

const W = 4
const H = 4

function stack(n: number): PixelLayerRuntime[] {
  return Array.from({ length: n }, (_, i) => {
    const l = createEmptyLayer(W, H, `L${i}`)
    l.id = `l${i}`
    return l
  })
}
const names = (layers: PixelLayerRuntime[]) => layers.map((l) => `${l.id}${l.group ? `@${l.group}` : ""}`)
const order = (layers: PixelLayerRuntime[]) => layers.map((l) => l.id)

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

describe("group creation and membership", () => {
  it("creates a group from one ungrouped layer and refuses nesting", () => {
    const layers = stack(4)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "Sky")!
    expect(g.name).toBe("Sky")
    expect(layers[1]!.group).toBe(g.id)
    expect(createGroupFromLayer(layers, groups, "l1", "Again")).toBeNull()
    expect(createGroupFromLayer(layers, groups, "nope", "x")).toBeNull()
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("assigning from below makes the bottom member, from above the top member", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l2", "G")!
    assignLayerToGroup(layers, groups, "l0", g.id)
    expect(order(layers)).toEqual(["l1", "l0", "l2", "l3", "l4"])
    expect(layers.filter((l) => l.group === g.id).map((l) => l.id)).toEqual(["l0", "l2"])
    assignLayerToGroup(layers, groups, "l4", g.id)
    expect(order(layers)).toEqual(["l1", "l0", "l2", "l4", "l3"])
    expect(layers.filter((l) => l.group === g.id).map((l) => l.id)).toEqual(["l0", "l2", "l4"])
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("removing a middle member lifts it above the group so the run stays whole", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    assignLayerToGroup(layers, groups, "l2", g.id)
    assignLayerToGroup(layers, groups, "l3", g.id)
    expect(removeLayerFromGroup(layers, groups, "l2")).toBe(true)
    expect(order(layers)).toEqual(["l0", "l1", "l3", "l2", "l4"])
    expect(layers.find((l) => l.id === "l2")!.group).toBeNull()
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("an emptied group disappears; ungroup keeps the layers in place", () => {
    const layers = stack(3)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    removeLayerFromGroup(layers, groups, "l1")
    expect(groups).toHaveLength(0)
    const g2 = createGroupFromLayer(layers, groups, "l0", "H")!
    assignLayerToGroup(layers, groups, "l2", g2.id)
    const before = order(layers)
    expect(ungroup(layers, groups, g2.id)).toBe(true)
    expect(order(layers)).toEqual(before)
    expect(layers.every((l) => !l.group)).toBe(true)
    expect(groups).toHaveLength(0)
    void g
  })
})

describe("moving layers keeps groups contiguous", () => {
  it("dropping a layer between two members joins the group", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    assignLayerToGroup(layers, groups, "l2", g.id) // l1,l2
    assignLayerToGroup(layers, groups, "l3", g.id) // l1,l2,l3
    moveLayerInStack(layers, groups, 4, 2) // l4 lands between members
    expect(layers.find((l) => l.id === "l4")!.group).toBe(g.id)
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("dragging a top member past the run leaves the group; touching the run keeps it", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    assignLayerToGroup(layers, groups, "l2", g.id) // run l1,l2 at 1..2
    const topIndex = layers.findIndex((l) => l.id === "l2")
    moveLayerInStack(layers, groups, topIndex, topIndex + 1)
    expect(layers.find((l) => l.id === "l2")!.group).toBeNull()
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("a layer moved to an edge next to a group does not join it", () => {
    const layers = stack(4)
    const groups: PixelGroupRuntime[] = []
    createGroupFromLayer(layers, groups, "l2", "G")
    moveLayerInStack(layers, groups, 0, 1) // lands directly below the single-member group
    expect(layers.find((l) => l.id === "l0")!.group).toBeNull()
  })

  it("property: any sequence of operations keeps the layout valid", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const r = rng(seed)
      const layers = stack(8)
      const groups: PixelGroupRuntime[] = []
      for (let step = 0; step < 80; step += 1) {
        const pick = Math.floor(r() * 7)
        const id = layers[Math.floor(r() * layers.length)]!.id
        if (pick === 0) createGroupFromLayer(layers, groups, id, "G")
        else if (pick === 1 && groups.length) assignLayerToGroup(layers, groups, id, groups[Math.floor(r() * groups.length)]!.id)
        else if (pick === 2) removeLayerFromGroup(layers, groups, id)
        else if (pick === 3) moveLayerInStack(layers, groups, Math.floor(r() * layers.length), Math.floor(r() * layers.length))
        else if (pick === 4 && groups.length) moveGroup(layers, groups, groups[Math.floor(r() * groups.length)]!.id, r() < 0.5 ? 1 : -1)
        else if (pick === 5 && groups.length) ungroup(layers, groups, groups[Math.floor(r() * groups.length)]!.id)
        else if (pick === 6 && layers.length > 1) {
          layers.splice(Math.floor(r() * layers.length), 1)
          const kept = normalizeGroups(layers, groups)
          groups.splice(0, groups.length, ...kept)
          layers.push(createEmptyLayer(W, H, "N"))
        }
        expect(isGroupLayoutValid(layers, groups), `seed ${seed} step ${step}`).toBe(true)
        expect(layers).toHaveLength(8)
        expect(new Set(order(layers)).size).toBe(8)
      }
    }
  })
})

describe("moving a whole group", () => {
  it("swaps with the neighbour segment and keeps member order", () => {
    const layers = stack(6)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    assignLayerToGroup(layers, groups, "l2", g.id)
    expect(moveGroup(layers, groups, g.id, 1)).toBe(true)
    expect(order(layers)).toEqual(["l0", "l3", "l1", "l2", "l4", "l5"])
    expect(moveGroup(layers, groups, g.id, -1)).toBe(true)
    expect(order(layers)).toEqual(["l0", "l1", "l2", "l3", "l4", "l5"])
    expect(moveGroup(layers, groups, g.id, -1)).toBe(true)
    expect(order(layers)).toEqual(["l1", "l2", "l0", "l3", "l4", "l5"])
    expect(moveGroup(layers, groups, g.id, -1)).toBe(false)
  })

  it("jumps over another whole group", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const a = createGroupFromLayer(layers, groups, "l0", "A")!
    assignLayerToGroup(layers, groups, "l1", a.id)
    const b = createGroupFromLayer(layers, groups, "l3", "B")!
    assignLayerToGroup(layers, groups, "l4", b.id)
    expect(moveGroup(layers, groups, a.id, 1)).toBe(true)
    expect(order(layers)).toEqual(["l2", "l0", "l1", "l3", "l4"])
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })
})

describe("normalizeGroups repairs bad data", () => {
  it("drops unknown ids, keeps the first run of a split group, removes empty groups", () => {
    const layers = stack(6)
    const groups: PixelGroupRuntime[] = [
      { id: "a", name: "A", visible: true, opacity: 100, blend: "normal", collapsed: false },
      { id: "empty", name: "E", visible: true, opacity: 100, blend: "normal", collapsed: false },
    ]
    layers[0]!.group = "a"
    layers[1]!.group = "ghost"
    layers[2]!.group = "a" // split: l0 ... l2
    layers[3]!.group = "a"
    const kept = normalizeGroups(layers, groups)
    expect(names(layers)).toEqual(["l0@a", "l1", "l2", "l3", "l4", "l5"])
    expect(kept.map((g) => g.id)).toEqual(["a"])
    expect(isGroupLayoutValid(layers, kept)).toBe(true)
  })
})

describe("segments, visibility and style", () => {
  it("lists layers and group runs bottom to top", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    assignLayerToGroup(layers, groups, "l2", g.id)
    const seg = layerSegments(layers, groups)
    expect(seg.map((s) => (s.kind === "layer" ? `L${s.index}` : `G${s.start}-${s.end}`))).toEqual(["L0", "G1-2", "L3", "L4"])
  })

  it("hides members of hidden or fully transparent groups", () => {
    const layers = stack(2)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayer(layers, groups, "l1", "G")!
    expect(layerEffectivelyHidden(layers[1]!, groups)).toBe(false)
    updateGroupStyle(g, { visible: false })
    expect(layerEffectivelyHidden(layers[1]!, groups)).toBe(true)
    updateGroupStyle(g, { visible: true, opacity: 0 })
    expect(layerEffectivelyHidden(layers[1]!, groups)).toBe(true)
    expect(layerEffectivelyHidden(layers[0]!, groups)).toBe(false)
  })

  it("clamps and validates style changes and reports whether anything changed", () => {
    const g: PixelGroupRuntime = { id: "g", name: "G", visible: true, opacity: 100, blend: "normal", collapsed: false }
    expect(updateGroupStyle(g, { opacity: 400, blend: "multiply", name: "  Trees  " })).toBe(true)
    expect([g.opacity, g.blend, g.name]).toEqual([100, "multiply", "Trees"])
    expect(updateGroupStyle(g, { opacity: 40 })).toBe(true)
    expect(updateGroupStyle(g, { opacity: 40, name: "   ", blend: "bogus" as never })).toBe(false)
  })
})

describe("grouping several layers at once", () => {
  it("wraps a contiguous range without reordering anything", () => {
    const layers = stack(5)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayers(layers, groups, ["l1", "l2", "l3"], "Trees")!
    expect(order(layers)).toEqual(["l0", "l1", "l2", "l3", "l4"])
    expect(layers.filter((l) => l.group === g.id).map((l) => l.id)).toEqual(["l1", "l2", "l3"])
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("gathers a gapped pick at the topmost layer and keeps relative order", () => {
    const layers = stack(6)
    const groups: PixelGroupRuntime[] = []
    const g = createGroupFromLayers(layers, groups, ["l3", "l0", "l4"], "G")!
    expect(order(layers)).toEqual(["l1", "l2", "l0", "l3", "l4", "l5"])
    expect(layers.filter((l) => l.group === g.id).map((l) => l.id)).toEqual(["l0", "l3", "l4"])
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("never splits an existing group when gathering around it", () => {
    const layers = stack(6)
    const groups: PixelGroupRuntime[] = []
    const existing = createGroupFromLayer(layers, groups, "l2", "Old")!
    assignLayerToGroup(layers, groups, "l3", existing.id)
    const g = createGroupFromLayers(layers, groups, ["l1", "l4"], "New")!
    expect(order(layers)).toEqual(["l0", "l2", "l3", "l1", "l4", "l5"])
    expect(layers.filter((l) => l.group === existing.id).map((l) => l.id)).toEqual(["l2", "l3"])
    expect(layers.filter((l) => l.group === g.id).map((l) => l.id)).toEqual(["l1", "l4"])
    expect(isGroupLayoutValid(layers, groups)).toBe(true)
  })

  it("refuses empty picks, unknown layers and layers that are already grouped", () => {
    const layers = stack(4)
    const groups: PixelGroupRuntime[] = []
    expect(createGroupFromLayers(layers, groups, [], "x")).toBeNull()
    expect(createGroupFromLayers(layers, groups, ["l1", "nope"], "x")).toBeNull()
    createGroupFromLayer(layers, groups, "l1", "G")
    const before = order(layers)
    expect(createGroupFromLayers(layers, groups, ["l1", "l2"], "x")).toBeNull()
    expect(order(layers)).toEqual(before)
    expect(groups).toHaveLength(1)
  })
})
