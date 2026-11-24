import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { clampCameraOrigin, clampZoomFocus, zoomToward } from "../lib/pixel"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("studio camera stays on the artwork", () => {
  it("projects a wheel anchor outside the canvas onto the nearest canvas edge", () => {
    const focus = clampZoomFocus({
      focusX: 750,
      focusY: 550,
      originX: 144,
      originY: 44,
      scale: 8,
      canvasWidth: 64,
      canvasHeight: 64,
    })
    expect(focus.focusX).toBe(656) // 144 + 64 * 8
    expect(focus.focusY).toBe(550) // already inside 44..556
  })

  it("keeps the viewport covered by the image when zooming from the desk", () => {
    const viewWidth = 800
    const viewHeight = 600
    const canvasWidth = 64
    const canvasHeight = 64
    const nextScale = 16
    const focus = clampZoomFocus({
      focusX: 750,
      focusY: 550,
      originX: 144,
      originY: 44,
      scale: 8,
      canvasWidth,
      canvasHeight,
    })
    const zoomed = zoomToward({
      originX: 144,
      originY: 44,
      scale: 8,
      nextScale,
      focusX: focus.focusX,
      focusY: focus.focusY,
    })
    const origin = clampCameraOrigin({
      ...zoomed,
      scale: nextScale,
      viewWidth,
      viewHeight,
      canvasWidth,
      canvasHeight,
      dpr: 1,
    })
    expect(origin.originX).toBeLessThanOrEqual(0)
    expect(origin.originX + canvasWidth * nextScale).toBeGreaterThanOrEqual(viewWidth)
    expect(origin.originY).toBeLessThanOrEqual(0)
    expect(origin.originY + canvasHeight * nextScale).toBeGreaterThanOrEqual(viewHeight)
  })

  it("bounds pan to the canvas rect and never drags desk pixels into the view", () => {
    const large = clampCameraOrigin({
      originX: -500,
      originY: 100,
      scale: 16,
      viewWidth: 800,
      viewHeight: 600,
      canvasWidth: 64,
      canvasHeight: 64,
      dpr: 1,
    })
    expect(large).toEqual({ originX: -224, originY: 0 })

    const small = clampCameraOrigin({
      originX: -50,
      originY: 500,
      scale: 4,
      viewWidth: 800,
      viewHeight: 600,
      canvasWidth: 64,
      canvasHeight: 64,
      dpr: 1,
    })
    expect(small).toEqual({ originX: 0, originY: 344 })
  })

  it("clamps to the integer device cell actually painted", () => {
    const origin = clampCameraOrigin({
      originX: -1000,
      originY: 500,
      scale: 13.1,
      viewWidth: 800,
      viewHeight: 1000,
      canvasWidth: 64,
      canvasHeight: 64,
      dpr: 1,
    })
    // 13.1 cells are painted as 13 device pixels at DPR 1.
    expect(origin).toEqual({ originX: -32, originY: 168 })
  })
})

describe("studio tool rail focus follows only keyboard shortcuts", () => {
  it("tags shortcut tool changes and transfers focus without stealing it elsewhere", () => {
    const board = read("components/canvas/PixelBoard.tsx")
    const form = read("components/creations/PlaygroundForm.tsx")

    expect(board).toMatch(/export type ToolChangeSource = "shortcut" \| "programmatic"/)
    expect(board).toMatch(/onToolChange\?: \(tool: Tool, source: ToolChangeSource\) => void/)
    expect(board).toMatch(/chooseToolRef\.current\(next, "shortcut"\)/)
    expect(form).toMatch(/pendingToolFocusRef/)
    expect(form).toMatch(/pending\.fromShortcut/)
    expect(form).toMatch(/activeSurface \?\?/)
    expect(form).toMatch(/focus\(\{ preventScroll: true \}\)/)
    expect(form).toMatch(/if \(next === tool\) queueMicrotask\(focusPendingTool\)/)
    expect(form).toMatch(/pendingToolFocusRef\.current = null/)
    expect(form).toMatch(/onToolChange=\{handleToolChange\}/)
    expect(form).toMatch(/onClick=\{\(\) => handleToolChange\(value, "programmatic"\)\}/)
  })

  it("keeps the camera clamped in every viewport mutation and paints a distinct desk", () => {
    const board = read("components/canvas/PixelBoard.tsx")
    expect(board).toMatch(/clampZoomFocus\(\{/)
    expect(board.match(/clampCameraOrigin\(\{/g)?.length).toBeGreaterThanOrEqual(6)
    expect(board).toMatch(/variant === "studio" \? "#12111f" : "#f1f0f8"/)
  })
})
