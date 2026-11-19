import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { PIXEL_PAPER, PIXEL_SWATCHES } from "@/lib/pixel"
import {
  BUILTIN_PALETTES,
  PALETTE_LIBRARY_CATEGORIES,
  documentContainsPalette,
  filterLibraryPalettes,
  listLibraryPalettes,
  mergeLibraryColorsIntoDocument,
  normalizeLibraryColors,
} from "@/lib/pixel-palette-library"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("pixel palette library", () => {
  it("ships only non-empty built-in categories with valid hex colors", () => {
    const used = new Set(BUILTIN_PALETTES.map((palette) => palette.category))
    for (const category of PALETTE_LIBRARY_CATEGORIES) {
      expect(used.has(category)).toBe(true)
    }
    for (const palette of BUILTIN_PALETTES) {
      const colors = normalizeLibraryColors(palette.colors)
      expect(colors.length).toBeGreaterThan(0)
      expect(colors).not.toContain(PIXEL_PAPER)
      expect(colors.length).toBe(new Set(colors).size)
    }
  })

  it("merges library colors without removing existing document colors", () => {
    const doc = [PIXEL_PAPER, "#FF0000", "#00FF00"]
    const result = mergeLibraryColorsIntoDocument(doc, ["#00FF00", "#0000FF", PIXEL_PAPER])
    expect(result.palette[0]).toBe(PIXEL_PAPER)
    expect(result.palette).toContain("#FF0000")
    expect(result.palette).toContain("#00FF00")
    expect(result.palette).toContain("#0000FF")
    expect(result.added).toBe(1)
    expect(result.truncated).toBe(false)
  })

  it("detects when the document already contains a library set", () => {
    const classic = [...PIXEL_SWATCHES]
    expect(documentContainsPalette([PIXEL_PAPER, ...classic], classic)).toBe(true)
    expect(documentContainsPalette([PIXEL_PAPER, classic[0]!], classic)).toBe(false)
  })

  it("filters by category and search without inventing empty buckets", () => {
    const list = listLibraryPalettes([])
    const retro = filterLibraryPalettes(list, "", "retro", "en")
    expect(retro.length).toBeGreaterThan(0)
    expect(retro.every((item) => item.category === "retro")).toBe(true)
    const search = filterLibraryPalettes(list, "ocean", "all", "en")
    expect(search.some((item) => item.id === "ocean")).toBe(true)
  })

  it("wires the studio picker to ensureColors without remapping pixels", () => {
    const picker = read("components/creations/ColorPicker.tsx")
    const form = read("components/creations/PlaygroundForm.tsx")
    const board = read("components/canvas/PixelBoard.tsx")
    expect(picker).toMatch(/onEnsureColors/)
    expect(picker).toMatch(/paletteDisplayName/)
    expect(picker).toMatch(/pixelPaletteLibrary/)
    expect(form).toMatch(/onEnsureColors/)
    expect(form).toMatch(/ensureColors/)
    expect(board).toMatch(/ensureColors:/)
    expect(board).toMatch(/Never remaps indices/)
  })
})
