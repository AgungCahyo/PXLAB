import { describe, expect, it } from "vitest"
import {
  PIXEL_ASPECT_PRESETS,
  PIXEL_CANVAS_AREA_MAX,
  PIXEL_CANVAS_MAX,
  PIXEL_CANVAS_MIN,
  PIXEL_SQUARE_PRESETS,
  isPixelCanvasSize,
  pixelSizeCategory,
} from "../lib/pixel"

describe("pixel canvas size stage 5", () => {
  it("allows a long side up to 1024 while capping area at 512²", () => {
    expect(PIXEL_CANVAS_MAX).toBe(1024)
    expect(PIXEL_CANVAS_AREA_MAX).toBe(512 * 512)
    expect(isPixelCanvasSize(1024, 256)).toBe(true)
    expect(isPixelCanvasSize(1024, 257)).toBe(false)
    expect(isPixelCanvasSize(512, 512)).toBe(true)
    expect(isPixelCanvasSize(513, 513)).toBe(false)
    expect(isPixelCanvasSize(PIXEL_CANVAS_MIN - 1, 64)).toBe(false)
  })

  it("keeps wallpaper aspect presets under the area cap", () => {
    for (const preset of PIXEL_ASPECT_PRESETS) {
      expect(isPixelCanvasSize(preset.width, preset.height)).toBe(true)
      expect(pixelSizeCategory(preset.width, preset.height)).toBe("custom")
    }
  })

  it("maps square presets to Explore categories and leaves custom for others", () => {
    for (const preset of PIXEL_SQUARE_PRESETS) {
      expect(pixelSizeCategory(preset.width, preset.height)).toBe(preset.id)
    }
    expect(pixelSizeCategory(128, 64)).toBe("custom")
  })
})
