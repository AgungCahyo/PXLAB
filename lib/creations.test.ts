import { describe, expect, it } from "vitest"
import {
  exploreHref,
  ilikeContains,
  parseExploreCategory,
  parseExploreSearch,
} from "@/lib/creations"
import { pixelSizeCategory } from "./pixel"

describe("explore query", () => {
  it("defaults to an unfiltered explore path", () => {
    expect(exploreHref("id")).toBe("/explore")
    expect(exploreHref("en")).toBe("/en/explore")
  })

  it("parses size category and search query", () => {
    expect(parseExploreCategory()).toBe("all")
    expect(parseExploreCategory("sprite")).toBe("sprite")
    expect(parseExploreCategory("character")).toBe("all")
    expect(parseExploreSearch("  kota  ")).toBe("kota")
    expect(parseExploreSearch("x".repeat(100)).length).toBe(80)
  })

  it("builds explore urls with size and search", () => {
    expect(exploreHref("id", { category: "sprite" })).toBe("/explore?category=sprite")
    expect(exploreHref("id", { q: "langit", category: "icon", page: 2 })).toBe(
      "/explore?category=icon&q=langit&page=2",
    )
    expect(exploreHref("en", { q: "moon", page: 2 })).toBe("/en/explore?q=moon&page=2")
  })

  it("escapes ilike wildcards", () => {
    expect(ilikeContains("100%_ok")).toBe("%100\\%\\_ok%")
  })
})

describe("pixelSizeCategory", () => {
  it("maps presets and custom sizes", () => {
    expect(pixelSizeCategory(64, 64)).toBe("sprite")
    expect(pixelSizeCategory(16, 16)).toBe("icon")
    expect(pixelSizeCategory(128, 64)).toBe("custom")
  })
})
