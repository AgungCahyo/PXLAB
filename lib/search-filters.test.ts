import { describe, expect, it } from "vitest"
import {
  normalizeSearchValue,
  searchLikePattern,
  searchTagValue,
} from "@/lib/creations"
import { SEARCH_MIN_LENGTH } from "@/lib/site"

describe("unified search normalization", () => {
  it("normalizes optional hashtags and whitespace", () => {
    expect(normalizeSearchValue("  #Pixel   Art  ")).toBe("Pixel Art")
    expect(normalizeSearchValue("###")).toBe("##")
  })

  it("builds a PostgREST-safe ilike pattern", () => {
    expect(searchLikePattern("  pixel art  ")).toBe("%pixel art%")
    expect(searchLikePattern("100%_ok")).toBe("%100\\%\\_ok%")
    expect(searchLikePattern("a,b(c):d.e")).toBe("%a b c d e%")
    expect(searchLikePattern("#pixel")).toBe("%pixel%")
  })

  it("derives canonical tags from free-form queries", () => {
    expect(searchTagValue("#Pixel Art")).toBe("pixel_art")
    expect(searchTagValue("pixel_art")).toBe("pixel_art")
    expect(searchTagValue("a")).toBeNull()
  })

  it("keeps the explicit-search minimum", () => {
    expect(SEARCH_MIN_LENGTH).toBe(2)
  })
})
