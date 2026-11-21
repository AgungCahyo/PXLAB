import { describe, expect, it } from "vitest"
import { isLargeTile, mosaicSlot, mosaicTileClass } from "@/lib/social-mosaic"

describe("mosaicSlot", () => {
  it("makes exactly one large tile per block of five, first in the block", () => {
    const large = Array.from({ length: 20 }, (_, i) => i).filter((i) => mosaicSlot(i).large)
    expect(large).toEqual([0, 5, 10, 15])
  })

  it("alternates the large tile between left and right blocks", () => {
    expect([0, 5, 10, 15].map((i) => mosaicSlot(i).side)).toEqual(["left", "right", "left", "right"])
  })

  it("is stable: earlier slots never depend on how many tiles are loaded", () => {
    const first = Array.from({ length: 12 }, (_, i) => mosaicSlot(i))
    const more = Array.from({ length: 30 }, (_, i) => mosaicSlot(i)).slice(0, 12)
    expect(more).toEqual(first)
  })
})

describe("isLargeTile", () => {
  it("keeps the rhythm while more pages may load", () => {
    expect(isLargeTile(10, 12, false)).toBe(true)
  })

  it("does not end a finished feed on a lone large tile", () => {
    // 12 works, no more pages: block 2 (10, 11) is partial → both small
    expect(isLargeTile(10, 12, true)).toBe(false)
    expect(isLargeTile(5, 12, true)).toBe(true)
    expect(isLargeTile(0, 12, true)).toBe(true)
  })

  it("keeps every large tile when the final block is complete", () => {
    expect(isLargeTile(10, 15, true)).toBe(true)
  })

  it("handles a tiny finished list", () => {
    expect(isLargeTile(0, 1, true)).toBe(false)
    expect(isLargeTile(0, 5, true)).toBe(true)
  })
})

describe("mosaicTileClass", () => {
  it("only large tiles span, right-side ones start at column 3 from sm up", () => {
    expect(mosaicTileClass(1, false)).toBe("")
    expect(mosaicTileClass(0, true)).toBe("col-span-2 row-span-2")
    expect(mosaicTileClass(5, true)).toContain("sm:col-start-3")
  })
})

import { segmentWithBands } from "@/lib/social-mosaic"

describe("segmentWithBands", () => {
  const items = Array.from({ length: 12 }, (_, i) => i)

  it("places a band inside the flow and keeps global tile indexes", () => {
    const segs = segmentWithBands(items, [{ at: 5, node: "creators" }], false)
    expect(segs.map((s) => s.kind)).toEqual(["tiles", "band", "tiles"])
    expect(segs[0]).toMatchObject({ start: 0, items: [0, 1, 2, 3, 4] })
    expect(segs[2]).toMatchObject({ start: 5 })
    expect((segs[2] as { items: number[] }).items).toHaveLength(7)
  })

  it("holds a band back until its position is loaded (more pages to come)", () => {
    const segs = segmentWithBands(items, [{ at: 15, node: "quiet" }], false)
    expect(segs.map((s) => s.kind)).toEqual(["tiles"])
  })

  it("shows an unreached band at the end once the feed is complete", () => {
    const segs = segmentWithBands(items, [{ at: 15, node: "quiet" }], true)
    expect(segs.map((s) => s.kind)).toEqual(["tiles", "band"])
  })

  it("supports several bands and never duplicates or drops a work", () => {
    const segs = segmentWithBands(items, [{ at: 10, node: "b" }, { at: 5, node: "a" }], true)
    expect(segs.map((s) => s.kind)).toEqual(["tiles", "band", "tiles", "band", "tiles"])
    const all = segs.flatMap((s) => (s.kind === "tiles" ? s.items : []))
    expect(all).toEqual(items)
  })

  it("works with no bands", () => {
    expect(segmentWithBands(items, [], true)).toEqual([{ kind: "tiles", start: 0, items }])
  })
})
