import { describe, expect, it } from "vitest"
import {
  blitRect,
  clearRectToPaper,
  clipboardIsEmpty,
  extractObject,
  extractRect,
  hexToRgb,
  PIXEL_PAPER,
  type PixelSelection,
} from "./pixel"

const W = 12
const H = 8
const PAPER = hexToRgb(PIXEL_PAPER)
const RED: [number, number, number] = [255, 0, 0]
const BLUE: [number, number, number] = [0, 0, 255]

function canvas() {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i += 1) px.set([...PAPER, 255], i * 4)
  return px
}
const put = (px: Uint8ClampedArray, x: number, y: number, c: readonly number[]) => px.set([c[0]!, c[1]!, c[2]!, 255], (y * W + x) * 4)
const get = (px: Uint8ClampedArray, x: number, y: number) => Array.from(px.slice((y * W + x) * 4, (y * W + x) * 4 + 3))

describe("lifting a selection as an object", () => {
  it("keeps empty (Paper) cells out of the object", () => {
    const px = canvas()
    put(px, 3, 3, RED)
    put(px, 4, 3, RED)
    const sel: PixelSelection = { x: 2, y: 2, width: 5, height: 3 }
    const clip = extractObject(px, sel, W, H)
    expect(clip.mask).toBeDefined()
    const solid = Array.from(clip.mask!).reduce((a, b) => a + b, 0)
    expect(solid).toBe(2)
    expect(clip.mask![1 * 5 + 1]).toBe(1) // (3,3)
    expect(clip.mask![0]).toBe(0) // (2,2) empty
    // the old behaviour copied every cell as a solid block
    expect(extractRect(px, sel, W, H).mask).toBeUndefined()
  })

  it("moving an object over other content does not wipe that content where the object was empty (regression)", () => {
    const px = canvas()
    // sprite: a red L shape with empty cells inside its bounding box
    put(px, 1, 1, RED)
    put(px, 1, 2, RED)
    put(px, 2, 2, RED)
    // background content elsewhere (blue column)
    for (let y = 0; y < H; y += 1) put(px, 6, y, BLUE)
    const sel: PixelSelection = { x: 1, y: 1, width: 3, height: 2 }
    const clip = extractObject(px, sel, W, H)
    clearRectToPaper(px, sel, W, H) // lift leaves a hole
    // drop it so the empty top-right cell of the box lands on the blue column
    blitRect(px, clip, 5, 3, W, H)
    expect(get(px, 5, 3)).toEqual(RED) // object cell
    expect(get(px, 6, 3)).toEqual(Array.from(BLUE)) // empty cell of the object: blue survives
    expect(get(px, 6, 4)).toEqual(RED) // object cell on top of blue
    expect(get(px, 1, 1)).toEqual(Array.from(PAPER)) // hole where it was
  })

  it("respects a non-rectangular selection and still drops transparent cells", () => {
    const px = canvas()
    put(px, 2, 2, RED)
    put(px, 3, 2, RED)
    put(px, 4, 2, RED)
    const sel: PixelSelection = { x: 2, y: 2, width: 3, height: 1, mask: new Uint8Array([1, 1, 0]) }
    const clip = extractObject(px, sel, W, H)
    expect(Array.from(clip.mask!)).toEqual([1, 1, 0])
  })

  it("omits the mask when every cell of a plain rectangle is solid", () => {
    const px = canvas()
    for (let y = 2; y < 4; y += 1) for (let x = 2; x < 5; x += 1) put(px, x, y, RED)
    const clip = extractObject(px, { x: 2, y: 2, width: 3, height: 2 }, W, H)
    expect(clip.mask).toBeUndefined()
    expect(clipboardIsEmpty(clip)).toBe(false)
  })

  it("a selection over empty canvas yields an empty object", () => {
    const clip = extractObject(canvas(), { x: 1, y: 1, width: 4, height: 4 }, W, H)
    expect(clipboardIsEmpty(clip)).toBe(true)
    const px = canvas()
    put(px, 8, 6, BLUE)
    const before = new Uint8ClampedArray(px)
    blitRect(px, clip, 8, 4, W, H)
    expect(Array.from(px)).toEqual(Array.from(before))
  })

  it("cells outside the canvas are never part of the object", () => {
    const px = canvas()
    put(px, 0, 0, RED)
    const clip = extractObject(px, { x: -2, y: -2, width: 4, height: 4 }, W, H)
    const solid = Array.from(clip.mask!).reduce((a, b) => a + b, 0)
    expect(solid).toBe(1)
    expect(clip.mask![2 * 4 + 2]).toBe(1)
  })

  it("uses the document's own paper colour when it differs from the default", () => {
    const px = canvas()
    const custom: [number, number, number] = [10, 20, 30]
    for (let i = 0; i < W * H; i += 1) px.set([...custom, 255], i * 4)
    put(px, 2, 2, RED)
    const clip = extractObject(px, { x: 1, y: 1, width: 3, height: 3 }, W, H, custom)
    expect(Array.from(clip.mask!).reduce((a, b) => a + b, 0)).toBe(1)
  })
})
