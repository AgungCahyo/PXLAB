import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { PIXEL_DOCUMENT_PALETTE_MAX, PIXEL_PAPER, ensurePaletteColor } from "@/lib/pixel"
import { mergeLibraryColorsIntoDocument } from "@/lib/pixel-palette-library"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("palette UX fixes", () => {
  it("unifies ColorPicker without Set/Warna tabs", () => {
    const picker = read("components/creations/ColorPicker.tsx")
    expect(picker).not.toMatch(/role="tablist"/)
    expect(picker).not.toMatch(/pixelPaletteSetsTab/)
    expect(picker).not.toMatch(/pixelPalettePickTab/)
    expect(picker).toMatch(/pixelPaletteDocument/)
    expect(picker).toMatch(/pixelPaletteEditor/)
    expect(picker).toMatch(/pixelPaletteLibrary/)
    expect(picker).toMatch(/pixelPaletteCapacity/)
    expect(picker).toMatch(/pixelPaletteAddColor/)
  })

  it("keeps manage dialog open after delete/replace", () => {
    const manage = read("components/creations/DocumentPaletteDialog.tsx")
    expect(manage).toMatch(/Stay open/)
    expect(manage).toMatch(/onRemove\(removing\)/)
    expect(manage).toMatch(/onReplace\(selected, to\)/)
    // Mutations must not auto-dismiss the dialog.
    const removeHandler = manage.slice(manage.indexOf("onRemove(removing)"))
    expect(removeHandler.slice(0, 180)).not.toMatch(/onClose\(/)
    const replaceHandler = manage.slice(manage.indexOf("onReplace(selected, to)"))
    expect(replaceHandler.slice(0, 220)).not.toMatch(/onClose\(/)
  })

  it("exposes capacity and remaps layer indices on remove", () => {
    expect(PIXEL_DOCUMENT_PALETTE_MAX).toBe(256)
    const board = read("components/canvas/PixelBoard.tsx")
    expect(board).toMatch(/removedIndex/)
    expect(board).toMatch(/value === removedIndex/)
    expect(board).toMatch(/loadActiveIntoImage\(\)/)
    const picker = read("components/creations/ColorPicker.tsx")
    expect(picker).toMatch(/PIXEL_DOCUMENT_PALETTE_MAX/)
    expect(picker).toMatch(/fullMessage/)
  })

  it("adds colors until full then reports palette_full", () => {
    const palette = [PIXEL_PAPER]
    for (let i = 1; i < 8; i += 1) {
      const hex = `#${i.toString(16).padStart(6, "0")}`.toUpperCase()
      const result = ensurePaletteColor(palette, hex)
      expect("palette" in result).toBe(true)
      if ("palette" in result) palette.splice(0, palette.length, ...result.palette)
    }
    expect(palette.length).toBe(8)
    expect(palette.length).toBeLessThan(PIXEL_DOCUMENT_PALETTE_MAX)

    const nearFull = [PIXEL_PAPER]
    for (let i = 1; i < PIXEL_DOCUMENT_PALETTE_MAX; i += 1) {
      const hex = `#${i.toString(16).padStart(6, "0")}`.toUpperCase()
      const result = ensurePaletteColor(nearFull, hex)
      if ("palette" in result) nearFull.splice(0, nearFull.length, ...result.palette)
    }
    expect(nearFull).toHaveLength(PIXEL_DOCUMENT_PALETTE_MAX)
    expect(ensurePaletteColor(nearFull, "#FEDCBA")).toEqual({ error: "palette_full" })

    const merged = mergeLibraryColorsIntoDocument(nearFull, ["#FEDCBA", "#ABCDEF"])
    expect(merged.truncated).toBe(true)
    expect(merged.added).toBe(0)
  })
})
