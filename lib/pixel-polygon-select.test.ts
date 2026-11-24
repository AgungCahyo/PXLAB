import { describe, expect, it } from "vitest"
import {
  POLYGON_SELECT_CLOSE_DIST,
  pointInSelection,
  selectionFromPolygonVertices,
  type PixelSelection,
} from "./pixel"

const W = 20
const H = 20

function cells(sel: PixelSelection | null) {
  const out: string[] = []
  if (!sel) return out
  for (let y = 0; y < H; y += 1)
    for (let x = 0; x < W; x += 1) if (pointInSelection(x, y, sel)) out.push(`${x},${y}`)
  return out
}

describe("selectionFromPolygonVertices", () => {
  it("selects a rectangle exactly, vertices included", () => {
    const sel = selectionFromPolygonVertices(
      [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 2, y: 5 }],
      W,
      H,
    )!
    expect(sel.x).toBe(2)
    expect(sel.y).toBe(3)
    expect(sel.width).toBe(5)
    expect(sel.height).toBe(3)
    expect(cells(sel)).toHaveLength(15)
  })

  it("is independent of vertex order and starting vertex", () => {
    const tri = [{ x: 1, y: 1 }, { x: 12, y: 3 }, { x: 5, y: 14 }]
    const a = cells(selectionFromPolygonVertices(tri, W, H))
    const b = cells(selectionFromPolygonVertices([tri[1]!, tri[2]!, tri[0]!], W, H))
    const c = cells(selectionFromPolygonVertices([...tri].reverse(), W, H))
    expect(a.length).toBeGreaterThan(20)
    expect(b).toEqual(a)
    expect(c).toEqual(a)
  })

  it("always contains every vertex and every outline cell (no gaps in thin shapes)", () => {
    const sliver = [{ x: 1, y: 1 }, { x: 18, y: 2 }, { x: 1, y: 2 }]
    const sel = selectionFromPolygonVertices(sliver, W, H)!
    for (const v of sliver) expect(pointInSelection(v.x, v.y, sel)).toBe(true)
    for (let x = 1; x <= 18; x += 1) {
      const y = Math.round(1 + ((x - 1) / 17) * 1)
      expect(pointInSelection(x, y, sel)).toBe(true)
    }
  })

  it("keeps concave notches unselected", () => {
    // U shape: the inner notch (cells 5..6 x 1..3) must stay out.
    const u = [
      { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 7, y: 4 },
      { x: 7, y: 1 }, { x: 9, y: 1 }, { x: 9, y: 8 }, { x: 2, y: 8 },
    ]
    const sel = selectionFromPolygonVertices(u, W, H)!
    expect(pointInSelection(5, 2, sel)).toBe(false)
    expect(pointInSelection(6, 3, sel)).toBe(false)
    expect(pointInSelection(3, 2, sel)).toBe(true)
    expect(pointInSelection(8, 2, sel)).toBe(true)
    expect(pointInSelection(5, 6, sel)).toBe(true)
  })

  it("uses even-odd for a self-crossing outline (the bow-tie overlap pinches out)", () => {
    const bow = [{ x: 2, y: 2 }, { x: 12, y: 12 }, { x: 12, y: 2 }, { x: 2, y: 12 }]
    const sel = selectionFromPolygonVertices(bow, W, H)!
    expect(pointInSelection(11, 7, sel)).toBe(true) // right lobe
    expect(pointInSelection(3, 7, sel)).toBe(true) // left lobe
    expect(pointInSelection(7, 3, sel)).toBe(false) // top gap between lobes
    expect(pointInSelection(7, 11, sel)).toBe(false) // bottom gap
  })

  it("clips to the canvas and tolerates off-canvas vertices", () => {
    const sel = selectionFromPolygonVertices(
      [{ x: -10, y: -10 }, { x: 30, y: -10 }, { x: 30, y: 30 }, { x: -10, y: 30 }],
      W,
      H,
    )!
    expect(cells(sel)).toHaveLength(W * H)
    expect([sel.x, sel.y, sel.width, sel.height]).toEqual([0, 0, W, H])
  })

  it("returns null with fewer than 3 distinct vertices and ignores repeated clicks", () => {
    expect(selectionFromPolygonVertices([{ x: 1, y: 1 }, { x: 5, y: 5 }], W, H)).toBeNull()
    expect(
      selectionFromPolygonVertices([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 5, y: 5 }, { x: 5, y: 5 }], W, H),
    ).toBeNull()
    const closedExplicitly = selectionFromPolygonVertices(
      [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 8 }, { x: 2, y: 2 }],
      W,
      H,
    )
    const open = selectionFromPolygonVertices([{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 8 }], W, H)
    expect(cells(closedExplicitly)).toEqual(cells(open))
  })

  it("a collinear 'polygon' selects its line instead of nothing", () => {
    const sel = selectionFromPolygonVertices([{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 9, y: 1 }], W, H)!
    expect(cells(sel)).toHaveLength(9)
  })

  it("exports the close distance used by the tool", () => {
    expect(POLYGON_SELECT_CLOSE_DIST).toBeGreaterThanOrEqual(1)
  })
})
