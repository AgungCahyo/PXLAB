import { describe, expect, it } from "vitest"
import {
  hexLuminance,
  mixHex,
  socialArtAspect,
  socialCardPalette,
} from "@/lib/share-palette"

describe("share palette helpers", () => {
  it("classifies aspect ratios", () => {
    expect(socialArtAspect(64, 64)).toBe("square")
    expect(socialArtAspect(96, 48)).toBe("landscape")
    expect(socialArtAspect(48, 80)).toBe("portrait")
  })

  it("derives dark editorial stage colors from bright palettes (no cream card)", () => {
    const bright = socialCardPalette([
      { hex: "#ffd447", count: 40 },
      { hex: "#59bceb", count: 20 },
    ])
    expect(bright.artStageBg.toLowerCase()).not.toBe("#fffdf7")
    expect(bright.artStageBg.toLowerCase()).not.toBe("#f4f1e8")
    expect(hexLuminance(bright.panelBg)).toBeLessThan(0.25)
    expect(bright.accent.toLowerCase()).toBe("#ffd447")
  })

  it("keeps dark artwork stages dark", () => {
    const dark = socialCardPalette([{ hex: "#111111", count: 80 }])
    expect(dark.artIsDark).toBe(true)
    expect(hexLuminance(dark.artStageBg)).toBeLessThan(0.2)
  })

  it("mixes hex colors", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080")
  })
})
