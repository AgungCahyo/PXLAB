"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { usePixelColorMemory } from "@/lib/pixel-color-memory"
import {
  PALETTE_LIBRARY_CATEGORIES,
  deleteCustomPalette,
  documentContainsPalette,
  duplicateCustomPalette,
  filterLibraryPalettes,
  listLibraryPalettes,
  normalizeLibraryColors,
  paletteDisplayName,
  readCustomPalettes,
  saveCustomPalette,
  type CustomNamedPalette,
  type LibraryPalette,
  type PaletteLibraryCategory,
} from "@/lib/pixel-palette-library"
import {
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PAPER,
  PIXEL_SWATCHES,
  normalizePixelHex,
  paletteIndexOf,
} from "../../lib/pixel"
import { cn } from "@/lib/utils"

type CategoryFilter = PaletteLibraryCategory | "all"

export type EnsureColorsResult = {
  palette: string[]
  added: number
  truncated: boolean
}

export function ColorPicker({
  lang,
  open,
  onClose,
  value,
  documentPalette,
  onSelect,
  onEnsureColors,
  onOpenManage,
}: {
  lang: Lang
  open: boolean
  onClose: () => void
  value: string
  documentPalette: readonly string[]
  onSelect: (hex: string) => void
  /** Append colors only — must not remap existing pixel indices. */
  onEnsureColors?: (colors: readonly string[]) => EnsureColorsResult
  onOpenManage?: () => void
}) {
  const colorId = useId()
  const hexId = useId()
  const searchId = useId()
  const nameId = useId()
  const { recent, favorites, remember, toggleFavorite } = usePixelColorMemory()
  const [openTick, setOpenTick] = useState(open)
  const [draft, setDraft] = useState(normalizePixelHex(value) ?? "#20202A")
  const [error, setError] = useState<"hex" | "full" | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [custom, setCustom] = useState<CustomNamedPalette[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [customName, setCustomName] = useState("")
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

  if (open !== openTick) {
    setOpenTick(open)
    if (open) {
      setDraft(normalizePixelHex(value) ?? "#20202A")
      setError(null)
      setQuery("")
      setCategory("all")
      setStatus(null)
      setSaving(false)
      setRenameId(null)
      setPreviewId(null)
      setCustomName(copy.pixelPaletteCustomDefault[lang])
      setCustom(readCustomPalettes())
    }
  }

  useEffect(() => {
    if (!open) return
    setCustom(readCustomPalettes())
  }, [open])

  const documentInks = useMemo(
    () =>
      documentPalette
        .map((hex) => normalizePixelHex(hex))
        .filter((hex): hex is string => Boolean(hex) && hex !== PIXEL_PAPER),
    [documentPalette],
  )

  const usedSlots = Math.max(documentPalette.length, documentInks.length + (documentPalette[0] === PIXEL_PAPER ? 1 : 0))
  const capacityLabel = copy.pixelPaletteCapacity[lang]
    .replace("{used}", String(usedSlots))
    .replace("{max}", String(PIXEL_DOCUMENT_PALETTE_MAX))
  const isFull = usedSlots >= PIXEL_DOCUMENT_PALETTE_MAX
  const fullMessage = copy.pixelPaletteFull[lang].replace("{n}", String(PIXEL_DOCUMENT_PALETTE_MAX))

  const library = useMemo(() => listLibraryPalettes(custom), [custom])
  const filtered = useMemo(
    () => filterLibraryPalettes(library, query, category, lang),
    [library, query, category, lang],
  )

  const categoryOptions = useMemo(() => {
    const counts = new Map<PaletteLibraryCategory, number>()
    for (const palette of library) {
      counts.set(palette.category, (counts.get(palette.category) ?? 0) + 1)
    }
    const options: { id: CategoryFilter; label: string }[] = [
      { id: "all", label: copy.pixelPaletteAll[lang] },
    ]
    for (const id of PALETTE_LIBRARY_CATEGORIES) {
      if (!(counts.get(id) ?? 0)) continue
      options.push({
        id,
        label:
          id === "builtin"
            ? copy.pixelPaletteCatBuiltin[lang]
            : id === "retro"
              ? copy.pixelPaletteCatRetro[lang]
              : id === "nature"
                ? copy.pixelPaletteCatNature[lang]
                : id === "pastel"
                  ? copy.pixelPaletteCatPastel[lang]
                  : copy.pixelPaletteCatMono[lang],
      })
    }
    if (counts.get("custom")) {
      options.push({ id: "custom", label: copy.pixelPaletteCatCustom[lang] })
    }
    return options
  }, [library, lang])

  const previewPalette = previewId
    ? library.find((item) => item.id === previewId)
    : activeId
      ? library.find((item) => item.id === activeId)
      : null

  const isPaletteActive = (palette: LibraryPalette) => {
    if (activeId === palette.id) return true
    if (activeId) return false
    return documentContainsPalette(documentPalette, palette.colors)
  }

  const selectExisting = (hex: string) => {
    const normalized = normalizePixelHex(hex)
    if (!normalized) return
    setDraft(normalized)
    setError(null)
    remember(normalized)
    onSelect(normalized)
  }

  /** Append (if needed) and select — keeps dialog open for multi-edit. */
  const addOrUseColor = (raw: string) => {
    const hex = normalizePixelHex(raw)
    if (!hex) {
      setError("hex")
      return
    }
    if (paletteIndexOf(documentPalette, hex) >= 0) {
      selectExisting(hex)
      return
    }
    if (!onEnsureColors) {
      setError(isFull ? "full" : "hex")
      return
    }
    const result = onEnsureColors([hex])
    if (paletteIndexOf(result.palette, hex) < 0) {
      setError("full")
      setStatus(fullMessage)
      return
    }
    setDraft(hex)
    setError(null)
    setStatus(null)
    remember(hex)
    onSelect(hex)
  }

  const setDraftFromInput = (raw: string) => {
    setDraft(raw.toUpperCase())
    const hex = normalizePixelHex(raw)
    setError(hex ? null : raw.trim() ? "hex" : null)
  }

  const applyLibraryPalette = (palette: LibraryPalette) => {
    const colors = normalizeLibraryColors(palette.colors)
    if (colors.length === 0) return
    if (!onEnsureColors) {
      const first = colors[0]
      if (first) selectExisting(first)
      return
    }
    const result = onEnsureColors(colors)
    setActiveId(palette.id)
    if (result.truncated) {
      setStatus(copy.pixelPaletteAppliedPartial[lang])
      if (isFull || result.added === 0) setError("full")
    } else {
      setError(null)
      setStatus(copy.pixelPaletteApplied[lang])
    }
    const first = colors.find((hex) => paletteIndexOf(result.palette, hex) >= 0) ?? colors[0]
    if (first && paletteIndexOf(result.palette, first) >= 0) {
      remember(first)
      onSelect(first)
      setDraft(first)
    }
  }

  const favorited = paletteIndexOf(favorites, draft) >= 0
  const nativeValue = (normalizePixelHex(draft) ?? "#20202A").toLowerCase()

  const memoryRow = (colors: readonly string[], emptyLabel: string, label: string) => (
    <div className="grid gap-1.5">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      {colors.length === 0 ? (
        <p className="text-[13px] text-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="list">
          {colors.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`${copy.pixelColor[lang]} ${hex}`}
              onClick={() => addOrUseColor(hex)}
              className={cn(
                "pixel-swatch h-10 w-10 border-[3px]",
                normalizePixelHex(draft) === hex ? "border-fg" : "border-earth",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.pixelPaletteBrowse[lang]}
      closeLabel={copy.closeMenu[lang]}
      className="w-[min(calc(100%-1rem),36rem)] max-h-[min(92dvh,44rem)] overflow-hidden"
    >
      <div className="grid max-h-[min(78dvh,36rem)] gap-5 overflow-y-auto overscroll-contain pb-1">
        <p className="text-[12px] text-muted" aria-live="polite">
          <span className="font-medium text-fg">{capacityLabel}</span>
          {" · "}
          {copy.pixelPaletteCapacityHint[lang]}
        </p>

        {/* A — Document palette */}
        <section className="grid gap-2 border-[3px] border-earth bg-bg p-3" aria-label={copy.pixelPaletteDocument[lang]}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-medium text-fg">{copy.pixelPaletteDocument[lang]}</h3>
            <span className="text-[12px] text-muted">
              {copy.pixelPaletteColorCount[lang].replace("{n}", String(documentInks.length))}
            </span>
          </div>
          {documentInks.length === 0 ? (
            <p className="text-[13px] text-muted">{copy.pixelPaletteEmpty[lang]}</p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="listbox">
              {documentInks.map((hex) => {
                const active = normalizePixelHex(value) === hex
                return (
                  <button
                    key={hex}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={hex}
                    title={hex}
                    onClick={() => selectExisting(hex)}
                    className={cn(
                      "pixel-swatch aspect-square w-full min-h-10 border-[3px]",
                      active ? "border-fg ring-2 ring-fg/30" : "border-earth",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              disabled={documentInks.length === 0}
              onClick={() => setSaving((prev) => !prev)}
            >
              {copy.pixelPaletteSaveCustom[lang]}
            </Button>
            {onOpenManage ? (
              <Button type="button" variant="ghost" className="text-[13px]" onClick={onOpenManage}>
                {copy.pixelPaletteManage[lang]}
              </Button>
            ) : null}
          </div>
          {saving ? (
            <div className="grid gap-2 border-t-[3px] border-earth pt-3">
              <label htmlFor={nameId} className="text-[13px] font-medium text-fg">
                {copy.pixelPaletteCustomName[lang]}
              </label>
              <Input
                id={nameId}
                value={customName}
                maxLength={40}
                onChange={(event) => setCustomName(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    const created = saveCustomPalette({
                      name: customName || copy.pixelPaletteCustomDefault[lang],
                      colors: documentInks,
                    })
                    if (!created) return
                    setCustom(readCustomPalettes())
                    setActiveId(created.id)
                    setCategory("custom")
                    setSaving(false)
                    setStatus(copy.pixelPaletteApplied[lang])
                  }}
                >
                  {copy.pixelPaletteSaveCustom[lang]}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSaving(false)}>
                  {copy.createCancel[lang]}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* B — Color editor */}
        <section className="grid gap-3" aria-label={copy.pixelPaletteEditor[lang]}>
          <h3 className="text-[13px] font-medium text-fg">{copy.pixelPaletteEditor[lang]}</h3>
          <label htmlFor={colorId} className="grid gap-1.5">
            <span className="text-[12px] font-medium text-muted">{copy.pixelPickColor[lang]}</span>
            <span className="relative block h-20 w-full border-[3px] border-earth sm:h-24">
              <span className="block h-full w-full" style={{ backgroundColor: nativeValue }} />
              <input
                id={colorId}
                type="color"
                value={nativeValue}
                onChange={(event) => {
                  const hex = normalizePixelHex(event.target.value)
                  if (!hex) return
                  setDraft(hex)
                  setError(null)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </span>
          </label>

          <div className="grid gap-1.5">
            <label htmlFor={hexId} className="text-[12px] font-medium text-muted">
              {copy.pixelHex[lang]}
            </label>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  id={hexId}
                  value={draft}
                  spellCheck={false}
                  autoCapitalize="characters"
                  autoComplete="off"
                  onChange={(event) => setDraftFromInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addOrUseColor(draft)
                    }
                  }}
                  error={
                    error === "hex"
                      ? copy.pixelHexInvalid[lang]
                      : error === "full"
                        ? fullMessage
                        : undefined
                  }
                />
              </div>
              <button
                type="button"
                aria-label={favorited ? copy.pixelFavoriteRemove[lang] : copy.pixelFavoriteAdd[lang]}
                aria-pressed={favorited}
                onClick={() => {
                  const hex = normalizePixelHex(draft)
                  if (!hex) {
                    setError("hex")
                    return
                  }
                  toggleFavorite(hex)
                }}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center border-[3px]",
                  favorited ? "border-fg bg-coin text-[#1e1b4b]" : "border-earth bg-card text-fg",
                )}
              >
                <PixelIcon name="star" />
              </button>
            </div>
          </div>

          {isFull ? (
            <p className="text-[13px] text-brick" role="status">
              {fullMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isFull && paletteIndexOf(documentPalette, draft) < 0} onClick={() => addOrUseColor(draft)}>
              {copy.pixelPaletteAddColor[lang]}
            </Button>
            <Button type="button" variant="outline" onClick={() => selectExisting(draft)}>
              {copy.pixelUseColor[lang]}
            </Button>
          </div>

          {memoryRow(recent, copy.pixelNoRecent[lang], copy.pixelRecent[lang])}
          {memoryRow(favorites, copy.pixelNoFavorites[lang], copy.pixelFavorites[lang])}
          {memoryRow(PIXEL_SWATCHES, "", copy.pixelShortcuts[lang])}
        </section>

        {/* C — Palette library */}
        <details className="border-[3px] border-earth bg-card open:bg-bg" open>
          <summary className="cursor-pointer px-3 py-2.5 text-[13px] font-medium text-fg">
            {copy.pixelPaletteLibrary[lang]}
          </summary>
          <div className="grid gap-3 border-t-[3px] border-earth px-3 py-3">
            {previewPalette ? (
              <div className="border-[3px] border-earth bg-soft p-2.5" aria-live="polite">
                <p className="mb-1 text-[12px] font-medium text-muted">{copy.pixelPalettePreview[lang]}</p>
                <p className="mb-2 text-[13px] font-medium text-fg">
                  {paletteDisplayName(previewPalette, lang)}
                </p>
                <div className="flex h-5 w-full overflow-hidden border-[3px] border-earth">
                  {normalizeLibraryColors(previewPalette.colors).map((hex) => (
                    <span key={hex} className="h-full min-w-0 flex-1" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <label htmlFor={searchId} className="sr-only">
                {copy.pixelPaletteSearch[lang]}
              </label>
              <div className="relative">
                <PixelIcon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted"
                />
                <Input
                  id={searchId}
                  value={query}
                  placeholder={copy.pixelPaletteSearch[lang]}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={category === option.id}
                    onClick={() => setCategory(option.id)}
                    className={cn(
                      "border-[3px] px-2.5 py-1.5 text-[12px] font-medium",
                      category === option.id
                        ? "border-fg bg-soft text-fg"
                        : "border-earth bg-bg text-muted hover:text-fg",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-[13px] text-muted">{copy.pixelPaletteEmptySearch[lang]}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.map((palette) => {
                  const active = isPaletteActive(palette)
                  const colors = normalizeLibraryColors(palette.colors)
                  const name = paletteDisplayName(palette, lang)
                  return (
                    <li key={palette.id}>
                      <div
                        className={cn(
                          "grid gap-2 border-[3px] p-2.5",
                          active ? "border-fg bg-soft" : "border-earth bg-card hover:border-fg",
                        )}
                        onMouseEnter={() => setPreviewId(palette.id)}
                        onMouseLeave={() => setPreviewId(null)}
                        onFocusCapture={() => setPreviewId(palette.id)}
                      >
                        <button
                          type="button"
                          className="grid w-full gap-2 text-left"
                          onClick={() => applyLibraryPalette(palette)}
                          aria-pressed={active}
                          aria-label={`${name}. ${copy.pixelPaletteApply[lang]}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 truncate text-[13px] font-medium text-fg">{name}</span>
                            {active ? (
                              <span className="shrink-0 border-[2px] border-fg bg-coin px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#1e1b4b]">
                                {copy.pixelPaletteActive[lang]}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex h-8 w-full overflow-hidden border-[3px] border-earth">
                            {colors.map((hex) => (
                              <span
                                key={`${palette.id}-${hex}`}
                                className="h-full min-w-0 flex-1"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                          <span className="text-[12px] text-muted">
                            {copy.pixelPaletteColorCount[lang].replace("{n}", String(colors.length))}
                            {" · "}
                            {copy.pixelPaletteApply[lang]}
                          </span>
                        </button>
                        {palette.category === "custom" ? (
                          <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                            {renameId === palette.id ? (
                              <div className="flex w-full flex-wrap items-center gap-1.5">
                                <Input
                                  value={renameDraft}
                                  maxLength={40}
                                  aria-label={copy.pixelPaletteCustomName[lang]}
                                  onChange={(event) => setRenameDraft(event.target.value)}
                                  className="min-w-0 flex-1"
                                />
                                <Button
                                  type="button"
                                  onClick={() => {
                                    saveCustomPalette({
                                      id: palette.id,
                                      name: renameDraft || palette.name,
                                      colors: palette.colors,
                                    })
                                    setCustom(readCustomPalettes())
                                    setRenameId(null)
                                  }}
                                >
                                  {copy.pixelPaletteEdit[lang]}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center border-[3px] border-earth bg-bg px-2 text-[12px] font-medium text-fg"
                                  onClick={() => {
                                    setRenameId(palette.id)
                                    setRenameDraft(palette.name)
                                  }}
                                >
                                  {copy.pixelPaletteEdit[lang]}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center border-[3px] border-earth bg-bg px-2 text-[12px] font-medium text-fg"
                                  onClick={() => {
                                    const created = duplicateCustomPalette(
                                      palette.id,
                                      copy.pixelPaletteCopySuffix[lang],
                                    )
                                    if (created) {
                                      setCustom(readCustomPalettes())
                                      setActiveId(created.id)
                                    }
                                  }}
                                >
                                  {copy.pixelPaletteDuplicate[lang]}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center border-[3px] border-earth bg-bg px-2 text-[12px] font-medium text-brick"
                                  onClick={() => {
                                    deleteCustomPalette(palette.id)
                                    setCustom(readCustomPalettes())
                                    if (activeId === palette.id) setActiveId(null)
                                  }}
                                >
                                  {copy.pixelPaletteDelete[lang]}
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {status ? (
              <p className="text-[13px] text-muted" role="status">
                {status}
              </p>
            ) : null}
          </div>
        </details>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.closeMenu[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
