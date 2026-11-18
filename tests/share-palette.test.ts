import { describe, expect, it } from "vitest"
import {
  SOCIAL_IVORY,
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

  it("keeps a warm ivory editorial system (never dark panels)", () => {
    const bright = socialCardPalette([
      { hex: "#ffd447", count: 40 },
      { hex: "#59bceb", count: 20 },
    ])
    expect(hexLuminance(bright.canvasBg)).toBeGreaterThan(0.8)
    expect(hexLuminance(bright.artStageBg)).toBeGreaterThan(0.7)
    expect(hexLuminance(bright.ink)).toBeLessThan(0.2)
    expect(bright.artStageBg.toLowerCase()).not.toBe("#0a0b10")
    expect(bright.canvasBg.toLowerCase()).not.toMatch(/^#0/)
    expect(bright.canvasBg.toLowerCase()).not.toMatch(/^#1/)
  })

  it("tints ivory from dark artwork without going black", () => {
    const dark = socialCardPalette([{ hex: "#111111", count: 80 }])
    expect(dark.artIsDark).toBe(true)
    expect(hexLuminance(dark.artStageBg)).toBeGreaterThan(0.75)
    expect(hexLuminance(dark.canvasBg)).toBeGreaterThan(0.8)
  })

  it("defaults toward warm ivory when usage is empty", () => {
    const empty = socialCardPalette(null)
    expect(hexLuminance(empty.canvasBg)).toBeGreaterThan(0.85)
    expect(mixHex(SOCIAL_IVORY, SOCIAL_IVORY, 0)).toBe(SOCIAL_IVORY)
  })

  it("mixes hex colors", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080")
  })
})
