/**
 * Named palette library for Studio browsing.
 * Built-ins are curated drawing sets. Applying a set only appends colors to the
 * document palette — never remaps existing pixel indices.
 */
import type { Bi } from "@/lib/i18n"
import {
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_INK,
  PIXEL_PAPER,
  PIXEL_SWATCHES,
  ensurePaletteColor,
  normalizePixelHex,
} from "@/lib/pixel"

export type PaletteLibraryCategory = "builtin" | "retro" | "nature" | "pastel" | "mono" | "custom"

export type BuiltinNamedPalette = {
  id: string
  category: Exclude<PaletteLibraryCategory, "custom">
  name: Bi
  colors: readonly string[]
}

export type CustomNamedPalette = {
  id: string
  category: "custom"
  name: string
  colors: string[]
  updatedAt: string
}

export type LibraryPalette = BuiltinNamedPalette | CustomNamedPalette

const CUSTOM_KEY = "pxlb.pixel.custom-palettes"
const CUSTOM_MAX = 32
const CUSTOM_NAME_MAX = 40

/** Built-in sets only — every category listed here has at least one palette. */
export const BUILTIN_PALETTES: readonly BuiltinNamedPalette[] = [
  {
    id: "pxlb-classic",
    category: "builtin",
    name: { id: "PXLB Klasik", en: "PXLB Classic" },
    colors: [...PIXEL_SWATCHES],
  },
  {
    id: "ink-basic",
    category: "builtin",
    name: { id: "Tinta dasar", en: "Ink basics" },
    colors: [PIXEL_INK, "#4A4E5A", "#8B909C", "#C4C7CE", "#E94B3C", "#59BCEB"],
  },
  {
    id: "handheld-green",
    category: "retro",
    name: { id: "Layar hijau", en: "Green screen" },
    colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  },
  {
    id: "arcade-bright",
    category: "retro",
    name: { id: "Arkade terang", en: "Arcade bright" },
    colors: [
      "#20202A",
      "#FFFFFF",
      "#E94B3C",
      "#FFD447",
      "#45A849",
      "#59BCEB",
      "#9B6BFF",
      "#FF75B5",
    ],
  },
  {
    id: "crt-dusk",
    category: "retro",
    name: { id: "Senja CRT", en: "CRT dusk" },
    colors: ["#1A1423", "#3D2C56", "#7B5EA7", "#E8A87C", "#F2D0A4", "#85CDCA"],
  },
  {
    id: "forest",
    category: "nature",
    name: { id: "Hutan", en: "Forest" },
    colors: ["#1B2E1A", "#2F5233", "#4E7A45", "#8FBF6A", "#C7DE9C", "#5C4033", "#A67C52"],
  },
  {
    id: "ocean",
    category: "nature",
    name: { id: "Laut", en: "Ocean" },
    colors: ["#0B1D2A", "#123C55", "#1F6F8B", "#2CA6A4", "#7FDBDA", "#F4F1E8", "#E8B86D"],
  },
  {
    id: "sunset",
    category: "nature",
    name: { id: "Matahari terbenam", en: "Sunset" },
    colors: ["#2B1B2E", "#6B2D5C", "#C73E4A", "#F07F3C", "#F6C344", "#F8E7C0"],
  },
  {
    id: "soft-pastels",
    category: "pastel",
    name: { id: "Pastel lembut", en: "Soft pastels" },
    colors: ["#F6D6D6", "#F8E2C8", "#F3F0C8", "#D5EBD4", "#D0E4F5", "#E4D4F0", "#F0D6E8"],
  },
  {
    id: "chalk",
    category: "pastel",
    name: { id: "Kapur", en: "Chalk" },
    colors: ["#E8DFD0", "#D9C4B0", "#B8C5C0", "#C9B8D4", "#E0B8B8", "#B8C8E0", "#5A5A62"],
  },
  {
    id: "grayscale",
    category: "mono",
    name: { id: "Abu-abu", en: "Grayscale" },
    colors: ["#20202A", "#3A3A44", "#5C5C68", "#8A8A96", "#B8B8C0", "#DEDEE4"],
  },
  {
    id: "ink-wash",
    category: "mono",
    name: { id: "Cuci tinta", en: "Ink wash" },
    colors: ["#1A1C22", "#2E323C", "#4A5160", "#6E7688", "#9AA1B0"],
  },
] as const

export const PALETTE_LIBRARY_CATEGORIES: readonly Exclude<PaletteLibraryCategory, "custom">[] = [
  "builtin",
  "retro",
  "nature",
  "pastel",
  "mono",
]

export function paletteDisplayName(palette: LibraryPalette, lang: keyof Bi): string {
  if (palette.category === "custom") return palette.name
  return palette.name[lang]
}

export function normalizeLibraryColors(colors: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of colors) {
    const hex = normalizePixelHex(raw)
    if (!hex || hex === PIXEL_PAPER || out.includes(hex)) continue
    out.push(hex)
    if (out.length >= PIXEL_DOCUMENT_PALETTE_MAX - 1) break
  }
  return out
}

/** Append library colors into a document palette. Never remaps indices or removes colors. */
export function mergeLibraryColorsIntoDocument(
  documentPalette: readonly string[],
  libraryColors: readonly string[],
): { palette: string[]; added: number; truncated: boolean } {
  let palette =
    documentPalette.length > 0 && documentPalette[0] === PIXEL_PAPER
      ? [...documentPalette]
      : [PIXEL_PAPER, ...documentPalette.filter((c) => normalizePixelHex(c) !== PIXEL_PAPER)]
  let added = 0
  let truncated = false
  for (const hex of normalizeLibraryColors(libraryColors)) {
    const result = ensurePaletteColor(palette, hex)
    if ("error" in result) {
      if (result.error === "palette_full") truncated = true
      break
    }
    if (result.palette.length > palette.length) added += 1
    palette = result.palette
  }
  return { palette, added, truncated }
}

/** True when every library color is already present in the document (active match). */
export function documentContainsPalette(
  documentPalette: readonly string[],
  libraryColors: readonly string[],
): boolean {
  const doc = new Set(
    documentPalette
      .map((hex) => normalizePixelHex(hex))
      .filter((hex): hex is string => Boolean(hex) && hex !== PIXEL_PAPER),
  )
  const colors = normalizeLibraryColors(libraryColors)
  if (colors.length === 0) return false
  return colors.every((hex) => doc.has(hex))
}

function parseCustomList(raw: string | null): CustomNamedPalette[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: CustomNamedPalette[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      if (typeof row.id !== "string" || typeof row.name !== "string") continue
      if (!Array.isArray(row.colors)) continue
      const colors = normalizeLibraryColors(row.colors.filter((c): c is string => typeof c === "string"))
      if (colors.length === 0) continue
      const name = row.name.trim().slice(0, CUSTOM_NAME_MAX) || "Custom"
      out.push({
        id: row.id,
        category: "custom",
        name,
        colors,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
      })
      if (out.length >= CUSTOM_MAX) break
    }
    return out
  } catch {
    return []
  }
}

export function readCustomPalettes(): CustomNamedPalette[] {
  if (typeof window === "undefined") return []
  try {
    return parseCustomList(window.localStorage.getItem(CUSTOM_KEY))
  } catch {
    return []
  }
}

function writeCustomPalettes(list: CustomNamedPalette[]) {
  window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(0, CUSTOM_MAX)))
}

export function saveCustomPalette(input: {
  name: string
  colors: readonly string[]
  id?: string
}): CustomNamedPalette | null {
  const colors = normalizeLibraryColors(input.colors)
  if (colors.length === 0) return null
  const name = input.name.trim().slice(0, CUSTOM_NAME_MAX) || "Custom"
  const list = readCustomPalettes()
  const now = new Date().toISOString()
  if (input.id) {
    const index = list.findIndex((item) => item.id === input.id)
    if (index < 0) return null
    const next: CustomNamedPalette = {
      id: input.id,
      category: "custom",
      name,
      colors,
      updatedAt: now,
    }
    list[index] = next
    writeCustomPalettes(list)
    return next
  }
  const created: CustomNamedPalette = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    category: "custom",
    name,
    colors,
    updatedAt: now,
  }
  writeCustomPalettes([created, ...list].slice(0, CUSTOM_MAX))
  return created
}

export function duplicateCustomPalette(id: string, nameSuffix: string): CustomNamedPalette | null {
  const source = readCustomPalettes().find((item) => item.id === id)
  if (!source) return null
  const base = source.name.slice(0, Math.max(1, CUSTOM_NAME_MAX - nameSuffix.length))
  return saveCustomPalette({ name: `${base}${nameSuffix}`, colors: source.colors })
}

export function deleteCustomPalette(id: string): boolean {
  const list = readCustomPalettes()
  const next = list.filter((item) => item.id !== id)
  if (next.length === list.length) return false
  writeCustomPalettes(next)
  return true
}

export function listLibraryPalettes(custom: readonly CustomNamedPalette[] = readCustomPalettes()): LibraryPalette[] {
  return [...BUILTIN_PALETTES, ...custom]
}

export function filterLibraryPalettes(
  palettes: readonly LibraryPalette[],
  query: string,
  category: PaletteLibraryCategory | "all",
  lang: keyof Bi,
): LibraryPalette[] {
  const q = query.trim().toLowerCase()
  return palettes.filter((palette) => {
    if (category !== "all" && palette.category !== category) return false
    if (!q) return true
    const name = paletteDisplayName(palette, lang).toLowerCase()
    return name.includes(q) || palette.id.toLowerCase().includes(q)
  })
}
